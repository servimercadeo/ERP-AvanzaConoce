<?php

namespace App\Console\Commands;

use App\Services\RevisorEsquema;
use Illuminate\Console\Command;

/** Diagnóstico de solo lectura: correrlo tras cada despliegue. No cambia nada en la base. */
class RevisarBaseDeDatosCommand extends Command
{
    protected $signature = 'erp:revisar-bd';

    protected $description = 'Compara la estructura de la base con la esperada y revisa lo que suele fallar solo en el servidor (solo lectura)';

    public function handle(): int
    {
        $esperado = json_decode((string) file_get_contents(base_path(RevisorEsquema::ARCHIVO)), true);
        if (!$esperado) {
            $this->error('No se pudo leer ' . RevisorEsquema::ARCHIVO);

            return self::FAILURE;
        }

        $resultado = RevisorEsquema::comparar($esperado, RevisorEsquema::leerActual());
        $errores = $resultado['errores'];

        foreach (['storage/logs', 'storage/framework/cache', 'storage/framework/sessions', 'storage/framework/views', 'bootstrap/cache'] as $carpeta) {
            if (!is_writable(base_path($carpeta))) {
                $errores[] = "El sistema no puede escribir en {$carpeta}.";
            }
        }

        $this->line(count($esperado) . ' tablas revisadas: ' . count($errores) . ' errores, ' . count($resultado['avisos']) . ' avisos.');
        foreach ($errores as $error) {
            $this->error($error);
        }
        foreach ($resultado['avisos'] as $aviso) {
            $this->warn($aviso);
        }
        if (!$errores && !$resultado['avisos']) {
            $this->info('Todo coincide.');
        }

        return $errores ? self::FAILURE : self::SUCCESS;
    }
}
