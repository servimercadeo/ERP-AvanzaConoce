<?php

namespace App\Console\Commands;

use Illuminate\Foundation\Console\ServeCommand as BaseServeCommand;
use Symfony\Component\Process\Process;

/**
 * Extiende el serve estándar para arrancar Vite (React) en paralelo.
 * Uso: php artisan serve --port=8001
 */
class ServeCommand extends BaseServeCommand
{
    private ?Process $viteProcess = null;

    public function handle(): int
    {
        $this->iniciarVite();

        // Detener Vite cuando PHP termine (Ctrl+C incluido)
        register_shutdown_function(function () {
            $this->viteProcess?->stop(3);
        });

        return parent::handle();
    }

    private function iniciarVite(): void
    {
        // Process::fromShellCommandline maneja Windows (cmd /c) y Unix automáticamente
        $this->viteProcess = Process::fromShellCommandline('npm run dev', base_path());
        $this->viteProcess->setTimeout(null);

        $this->viteProcess->start(function (string $type, string $output) {
            $this->output->write($output);
        });

        $this->newLine();
        $this->components->info('Vite (React) → <href=http://localhost:5173>http://localhost:5173</>');
        $this->newLine();

        // Espera breve para que Vite arranque antes de que Laravel empiece a imprimir
        sleep(2);
    }
}
