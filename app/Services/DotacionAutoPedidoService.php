<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\RespuestaIngreso;
use App\Models\Sede;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DotacionAutoPedidoService
{
    // Proyecto del contrato => proyecto del inventario: ver PedidoAutomatico::PROYECTO_A_INVENTARIO.

    // El kit administrativo (SYM ADMINISTRATIVO) no tiene dotación repartida por sede: en
    // proyecto_sede solo está vinculado a las sedes de Pereira (así viene de
    // sedes_activas.csv, porque Administración es un área centralizada en el HQ). Por eso
    // sus líneas siempre se descuentan de esta sede fija, sin importar dónde esté la sede
    // del contrato del empleado.
    private const SEDE_CENTRAL_ADMINISTRATIVA = 'SYM PEREIRA';

    // Cargos DIRECTV cuya labor es instalación en campo (coincidencia exacta, ya sin tildes:
    // "TECNICO" como substring atrapa cargos de oficina/calidad que no llevan este kit).
    private const DIRECTV_TECNICOS_INSTALADORES = [
        'TECNICO DE INSTALACIONES',
        'TECNICO DE INSTALACIONES (AUX)',
        'TECNICO AUXILIAR EN CAMPO',
        'AUXILIAR TECNICO EN ALTURAS',
        'TECNICO SENIOR',
        'AUXILIAR TECNICO',
    ];

    /** Bodega de dotación de cada proyecto (ver bodegaDe). */
    private const BODEGAS = [
        'DIRECTV'            => 'SERVIMERCADEO PEREIRA',
        'SYM TIGO EXPRESS'   => 'TIGO EXPRESS PEREIRA',
        'SYM TIGO HOME'      => 'TIGO HOME PEREIRA',
        'SYM ADMINISTRATIVO' => self::SEDE_CENTRAL_ADMINISTRATIVA,
    ];

    /**
     * Otros nombres con que está cargada cada prenda del kit (la clave ya normalizada: ver
     * esLaPrenda). Son los de producción, con sus errores de escritura tal cual: si allá se
     * corrige o se cambia un nombre, se agrega aquí.
     */
    private const NOMBRES_EN_INVENTARIO = [
        'POLO GRIS ADMINISTRATIVA'        => ['CAMISA COMERCIAL HOMBRE', 'CAMISA COMERCIAL DAMA'],
        'PANTALON COMERCIAL'              => ['PANTALON COMERCIAL HOMBRE', 'PANTALON COMERCIAL DAMA'],
        'POLO INSTALADOR AZUL OSCURO M/C' => ['POLO INSTALADOR MC'],
        'POLO INSTALADOR AZUL OSCURO M/L' => ['POLO INSTALADOR ML'],
        'PANTALON DE DRIL TECNICOS'       => ['PANTALON INSTALADOR', 'PANTALON INSTLADOR'],
        'BOTAS INSTALADOR'                => ['BOTAS TECNICO INSTALADOR', 'BOTAS TECNICO ISNTALADOR'],
        'REATA AZUL OSCURO'               => ['RIATAS INSTALADOR', 'RIATA INSTALADOR'],
        'GORRA'                           => ['GORRAS DIRECTV', 'GORRA DIRECTV'],
    ];

    /** @var array<string, int|null> bodega ya resuelta por proyecto */
    private array $bodegas = [];

    /** En estos proyectos todos los cargos reciben el kit de técnico. */
    private const PROYECTOS_CON_KIT_TECNICO = ['HUGHES COL', 'HUGHES ECU', 'FT&H'];

    /** Solo un contrato vigente da dotación: uno ya finalizado (histórico) no. */
    public const ESTADOS_CON_DOTACION = ['Vigente', 'Activo'];

    /**
     * Por qué no se generó el pedido (para mostrarlo al crear el contrato), o null si se
     * generó. Si se generó pero faltaron prendas, quedan en $faltantes.
     */
    public ?string $motivoSinPedido = null;

    /** @var string[] prendas que no se pudieron asignar (sin talla, sin existencia o sin stock) */
    public array $faltantes = [];

    /** @var string[] prendas del kit que aún no se sabe cuáles son (sin género, talla o sede) */
    private array $sinDefinir = [];

    /**
     * Genera (si aplica) el pedido automático de dotación para un contrato recién creado,
     * según el proyecto/cargo del empleado. Se crea en estado "Activo" y descuenta el
     * inventario de inmediato (igual que un pedido manual activo); si luego se cancela o
     * se elimina, el inventario se restaura automáticamente (mismo flujo que cualquier
     * pedido Activo, ver PedidoAutomaticoController::update/destroy).
     *
     * Solo para un ingreso: contrato vigente, con formulario de ingreso (de ahí salen las
     * tallas) y sin otro contrato antes; una persona con un segundo contrato no recibe otro
     * kit, si lo necesita se le crea a mano. Devuelve null (con el motivo en $motivoSinPedido)
     * si no aplica o si no se pudo asignar ninguna prenda: no se crean pedidos vacíos.
     */
    public function generarPedidoParaContrato(Contrato $contrato): ?PedidoAutomatico
    {
        $this->motivoSinPedido = null;
        $this->faltantes = [];
        $this->sinDefinir = [];

        if (!in_array($contrato->estado_contrato, self::ESTADOS_CON_DOTACION, true)) {
            return $this->sinPedido("el contrato está como \"{$contrato->estado_contrato}\".");
        }

        $empleado = User::find($contrato->empleado_id);
        if (!$empleado) {
            return $this->sinPedido('el contrato no tiene empleado.');
        }
        if (!$empleado->cedula || !RespuestaIngreso::where('documento', $empleado->cedula)->exists()) {
            return $this->sinPedido('el empleado no tiene formulario de ingreso.');
        }
        $yaTuvoContrato = Contrato::where('empleado_id', $empleado->id)
            ->whereKeyNot($contrato->id)
            ->where('completado', true)
            ->where('estado_contrato', '!=', 'No ingreso')
            ->exists();
        if ($yaTuvoContrato) {
            return $this->sinPedido('el empleado ya tuvo otro contrato. Si necesita dotación, créala manualmente en Pedidos automáticos.');
        }

        return DB::transaction(function () use ($contrato, $empleado) {
            // Primero las prendas que sí se pueden asignar; sin ninguna no se crea el pedido.
            $asignables = $this->prendasAsignables($contrato, $empleado);
            if (!$asignables) {
                return null;
            }

            $pedido = PedidoAutomatico::create([
                'codigo'       => PedidoAutomatico::generarCodigo(),
                'contrato_id'  => $contrato->id,
                'empleado_id'  => $contrato->empleado_id,
                'estado'       => 'Activo',
                'fecha_pedido' => now()->toDateString(),
                // La bodega de la que sale el kit (la de su primera prenda).
                'sede_id'      => $asignables[0][0]->sede_id,
                'notas'        => PedidoAutomatico::NOTA_AUTOMATICO . ' al crear el contrato.' . $this->notaFaltantes(),
                'prendas_sin_definir' => $this->sinDefinir ?: null,
            ]);
            $this->agregarPrendas($pedido, $asignables, true);

            return $pedido;
        });
    }

    /**
     * Llegó el género o una talla del empleado (el contrato se crea antes de completar su ficha):
     * sus pedidos aún sin entregar reciben las prendas que quedaron sin definir.
     */
    public function completarPedidosDe(User $empleado): void
    {
        $pedidos = PedidoAutomatico::with(['contrato', 'pedidoGlobal'])
            ->where('empleado_id', $empleado->id)
            ->whereNotNull('prendas_sin_definir')
            ->whereIn('estado', ['Pendiente', 'Activo', 'Completado', PedidoAutomatico::ENVIAR_A_COMPRAS])
            ->get()
            // Completado solo sigue sin entregar si está en un pedido global aún sin entrega.
            ->reject(fn ($p) => !$p->contrato || ($p->estado === 'Completado' && (!$p->pedidoGlobal || $p->pedidoGlobal->entrega_confirmada)));

        foreach ($pedidos as $pedido) {
            DB::transaction(function () use ($pedido, $empleado) {
                $this->faltantes = [];
                $this->sinDefinir = [];

                $asignables = $this->prendasAsignables($pedido->contrato, $empleado, $pedido->prendas_sin_definir);
                if (!$asignables) {
                    return;
                }

                $this->agregarPrendas($pedido, $asignables, PedidoAutomatico::descuentaStock($pedido->estado));
                $pedido->update([
                    'notas' => explode(' Pendiente: ', (string) $pedido->notas)[0] . ' Completado con los datos del empleado.' . $this->notaFaltantes(),
                    'prendas_sin_definir' => $this->sinDefinir ?: null,
                ]);
            });
        }
    }

    /**
     * El proyecto del contrato cambió: el pedido automático que aún no se entrega se rehace con
     * la dotación del proyecto nuevo (las prendas anteriores vuelven al inventario). Uno ya
     * entregado o en compras no se toca. Llamar dentro de la transacción del contrato.
     *
     * @return string|null aviso de lo que pasó con el pedido, o null si no tenía
     */
    public function actualizarPorCambioDeProyecto(Contrato $contrato): ?string
    {
        $this->motivoSinPedido = null;
        $this->faltantes = [];

        $pedidos = PedidoAutomatico::where('contrato_id', $contrato->id)
            ->where('notas', 'like', PedidoAutomatico::NOTA_AUTOMATICO . '%')
            ->lockForUpdate()
            ->get();
        $empleado = User::find($contrato->empleado_id);
        $avisos = [];

        foreach ($pedidos as $pedido) {
            if (!in_array($pedido->estado, ['Activo', 'Pendiente'], true)) {
                $avisos[] = "El pedido {$pedido->codigo} está en \"{$pedido->estado}\": no se cambió, ajústalo manualmente si hace falta.";
                continue;
            }

            $descuenta = PedidoAutomatico::descuentaStock($pedido->estado);
            if ($descuenta) {
                $pedido->restaurarInventario();
            }
            $pedido->items()->delete();

            $this->faltantes = [];
            $this->sinDefinir = [];
            $asignables = $empleado ? $this->prendasAsignables($contrato, $empleado) : [];
            if (!$asignables) {
                $pedido->delete();
                $avisos[] = "El pedido {$pedido->codigo} se eliminó y sus prendas volvieron al inventario. " . $this->motivoSinPedido;
                continue;
            }

            $this->agregarPrendas($pedido, $asignables, $descuenta);
            $pedido->update([
                'sede_id' => $asignables[0][0]->sede_id,
                'notas' => PedidoAutomatico::NOTA_AUTOMATICO . ' y actualizado al cambiar el proyecto del contrato.' . $this->notaFaltantes(),
                'prendas_sin_definir' => $this->sinDefinir ?: null,
            ]);
            $avisos[] = "El pedido {$pedido->codigo} se actualizó con la dotación de {$contrato->cliente_proyecto}."
                . $this->notaFaltantes();
        }

        return $avisos ? implode(' ', $avisos) : null;
    }

    /**
     * Prendas del kit que hay en inventario, como [InventarioDotacion, cantidad]. Vacío (con el
     * motivo en $motivoSinPedido) si no hay ninguna; las que faltan quedan en $faltantes.
     * Bloquea las filas de inventario: llamar dentro de una transacción. Con $solo, únicamente
     * esas prendas del kit.
     */
    private function prendasAsignables(Contrato $contrato, User $empleado, ?array $solo = null): array
    {
        $this->completarTallasDesdeRespuestaIngreso($empleado);

        $proyecto = PedidoAutomatico::proyectoInventarioDe($contrato->cliente_proyecto) ?? 'SYM ADMINISTRATIVO';
        // Sin tildes: el catálogo de cargos trae "TÉCNICO DE INSTALACIONES" y "...LOGÍSTICA".
        $cargo    = Str::ascii(mb_strtoupper(trim($contrato->cargo ?? ''), 'UTF-8'));
        // Sin género (o uno sin prendas propias) no se asume ninguno: ver buscarItem.
        $generoEmpleado = mb_convert_case(trim((string) $empleado->genero), MB_CASE_TITLE, 'UTF-8');
        $genero   = in_array($generoEmpleado, ['Masculino', 'Femenino'], true) ? $generoEmpleado : null;

        $kitTecnico = in_array(EmpresaProyectoRules::nombreActual($contrato->cliente_proyecto), self::PROYECTOS_CON_KIT_TECNICO, true);
        $reglas = $kitTecnico
            ? $this->kitTecnicoInstalador($empleado)
            : $this->resolverReglas($proyecto, $cargo, $genero, $empleado);

        if (empty($reglas)) {
            $this->sinPedido("el cargo \"{$contrato->cargo}\" del proyecto \"{$contrato->cliente_proyecto}\" no tiene dotación definida.");
            return [];
        }

        $sedeContrato = $contrato->sede_id ?: ($contrato->sede ? Sede::where('nombre', $contrato->sede)->value('id') : null);

        $asignables = [];
        foreach ($reglas as $regla) {
            [$proyectosPrenda, $prenda, $generoPrenda, $talla, $cantidad] = $regla;
            $opcional = $regla[5] ?? false;
            if ($solo !== null && !collect($solo)->contains(fn ($s) => self::esLaPrenda($prenda, $s))) {
                continue;
            }

            $inv = $this->buscarItem((array) $proyectosPrenda, $sedeContrato, $prenda, $generoPrenda, $talla, $cantidad, $opcional);
            if ($inv) {
                $asignables[] = [$inv, $cantidad, max(0, $cantidad - $inv->cantidad)];
            }
        }

        if (!$asignables) {
            $this->sinPedido('no se pudo asignar ninguna prenda: ' . implode('; ', $this->faltantes) . '.');
        }

        return $asignables;
    }

    private function agregarPrendas(PedidoAutomatico $pedido, array $asignables, bool $descontar): void
    {
        foreach ($asignables as [$inv, $cantidad, $porComprar]) {
            $pedido->items()->create([
                'inventario_dotacion_id' => $inv->id,
                'cantidad'               => $cantidad,
                'cantidad_por_comprar'   => $porComprar,
            ]);
            if ($descontar && $cantidad > $porComprar) {
                $inv->decrement('cantidad', $cantidad - $porComprar);
            }
        }
    }

    private function notaFaltantes(): string
    {
        return $this->faltantes ? ' Pendiente: ' . implode('; ', $this->faltantes) . '.' : '';
    }

    private function sinPedido(string $motivo): null
    {
        $this->motivoSinPedido = 'No se generó el pedido automático de dotación: ' . $motivo;
        Log::info('DotacionAutoPedidoService: ' . $this->motivoSinPedido);

        return null;
    }

    private function completarTallasDesdeRespuestaIngreso(User $empleado): void
    {
        if ($empleado->talla_camisa && $empleado->talla_pantalon && $empleado->talla_zapatos) {
            return;
        }

        $respuesta = RespuestaIngreso::where('documento', $empleado->cedula)->first();

        $empleado->talla_camisa   = $empleado->talla_camisa   ?: $respuesta?->talla_camisa;
        $empleado->talla_pantalon = $empleado->talla_pantalon ?: $respuesta?->talla_pantalon;
        $empleado->talla_zapatos  = $empleado->talla_zapatos  ?: $respuesta?->talla_zapatos;
    }

    /**
     * La fila de inventario de la prenda en la bodega de su proyecto (ver bodegaDe). Si no
     * alcanza el stock, igual entra al pedido: lo que falta queda por comprar y se reporta.
     * Si la bodega no tiene la fila pero la prenda existe en el catálogo, se crea en 0 para
     * comprarla. Lo que no existe en el catálogo no se inventa: queda pendiente (o se omite,
     * si es opcional). Sin género o sin talla no se sabe qué prenda es, y no se asigna.
     *
     * @param string[] $proyectos en orden de preferencia (p. ej. el carnet de Tigo sale de su
     *                            propio inventario y, si no lo tiene, del administrativo)
     */
    private function buscarItem(array $proyectos, ?int $sedeContrato, string $prenda, ?string $genero, ?string $talla, int $cantidad, bool $opcional = false): ?InventarioDotacion
    {
        $descripcion = "{$prenda} (" . implode('/', $proyectos) . ", {$genero})";

        if (!$genero) {
            Log::info("DotacionAutoPedidoService: género no registrado para el empleado, no se asigna {$descripcion}.");
            $this->faltantes[] = "{$prenda} (el empleado no tiene género Masculino o Femenino registrado)";
            $this->sinDefinir[] = $prenda;
            return null;
        }

        if (!$talla) {
            Log::info("DotacionAutoPedidoService: talla no registrada para el empleado, no se asigna {$descripcion}.");
            $this->faltantes[] = "{$prenda} (el empleado no tiene la talla registrada)";
            $this->sinDefinir[] = $prenda;
            return null;
        }

        // La misma talla puede estar escrita distinto en el inventario: "M" es "10 (M)" o "10"
        // en las prendas de mujer y "XXL" es "2XL" en varios polos.
        $tallas = InventarioDotacion::tallasEquivalentes($talla);
        // Prendas sin talla (carnet, gorra): sirve la de cualquier género, primero la suya.
        $generos = mb_strtoupper($talla, 'UTF-8') === 'N/A'
            ? [$genero, $genero === 'Masculino' ? 'Femenino' : 'Masculino']
            : [$genero];
        $real = fn ($q) => $q->where(fn ($w) => $w->where('cantidad', '>', 0)->orWhere('stock_minimo', '>', 0)->orWhere('precio', '>', 0));

        foreach ($proyectos as $proyecto) {
            $sedeId = $this->bodegaDe($proyecto) ?? $sedeContrato;
            if (!$sedeId) {
                continue;
            }

            $filas = $this->filasDeLaPrenda($proyecto, $prenda, $generos, $tallas, fn ($q) => $q->where('sede_id', $sedeId)->lockForUpdate());
            if ($filas->isNotEmpty()) {
                // La primera que alcance y, si ninguna alcanza, la que más tenga.
                $inv = $filas->first(fn ($f) => $f->cantidad >= $cantidad) ?? $filas->sortByDesc('cantidad')->first();
                if ($inv->cantidad < $cantidad) {
                    $falta = $cantidad - $inv->cantidad;
                    Log::info("DotacionAutoPedidoService: stock insuficiente para {$descripcion}, talla {$inv->talla} (disponible {$inv->cantidad}, solicitado {$cantidad}).");
                    $this->faltantes[] = "{$prenda} talla {$inv->talla} (por comprar {$falta}: hay {$inv->cantidad}, se necesitan {$cantidad})";
                }

                return $inv;
            }

            // La bodega no la tiene, pero la prenda existe en el catálogo (con existencias, stock
            // mínimo o precio en otra sede): se crea en 0 con ese nombre, talla y precio para
            // comprarla. Una fila en 0 sin precio no cuenta: pudo inventarla una versión anterior.
            $modelo = $this->filasDeLaPrenda($proyecto, $prenda, $generos, $tallas, $real)->first();
            if ($modelo) {
                Log::info("DotacionAutoPedidoService: {$descripcion} talla {$talla} no está en la sede {$sedeId}: se crea en 0 para comprarla.");
                $this->faltantes[] = "{$prenda} talla {$modelo->talla} (por comprar {$cantidad}: no está en el inventario de la sede)";

                return InventarioDotacion::create([
                    'proyecto' => $proyecto, 'sede_id' => $sedeId, 'prenda' => $modelo->prenda, 'genero' => $modelo->genero,
                    'talla' => $modelo->talla, 'precio' => $modelo->precio, 'cantidad' => 0, 'stock_minimo' => 0,
                ]);
            }
        }

        if ($opcional) {
            Log::info("DotacionAutoPedidoService: {$descripcion} no existe en el inventario y es opcional: se omite.");
            return null;
        }

        // Solo se pide a Compras una prenda que existe: si el catálogo no la maneja en esa talla
        // (p. ej. pantalón de mujer talla 32, cuando las de mujer van de 4 a 24) no se inventa la
        // fila: queda pendiente y se completa sola al corregir la talla del empleado.
        Log::info("DotacionAutoPedidoService: {$descripcion} no se maneja en talla {$talla}: no se asigna.");
        $this->faltantes[] = "{$prenda} ({$genero}) no se maneja en talla {$talla}: revisa la talla del empleado o el inventario";
        $this->sinDefinir[] = $prenda;

        return null;
    }

    /**
     * Filas del proyecto que son esta prenda (con cualquiera de los nombres con que se escribe,
     * ver esLaPrenda), en esos géneros y tallas, ordenadas por el género y la talla preferidos.
     */
    private function filasDeLaPrenda(string $proyecto, string $prenda, array $generos, array $tallas, callable $filtro)
    {
        $posicion = fn (array $lista, $valor) => array_search(
            mb_strtoupper((string) $valor, 'UTF-8'),
            array_map(fn ($t) => mb_strtoupper((string) $t, 'UTF-8'), $lista),
            true,
        );

        return InventarioDotacion::where('proyecto', $proyecto)
            ->whereIn('genero', $generos)
            ->whereIn('talla', $tallas)
            ->tap($filtro)
            ->get()
            ->filter(fn ($f) => self::esLaPrenda($prenda, $f->prenda))
            ->sortBy(fn ($f) => $posicion($generos, $f->genero) * 100 + $posicion($tallas, $f->talla))
            ->values();
    }

    /**
     * Sede de donde sale la dotación de cada proyecto: su bodega. En producción cada proyecto
     * tiene todo su inventario en una sola sede de Pereira (ver BODEGAS); si esa sede no tiene
     * nada del proyecto, la que más existencias tenga. Null si el proyecto no tiene inventario
     * (entonces se usa la sede del contrato).
     */
    private function bodegaDe(string $proyecto): ?int
    {
        if (array_key_exists($proyecto, $this->bodegas)) {
            return $this->bodegas[$proyecto];
        }

        $conInventario = fn ($q) => $q->where('proyecto', $proyecto)
            ->where(fn ($w) => $w->where('cantidad', '>', 0)->orWhere('stock_minimo', '>', 0)->orWhere('precio', '>', 0));

        $nombrada = Sede::where('nombre', self::BODEGAS[$proyecto] ?? '')->value('id');
        if ($nombrada && InventarioDotacion::where('sede_id', $nombrada)->tap($conInventario)->exists()) {
            return $this->bodegas[$proyecto] = $nombrada;
        }

        return $this->bodegas[$proyecto] = InventarioDotacion::query()->tap($conInventario)
            ->selectRaw('sede_id, SUM(cantidad) as total')
            ->groupBy('sede_id')
            ->orderByDesc('total')
            ->value('sede_id')
            ?? ($proyecto === 'SYM ADMINISTRATIVO' ? $nombrada : null);
    }

    /**
     * ¿La fila del inventario llamada $nombreInventario es la prenda $prenda del kit? Ignora
     * mayúsculas, tildes, espacios dobles, el prefijo "SYM " y la talla que algunas prendas de
     * mujer llevan en el nombre ("SYM POLO MC AZUL TIGO EXPRESS (10)"), y acepta los nombres
     * con que cada inventario la tiene cargada (ver NOMBRES_EN_INVENTARIO).
     */
    public static function esLaPrenda(string $prenda, string $nombreInventario): bool
    {
        $norm = fn (string $n) => preg_replace(
            ['/^SYM\s+/', '/\s*\(\d+\)$/'],
            '',
            preg_replace('/\s+/', ' ', trim(mb_strtoupper(Str::ascii($n), 'UTF-8'))),
        );
        $buscada = $norm($prenda);

        return in_array($norm($nombreInventario), [$buscada, ...array_map($norm, self::NOMBRES_EN_INVENTARIO[$buscada] ?? [])], true);
    }

    /**
     * Devuelve la lista de reglas (líneas de dotación) para el proyecto+cargo dados, o un
     * array vacío si el proyecto no es SYM/DIRECTV (en cuyo caso no se genera ningún pedido
     * automático). Cada regla: ['proyecto','prenda','genero'|null,'talla'|null,'cantidad'].
     */
    private function resolverReglas(string $proyecto, string $cargo, ?string $genero, User $empleado): array
    {
        $reglas = [];

        $esSupervisorComercial = str_contains($cargo, 'SUPERVISOR COMERCIAL');
        $esAsesor              = str_contains($cargo, 'ASESOR');

        if ($proyecto === 'SYM ADMINISTRATIVO') {
            $reglas = array_merge($reglas, $this->kitAdministrativoSym($genero, $empleado));

        } elseif (in_array($proyecto, ['SYM TIGO EXPRESS', 'SYM TIGO HOME'], true)) {
            // Carnet y gorra: del inventario del propio proyecto (en producción cada Tigo tiene el
            // suyo) y, si no los tiene, del administrativo. No tienen talla: sirve el de cualquier género.
            $carnetTigo = [$proyecto, 'SYM ADMINISTRATIVO'];
            $generoNA = $genero ?? 'Masculino';
            if ($esSupervisorComercial && $proyecto === 'SYM TIGO HOME') {
                $reglas[] = ['SYM TIGO HOME', 'Polo Ml Azul Home', $genero, $empleado->talla_camisa, 2];
                $reglas[] = [$carnetTigo, 'Carnet', $generoNA, 'N/A', 1];
            } elseif ($esSupervisorComercial) {
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Blanca Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = [$carnetTigo, 'Carnet', $generoNA, 'N/A', 1];
            } elseif ($esAsesor && $proyecto === 'SYM TIGO EXPRESS') {
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Blanca Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = [$carnetTigo, 'Carnet', $generoNA, 'N/A', 1];
            } elseif ($esAsesor && $proyecto === 'SYM TIGO HOME') {
                $reglas[] = ['SYM TIGO HOME', 'Polo Ml Azul Home', $genero, $empleado->talla_camisa, 2];
                $reglas[] = [$carnetTigo, 'Gorra Tigo', $generoNA, 'N/A', 1];
                $reglas[] = [$carnetTigo, 'Carnet', $generoNA, 'N/A', 1];
            } else {
                // Cargo no comercial (ej. Analista, Coordinador) en un proyecto Tigo: recibe el
                // mismo kit que "personal administrativo" (proyecto Solo Ausentismos).
                $reglas = array_merge($reglas, $this->kitAdministrativoSym($genero, $empleado));
            }

        } elseif ($proyecto === 'DIRECTV') {
            if (in_array($cargo, self::DIRECTV_TECNICOS_INSTALADORES, true)) {
                $reglas = array_merge($reglas, $this->kitTecnicoInstalador($empleado));
            } elseif (str_contains($cargo, 'LOGISTICA')) {
                $reglas[] = ['DIRECTV', 'Polo Gris Administrativa', $genero, $empleado->talla_camisa, 2];
                $reglas[] = ['DIRECTV', 'Pantalon Comercial', $genero, $empleado->talla_pantalon, 1];
                $reglas[] = ['DIRECTV', 'Botas Instalador', 'Masculino', $empleado->talla_zapatos, 1];
                $reglas[] = ['DIRECTV', 'Carnet', $genero ?? 'Masculino', 'N/A', 1, true];
            } else {
                // Todos los demás cargos de DIRECTV reciben la dotación de un asesor.
                $reglas[] = ['DIRECTV', 'Polo Gris Administrativa', $genero, $empleado->talla_camisa, 2];
                $reglas[] = ['DIRECTV', 'Pantalon Comercial', $genero, $empleado->talla_pantalon, 1];
                $reglas[] = ['DIRECTV', 'Carnet', $genero ?? 'Masculino', 'N/A', 1, true];
            }
        } else {
            return [];
        }

        return $reglas;
    }

    /** Kit de técnico de instalaciones: DIRECTV, y todos los cargos de HUGHES y FT&H. */
    private function kitTecnicoInstalador(User $empleado): array
    {
        return [
            ['DIRECTV', 'Polo Instalador Azul Oscuro M/C', 'Masculino', $empleado->talla_camisa, 1],
            ['DIRECTV', 'Polo Instalador Azul Oscuro M/L', 'Masculino', $empleado->talla_camisa, 1],
            ['DIRECTV', 'Pantalon De Dril Tecnicos', 'Masculino', $empleado->talla_pantalon, 2],
            ['DIRECTV', 'Botas Instalador', 'Masculino', $empleado->talla_zapatos, 1],
            ['DIRECTV', 'Reata Azul Oscuro', 'Masculino', 'N/A', 1],
            ['DIRECTV', 'Gorra', 'Masculino', 'N/A', 1],
            // El inventario de DIRECTV de producción no maneja carnet: si no está, se omite.
            ['DIRECTV', 'Carnet', 'Masculino', 'N/A', 1, true],
        ];
    }

    /**
     * Kit de "personal administrativo" de SYM: 2 polos, 1 pantalón, 1 carnet, siempre
     * tomados del inventario de SYM ADMINISTRATIVO (proyecto real "Solo Ausentismos").
     * Se usa para el proyecto SYM ADMINISTRATIVO y también como kit por defecto para
     * cualquier cargo no comercial (ni Asesor ni Supervisor Comercial) dentro de Tigo
     * Express/Home.
     */
    private function kitAdministrativoSym(?string $genero, User $empleado): array
    {
        return [
            ['SYM ADMINISTRATIVO', 'Polo Gris Manga Corta', $genero, $empleado->talla_camisa, 2],
            ['SYM ADMINISTRATIVO', 'Jean Azul', $genero, $empleado->talla_pantalon, 1],
            ['SYM ADMINISTRATIVO', 'Carnet', 'Masculino', 'N/A', 1],
        ];
    }

}
