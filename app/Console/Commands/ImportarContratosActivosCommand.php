<?php

namespace App\Console\Commands;

use App\Models\CentroCostoCatalogo;
use App\Models\Contrato;
use App\Models\Empleador;
use App\Models\Sede;
use App\Models\User;
use App\Services\EmpresaProyectoRules;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Importa contratos activos reales exportados del sistema anterior (extraction-_3_.csv:
 * un contrato por "codcontratoemp", repetido una fila por cada línea de auxilio/anexo).
 * No genera pedidos automáticos de dotación ni notifica a SharePoint — son datos históricos
 * de empleados ya activos, no altas nuevas.
 */
class ImportarContratosActivosCommand extends Command
{
    protected $signature = 'contratos:importar-activos {csv=database/seeders/data/extraction-_3_.csv} {--dry-run : Ejecuta todo dentro de una transacción que siempre se revierte, sin persistir nada}';

    protected $description = 'Importa contratos activos reales desde un CSV exportado del sistema anterior';

    private const TIPO_CONTRATO_MAP = [
        'termino fijo' => 'Término Fijo',
        'fijo' => 'Término Fijo',
        'termino indefinido' => 'Término Indefinido',
        'indefinido' => 'Término Indefinido',
        'obra o labor' => 'Obra o Labor',
        'de obra labor' => 'Obra o Labor',
        'obra' => 'Obra o Labor',
        'labor' => 'Obra o Labor',
        'prestacion de servicios' => 'Prestación de Servicios',
        'prestacion' => 'Prestación de Servicios',
        'servicios' => 'Prestación de Servicios',
        'aprendizaje' => 'Aprendizaje',
        'aprendiz sena' => 'Aprendizaje',
        'ocasional' => 'Ocasional',
    ];

    private const ESTADO_MAP = [
        'activo' => 'Activo',
        'vigente' => 'Activo',
        'inactivo' => 'Inactivo',
        'no vigente' => 'Inactivo',
        'cancelado' => 'Cancelado',
        'traslado' => 'Translado',
        'transladado' => 'Translado',
    ];

    // CSV trae "DIRECTV COL"; el resto de la app (EmpresaProyectoRules, DotacionAutoPedidoService)
    // usa "DIRECTV CO" como nombre canónico del proyecto.
    private const CLIENTE_PROYECTO_MAP = [
        'DIRECTV COL' => 'DIRECTV CO',
    ];

    private const EMPLEADOR_MAP = [
        'JOB&TALENT' => 'JOB AND TALENT',
    ];

    public function handle(): int
    {
        $path = base_path($this->argument('csv'));
        if (!file_exists($path)) {
            $this->error("No se encontró el archivo: {$path}");
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $grupos = $this->leerYAgruparCsv($path);
        $this->line(count($grupos) . ' contratos únicos en el CSV. Modo: ' . ($dryRun ? 'DRY RUN (no se persiste nada)' : 'REAL'));

        $reporte = [
            'contratos_creados' => 0,
            'contratos_omitidos' => [],
            'usuarios_creados' => 0,
            'usuarios_actualizados' => 0,
            'correos_corregidos' => [],
            'sedes_vacias' => [],
            'sedes_sin_catalogo' => [],
            'centros_costo_no_encontrados' => [],
            'empresas_no_encontradas' => [],
            'jefes_resueltos' => 0,
            'jefes_no_resueltos' => [],
            'jefes_a_promover' => [], // user_id => nombre
            'empresa_proyecto_invalido' => [],
            'errores' => [],
        ];

        $work = function () use ($grupos, &$reporte) {
            $emailsEnUso = collect(User::pluck('email'))->mapWithKeys(fn ($e) => [mb_strtolower($e) => true])->all();

            // Pase 1: asegurar que exista el usuario (empleado) de cada contrato antes de
            // resolver jefes inmediatos, porque un jefe puede aparecer más adelante en el CSV.
            $userIdPorCodigo = [];
            foreach ($grupos as $codigo => $filas) {
                try {
                    $user = $this->resolverOCrearUsuario($filas[0], $reporte, $emailsEnUso);
                    $userIdPorCodigo[$codigo] = $user->id;
                } catch (\Throwable $e) {
                    $reporte['errores'][] = "{$codigo} (usuario): " . $e->getMessage();
                }
            }

            $usuariosPorNombre = $this->construirIndiceNombres();

            // Pase 2: crear los contratos (y sus centros de costo / anexos), ya con todos los
            // empleados existentes para poder resolver "jefe inmediato" contra `users`.
            foreach ($grupos as $codigo => $filas) {
                if (!isset($userIdPorCodigo[$codigo])) {
                    continue; // el usuario falló en el pase 1, ya quedó en reporte['errores']
                }

                if (Contrato::where('id_macaw', $codigo)->exists()) {
                    $reporte['contratos_omitidos'][] = $codigo;
                    continue;
                }

                try {
                    DB::transaction(function () use ($codigo, $filas, $userIdPorCodigo, $usuariosPorNombre, &$reporte) {
                        $this->crearContrato($codigo, $filas, $userIdPorCodigo[$codigo], $usuariosPorNombre, $reporte);
                    });
                    $reporte['contratos_creados']++;
                } catch (\Throwable $e) {
                    $reporte['errores'][] = "{$codigo} (contrato): " . $e->getMessage();
                }
            }

            // Pase 3: promover a admin a todo usuario que resultó ser jefe inmediato de alguien.
            foreach ($reporte['jefes_a_promover'] as $userId => $nombre) {
                $user = User::find($userId);
                if ($user && $user->rol !== 'admin') {
                    $user->rol = 'admin';
                    $user->save();
                }
            }
        };

        if ($dryRun) {
            DB::beginTransaction();
            try {
                $work();
            } finally {
                DB::rollBack();
            }
        } else {
            DB::transaction($work);
        }

        $this->imprimirReporte($reporte, $dryRun);

        return self::SUCCESS;
    }

    /**
     * @return array<string, array<int, array<string, string>>> codcontratoemp => filas (header en minúsculas)
     */
    private function leerYAgruparCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        $header = array_map('strtolower', fgetcsv($handle));
        $grupos = [];
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) < count($header)) {
                continue;
            }
            $fila = array_combine($header, $row);
            $codigo = trim($fila['codcontratoemp'] ?? '');
            if ($codigo === '') {
                continue;
            }
            $grupos[$codigo][] = $fila;
        }
        fclose($handle);

        return $grupos;
    }

    private function resolverOCrearUsuario(array $fila, array &$reporte, array &$emailsEnUso): User
    {
        $cedula = trim($fila['cedemp']);
        $user = User::where('cedula', $cedula)->first();

        $nombres = trim($fila['nomemp']);
        $apellidos = trim($fila['apeemp']);
        $email = trim($fila['emaemp']);
        $cargo = trim($fila['cargo']) ?: null;
        $sede = trim($fila['sede']) ?: null;
        $empleador = $this->normalizarEmpleador($fila['empleador'] ?? '');
        $eps = trim($fila['nomeps'] ?? '') ?: null;
        $arl = trim($fila['nomarl'] ?? '') ?: null;
        $fondoPensiones = trim($fila['nomfondo'] ?? '') ?: null;
        $cajaCompensacion = trim($fila['nomcajacom'] ?? '') ?: null;
        $tipoVinculacion = trim($fila['tipovinculacion'] ?? '') ?: null;
        $empresaId = $this->resolverEmpresaId($fila['empresa'] ?? '', $reporte);

        if ($user) {
            $cambios = false;
            foreach ([
                'cargo' => $cargo,
                'sede' => $sede,
                'empleador' => $empleador,
                'eps' => $eps,
                'arl' => $arl,
                'fondo_pensiones' => $fondoPensiones,
                'caja_compensacion' => $cajaCompensacion,
                'tipo_vinculacion' => $tipoVinculacion,
            ] as $campo => $valor) {
                if ($valor && !$user->{$campo}) {
                    $user->{$campo} = $valor;
                    $cambios = true;
                }
            }
            if ($empresaId && !$user->empresa_id) {
                $user->empresa_id = $empresaId;
                $cambios = true;
            }
            if ($cambios) {
                $user->save();
                $reporte['usuarios_actualizados']++;
            }

            return $user;
        }

        $emailFinal = $email;
        if ($emailFinal && isset($emailsEnUso[mb_strtolower($emailFinal)])) {
            [$local, $dominio] = array_pad(explode('@', $emailFinal, 2), 2, '');
            $original = $emailFinal;
            $emailFinal = $dominio ? "{$local}+{$cedula}@{$dominio}" : "{$cedula}@avanzaconoce.com";
            $reporte['correos_corregidos'][] = "{$cedula} ({$nombres} {$apellidos}): {$original} -> {$emailFinal} (correo ya usado por otra persona)";
        }
        if (!$emailFinal) {
            $emailFinal = "{$cedula}@avanzaconoce.com";
        }

        $user = User::create([
            'cedula' => $cedula,
            'nombres' => mb_strtoupper($nombres, 'UTF-8'),
            'apellidos' => mb_strtoupper($apellidos, 'UTF-8'),
            'name' => mb_strtoupper(trim("{$nombres} {$apellidos}"), 'UTF-8'),
            'email' => $emailFinal,
            'password' => $cedula,
            'genero' => 'No especificado',
            'estado_empleado' => 'Activo',
            'sede' => $sede,
            'cargo' => $cargo,
            'tipo_vinculacion' => $tipoVinculacion,
            'empleador' => $empleador,
            'empresa_id' => $empresaId,
            'eps' => $eps,
            'arl' => $arl,
            'fondo_pensiones' => $fondoPensiones,
            'caja_compensacion' => $cajaCompensacion,
            'rol' => 'consultor',
            'activo' => true,
            // El usuario aún no fue dado de alta manualmente en el módulo Empleados (ahí es
            // donde se generan sus credenciales reales) — no debe listarse como empleado todavía.
            'pendiente_alta' => true,
        ]);
        $emailsEnUso[mb_strtolower($emailFinal)] = true;
        $reporte['usuarios_creados']++;

        return $user;
    }

    /**
     * @return Collection<string, User> nombre normalizado => usuario
     */
    private function construirIndiceNombres(): Collection
    {
        $indice = collect();
        User::select('id', 'nombres', 'apellidos', 'name', 'email', 'rol')->chunk(200, function ($usuarios) use ($indice) {
            foreach ($usuarios as $u) {
                if ($u->nombres && $u->apellidos) {
                    $indice->put($this->normalizarClave($u->nombres . ' ' . $u->apellidos), $u);
                }
                if ($u->name && !$indice->has($this->normalizarClave($u->name))) {
                    $indice->put($this->normalizarClave($u->name), $u);
                }
            }
        });

        return $indice;
    }

    private function crearContrato(string $codigo, array $filas, int $empleadoId, Collection $usuariosPorNombre, array &$reporte): void
    {
        $primera = $filas[0];

        $sedeValor = trim($primera['sede'] ?? '');
        if ($sedeValor === '') {
            $reporte['sedes_vacias'][] = $codigo;
        } elseif (!Sede::where('nombre', $sedeValor)->exists()) {
            $reporte['sedes_sin_catalogo'][] = "{$codigo}: \"{$sedeValor}\"";
        }

        [$jefeNombre, $jefeCorreo, $jefeUserId] = $this->resolverJefe($primera['jefeinmediato'] ?? '', $usuariosPorNombre, $reporte);
        $jefeLegacy = $jefeNombre ? ($jefeCorreo ? "{$jefeNombre} - {$jefeCorreo}" : $jefeNombre) : null;

        $empresa = trim($primera['empresa'] ?? '') ?: null;
        $clienteProyecto = $this->normalizarClienteProyecto($primera['clienteproyecto'] ?? '');
        $errorRegla = EmpresaProyectoRules::validar($empresa, $clienteProyecto);
        if ($errorRegla) {
            $reporte['empresa_proyecto_invalido'][] = "{$codigo}: {$errorRegla}";
        }

        $contrato = Contrato::create([
            'id_macaw' => (int) $codigo,
            'empleado_id' => $empleadoId,
            'tipo_contrato' => $this->normalizarTipoContrato($primera['tipodecontrato'] ?? ''),
            'tipo_vinculacion' => trim($primera['tipovinculacion'] ?? '') ?: null,
            'cargo' => trim($primera['cargo'] ?? '') ?: null,
            'sede' => $sedeValor ?: null,
            'area_empresa' => trim($primera['areaempresa'] ?? '') ?: null,
            'jefe_inmediato' => $jefeLegacy,
            'jefe_inmediato_nombre' => $jefeNombre,
            'jefe_inmediato_correo' => $jefeCorreo,
            'fecha_ingreso' => $this->fechaOn($primera['fechaingreso'] ?? null),
            'fecha_retiro' => $this->fechaOn($primera['fecharetiro'] ?? null),
            'salario' => $this->parseNumerico($primera['salario'] ?? 0),
            'auxilio_transporte_legal' => $this->parseNumerico($primera['auxiliotransporte'] ?? 0),
            'arl' => trim($primera['nomarl'] ?? '') ?: null,
            'fecha_vinculacion_arl' => $this->fechaOn($primera['fecarl'] ?? null),
            'lps_afiliado' => trim($primera['nomeps'] ?? '') ?: null,
            'fecha_vinculacion_lps' => $this->fechaOn($primera['feceps'] ?? null),
            'caja_compensacion' => trim($primera['nomcajacom'] ?? '') ?: null,
            'fecha_vinculacion_caja' => $this->fechaOn($primera['feccajacom'] ?? null),
            'fondo_pensiones' => trim($primera['nomfondo'] ?? '') ?: null,
            'fondo_cesantias' => trim($primera['fondocesantias'] ?? '') ?: null,
            'estado_contrato' => $this->normalizarEstado($primera['estadocontrato'] ?? ''),
            'completado' => true,
            'empleador' => $this->normalizarEmpleador($primera['empleador'] ?? ''),
            'empresa' => $empresa,
            'cliente_proyecto' => $clienteProyecto,
            'regional_id' => null,
        ]);

        if ($jefeUserId && $jefeNombre) {
            $reporte['jefes_a_promover'][$jefeUserId] = $jefeNombre;
        }

        foreach ($this->resolverCentrosCosto($primera['centrodecosto'] ?? '', $reporte, $codigo) as $cc) {
            $contrato->centrosCostos()->create($cc);
        }

        foreach ($this->construirAnexos($filas) as $anexo) {
            $contrato->anexos()->create($anexo);
        }
    }

    private function resolverJefe(string $jefeRaw, Collection $usuariosPorNombre, array &$reporte): array
    {
        $jefeRaw = trim($jefeRaw);
        if ($jefeRaw === '') {
            return [null, null, null];
        }

        $user = $usuariosPorNombre->get($this->normalizarClave($jefeRaw));
        if ($user) {
            $reporte['jefes_resueltos']++;
            return [$jefeRaw, $user->email, $user->id];
        }

        $reporte['jefes_no_resueltos'][$jefeRaw] = true;

        return [$jefeRaw, null, null];
    }

    private function resolverCentrosCosto(string $raw, array &$reporte, string $codigoContrato): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return [];
        }

        $resueltos = [];
        foreach (explode(',', $raw) as $parte) {
            if (!preg_match('/^\s*([A-Za-z0-9]+)\s*-\s*([\d.]+)\s*%?\s*$/', $parte, $m)) {
                continue;
            }
            $codigo = $m[1];
            $catalogo = CentroCostoCatalogo::where('codigo', $codigo)->where('activo', true)->first();
            if (!$catalogo) {
                $reporte['centros_costo_no_encontrados'][] = "{$codigoContrato}: código {$codigo}";
                continue;
            }
            $resueltos[] = [
                'centro_costo_catalogo_id' => $catalogo->id,
                'codigo' => $catalogo->codigo,
                'centro_costos' => $catalogo->nombre,
                'porcentaje' => (float) $m[2],
            ];
        }

        return $resueltos;
    }

    private function construirAnexos(array $filas): array
    {
        $anexos = [];
        foreach ($filas as $fila) {
            $tipo = trim($fila['auxilio'] ?? '');
            if ($tipo === '') {
                continue;
            }
            $anexos[] = [
                'anexo_auxilio' => $tipo,
                'valor' => $this->parseNumerico($fila['valor_auxilio'] ?? 0),
                'fecha_entrega_firma' => $this->fechaOn($fila['fecha_auxilio'] ?? null),
            ];
        }

        return $anexos;
    }

    /**
     * Resuelve el id de `empresas` para el usuario (users.empresa_id), a partir del mismo
     * texto "empresa" que EmpresaProyectoRules usa para validar el contrato. Así el select
     * "Empresa" del módulo Empleados queda poblado igual que el contrato, en vez de quedar
     * vacío como pasaba antes (el import solo tocaba `contratos.empresa`, nunca `users.empresa_id`).
     */
    private function resolverEmpresaId(string $raw, array &$reporte): ?int
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        $id = \App\Models\Empresa::whereRaw('UPPER(nombre) = ?', [mb_strtoupper($raw, 'UTF-8')])->value('id');
        if (!$id) {
            $reporte['empresas_no_encontradas'][$raw] = true;
        }

        return $id;
    }

    private function normalizarEmpleador(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        $raw = self::EMPLEADOR_MAP[mb_strtoupper($raw, 'UTF-8')] ?? $raw;

        return Empleador::whereRaw('UPPER(nombre) = ?', [mb_strtoupper($raw, 'UTF-8')])->value('nombre') ?? $raw;
    }

    private function normalizarTipoContrato(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        return self::TIPO_CONTRATO_MAP[$this->comparable($raw)] ?? $raw;
    }

    private function normalizarEstado(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return 'Activo';
        }

        return self::ESTADO_MAP[$this->comparable($raw)] ?? $raw;
    }

    private function normalizarClienteProyecto(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        return self::CLIENTE_PROYECTO_MAP[mb_strtoupper($raw, 'UTF-8')] ?? $raw;
    }

    private function parseNumerico($valor): float
    {
        if ($valor === null || $valor === '') {
            return 0.0;
        }
        $texto = preg_replace('/[^0-9.\-]/', '', (string) $valor);

        return $texto === '' ? 0.0 : (float) $texto;
    }

    private function fechaOn(?string $valor): ?string
    {
        $valor = trim((string) $valor);

        return ($valor !== '' && $valor !== '0000-00-00') ? $valor : null;
    }

    private function normalizarClave(string $s): string
    {
        $s = mb_strtoupper(trim(preg_replace('/\s+/', ' ', $s)), 'UTF-8');

        return strtr($s, ['Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ñ' => 'N']);
    }

    private function comparable(string $s): string
    {
        $s = mb_strtolower(trim(preg_replace('/\s+/', ' ', $s)), 'UTF-8');

        return strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n']);
    }

    private function imprimirReporte(array $reporte, bool $dryRun): void
    {
        $this->newLine();
        $this->info('=== Resumen ' . ($dryRun ? '(DRY RUN, nada se guardó) ' : '') . '===');
        $this->line("Contratos creados: {$reporte['contratos_creados']}");
        $this->line('Contratos omitidos (ya existían por id_macaw): ' . count($reporte['contratos_omitidos']));
        $this->line("Usuarios creados: {$reporte['usuarios_creados']}");
        $this->line("Usuarios actualizados (campos vacíos completados): {$reporte['usuarios_actualizados']}");
        $this->line("Jefes inmediatos resueltos: {$reporte['jefes_resueltos']}");
        $this->line('Jefes inmediatos NO resueltos (sin usuario con ese nombre): ' . count($reporte['jefes_no_resueltos']));
        $this->line('Usuarios promovidos a rol admin (por ser jefe inmediato de alguien): ' . count($reporte['jefes_a_promover']));

        $this->imprimirLista('Correos duplicados corregidos', $reporte['correos_corregidos']);
        $this->imprimirLista('Contratos con sede vacía en el CSV', $reporte['sedes_vacias']);
        $this->imprimirLista('Contratos con sede que no existe en el catálogo', $reporte['sedes_sin_catalogo']);
        $this->imprimirLista('Códigos de centro de costo no encontrados en el catálogo', $reporte['centros_costo_no_encontrados']);
        $this->imprimirLista('Empresas sin coincidencia en el catálogo (users.empresa_id quedó vacío)', array_keys($reporte['empresas_no_encontradas']));
        $this->imprimirLista('Jefes inmediatos sin usuario coincidente', array_keys($reporte['jefes_no_resueltos']));
        $this->imprimirLista('Combinaciones empresa+proyecto que violan EmpresaProyectoRules', $reporte['empresa_proyecto_invalido']);

        $promovidos = [];
        foreach ($reporte['jefes_a_promover'] as $id => $nombre) {
            $promovidos[] = "{$nombre} (user_id {$id})";
        }
        $this->imprimirLista('Usuarios promovidos a admin', $promovidos);
        $this->imprimirLista('Errores (contrato u usuario omitido por excepción)', $reporte['errores']);
    }

    private function imprimirLista(string $titulo, array $items): void
    {
        if (empty($items)) {
            return;
        }
        $this->newLine();
        $this->warn("{$titulo} (" . count($items) . '):');
        foreach ($items as $item) {
            $this->line("  - {$item}");
        }
    }
}
