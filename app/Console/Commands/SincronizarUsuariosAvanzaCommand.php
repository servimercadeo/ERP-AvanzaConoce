<?php

namespace App\Console\Commands;

use App\Models\Aliado;
use App\Models\User;
use App\Services\AltaAliadoEnAvanzaConoce;
use App\Services\AltaEnAvanzaConoce;
use Illuminate\Console\Command;

/**
 * Reintenta crear en AvanzaConoce a los empleados dados de alta en el ERP cuyo envío quedó
 * pendiente o falló (AvanzaConoce caído, timeout...). Los 'conflicto' no se reintentan:
 * vuelven a 'pendiente' solos cuando se corrige el dato en Empleados.
 * Programado cada 10 minutos en routes/console.php.
 */
class SincronizarUsuariosAvanzaCommand extends Command
{
    protected $signature = 'avanza:sincronizar-usuarios {--limite=100 : Máximo de usuarios por ejecución}';

    protected $description = 'Reintenta crear en AvanzaConoce los empleados con alta pendiente o fallida';

    public function handle(AltaEnAvanzaConoce $avanza, AltaAliadoEnAvanzaConoce $avanzaAliados): int
    {
        if (!AltaEnAvanzaConoce::activo()) {
            $this->info('La creación de usuarios en AvanzaConoce está apagada (AVANZACONOCE_CREAR_USUARIOS).');
            return self::SUCCESS;
        }

        $usuarios = User::whereIn('avanza_sync_estado', AltaEnAvanzaConoce::REINTENTABLES)
            ->where('activo', true)
            ->where('pendiente_alta', false)
            ->orderBy('avanza_sync_at')
            ->limit((int) $this->option('limite'))
            ->get();

        $ok = 0;
        foreach ($usuarios as $usuario) {
            $resultado = $avanza->enviar($usuario);
            if ($resultado['estado'] === AltaEnAvanzaConoce::OK) {
                $ok++;
            } else {
                $this->warn("{$usuario->cedula}: {$resultado['mensaje']}");
            }
        }

        $this->info("Sincronizados {$ok} de {$usuarios->count()}.");

        // Aliados empresa (su usuario de AvanzaConoce no es un usuario del ERP).
        $aliados = Aliado::where('tipo', Aliado::EMPRESA)
            ->whereIn('avanza_sync_estado', AltaEnAvanzaConoce::REINTENTABLES)
            ->where('activo', true)
            ->orderBy('avanza_sync_at')
            ->limit((int) $this->option('limite'))
            ->get();

        $okAliados = 0;
        foreach ($aliados as $aliado) {
            $resultado = $avanzaAliados->enviar($aliado);
            if ($resultado['estado'] === AltaEnAvanzaConoce::OK) {
                $okAliados++;
            } else {
                $this->warn("Aliado {$aliado->documento}: {$resultado['mensaje']}");
            }
        }
        if ($aliados->isNotEmpty()) {
            $this->info("Aliados sincronizados {$okAliados} de {$aliados->count()}.");
        }

        return self::SUCCESS;
    }
}
