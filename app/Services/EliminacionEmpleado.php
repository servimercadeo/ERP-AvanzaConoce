<?php

namespace App\Services;

use App\Models\AsignacionInventario;
use App\Models\BaseIngreso;
use App\Models\Candidato;
use App\Models\CandidatoDocumento;
use App\Models\Contrato;
use App\Models\DocumentoEmpleado;
use App\Models\InventarioProducto;
use App\Models\InventarioProductoSerie;
use App\Models\PedidoAutomatico;
use App\Models\Requisicion;
use App\Models\RespuestaIngreso;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Eliminar un empleado lo borra por completo del ERP, sin dejar datos sueltos ni descuadrar
 * el inventario: pedidos de dotación, equipos asignados, contratos, documentos y todo su
 * proceso de selección (candidato, aval y formulario de ingreso), más sus archivos. Lo que
 * ya se le había entregado no vuelve al stock; lo pendiente o asignado sí.
 * No toca su cuenta de AvanzaConoce (otro sistema).
 */
class EliminacionEmpleado
{
    /** @return array<string, int> cuántos registros se eliminaron de cada cosa */
    public static function eliminar(User $user): array
    {
        $cedula = trim((string) $user->cedula);
        $archivos = [];
        $resumen = [];

        DB::transaction(function () use ($user, $cedula, &$archivos, &$resumen) {
            // 1. Dotación: lo no entregado vuelve al inventario; lo entregado solo se borra.
            $pedidos = PedidoAutomatico::where('empleado_id', $user->id)->get();
            foreach ($pedidos as $pedido) {
                if (in_array($pedido->estado, ['Activo', 'Enviar a compras'], true)) {
                    $pedido->restaurarInventario();
                }
                $pedido->items()->delete();
                $pedido->delete();
            }
            $resumen['pedidos_dotacion'] = $pedidos->count();

            // 2. Equipos e insumos asignados y no devueltos: vuelven al inventario.
            $asignaciones = AsignacionInventario::where('user_id', $user->id)->get();
            foreach ($asignaciones as $asignacion) {
                if (!$asignacion->fecha_devolucion) {
                    self::devolverAlInventario($asignacion);
                }
                $asignacion->delete();
            }
            $resumen['asignaciones_inventario'] = $asignaciones->count();

            // 3. Contratos (sus anexos, centros de costo y eventos médicos se borran en cascada).
            $resumen['contratos'] = Contrato::where('empleado_id', $user->id)->get()->each->delete()->count();

            // 4. Documentos del empleado.
            $documentos = DocumentoEmpleado::where('user_id', $user->id)->get();
            $archivos = array_merge($archivos, $documentos->pluck('ruta')->filter()->map(fn ($r) => ['local', $r])->all());
            $documentos->each->delete();
            $resumen['documentos_empleado'] = $documentos->count();

            // 5. Proceso de selección de esa cédula.
            if ($cedula !== '') {
                $candidatos = Candidato::where('identificacion', $cedula)->get();
                $requisiciones = $candidatos->pluck('requisicion_id')->filter()->unique();
                $docsCandidato = CandidatoDocumento::whereIn('candidato_id', $candidatos->pluck('id'))->get();
                $archivos = array_merge(
                    $archivos,
                    $docsCandidato->pluck('ruta')->filter()->map(fn ($r) => ['local', $r])->all(),
                    $candidatos->pluck('fotografia')->filter()->map(fn ($r) => ['public', $r])->all(),
                );
                $docsCandidato->each->delete();

                $resumen['avales'] = BaseIngreso::withTrashed()->where('documento_identificacion', $cedula)->forceDelete();

                $respuestas = RespuestaIngreso::where('documento', $cedula)->get();
                $archivos = array_merge($archivos, $respuestas->pluck('fotografia')->filter()->map(fn ($r) => ['public', $r])->all());
                $respuestas->each->delete();
                $resumen['formularios_ingreso'] = $respuestas->count();

                $candidatos->each->delete();
                $resumen['candidatos'] = $candidatos->count();

                // Se libera la vacante que ocupaba.
                $requisiciones->each(fn ($id) => Requisicion::actualizarEstadoPorVacantesDe($id));
            }

            // 6. El usuario y lo que solo le pertenece a él.
            if ($user->fotografia) {
                $archivos[] = ['public', $user->fotografia];
            }
            DB::table('user_preferences')->where('user_id', $user->id)->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->delete();
        });

        // Archivos: después de confirmar en la base (si algo falló arriba, no se pierde nada).
        foreach ($archivos as [$disco, $ruta]) {
            self::borrarArchivo($disco, $ruta);
        }
        if ($cedula !== '') {
            self::borrarDocumentosDeContratacion($cedula);
        }

        Log::info("Empleado {$cedula} (usuario {$user->id}) eliminado por completo.", $resumen);

        return $resumen;
    }

    private static function devolverAlInventario(AsignacionInventario $asignacion): void
    {
        $inv = InventarioProducto::lockForUpdate()->find($asignacion->inventario_producto_id);
        if (!$inv) {
            return;
        }
        $inv->increment('cantidad', $asignacion->cantidad);
        if ($asignacion->serial) {
            InventarioProductoSerie::create(['inventario_producto_id' => $inv->id, 'serial' => $asignacion->serial]);
        }
    }

    private static function borrarArchivo(string $disco, string $ruta): void
    {
        try {
            Storage::disk($disco)->delete($ruta);
        } catch (\Throwable $e) {
            Log::warning("No se pudo borrar el archivo {$ruta}: " . $e->getMessage());
        }
    }

    /** Carpeta y registro de los documentos de contratación que subió por el link público. */
    private static function borrarDocumentosDeContratacion(string $cedula): void
    {
        try {
            Storage::disk('local')->deleteDirectory('documentos_contratacion/' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $cedula));

            $metaPath = storage_path('app/documentos_contratacion.json');
            if (file_exists($metaPath)) {
                $meta = json_decode(file_get_contents($metaPath), true) ?: [];
                if (array_key_exists($cedula, $meta)) {
                    unset($meta[$cedula]);
                    file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                }
            }
        } catch (\Throwable $e) {
            Log::warning("No se pudieron borrar los documentos de contratación de {$cedula}: " . $e->getMessage());
        }
    }
}
