<?php

namespace App\Traits;

use App\Models\Auditoria;

/**
 * Se agrega a un modelo para que cada creación/edición/borrado quede en la Auditoría del
 * Sistema automáticamente, sin tocar los controladores. Cada modelo puede opcionalmente
 * definir `auditoriaProceso()` (nombre del proceso/módulo a mostrar, por defecto el
 * nombre de la clase) y `auditoriaNombreRegistro()` (cómo identificar ESE registro en la
 * descripción, por defecto intenta adivinar con los campos típicos de nombre/código).
 */
trait RegistraAuditoria
{
    public static function bootRegistraAuditoria(): void
    {
        static::created(fn ($modelo) => $modelo->registrarAuditoria('creado'));
        static::updated(function ($modelo) {
            // Campos que se tocan solos (ej. `ultimo_sso_at` en cada login SSO) no cuentan
            // como una edición real — si lo único que cambió está en esta lista, no se
            // registra nada. Un modelo opta por esto con `protected $auditoriaIgnorar = [...]`.
            $ignorar = array_merge(['updated_at'], $modelo->auditoriaIgnorar ?? []);
            $cambiosReales = array_diff(array_keys($modelo->getChanges()), $ignorar);
            if (empty($cambiosReales)) {
                return;
            }
            $modelo->registrarAuditoria('actualizado');
        });
        static::deleted(fn ($modelo) => $modelo->registrarAuditoria('eliminado'));
    }

    public function registrarAuditoria(string $accion): void
    {
        $user = auth()->user();
        $proceso = method_exists($this, 'auditoriaProceso') ? $this->auditoriaProceso() : class_basename($this);
        $verbo = ['creado' => 'Creó', 'actualizado' => 'Actualizó', 'eliminado' => 'Eliminó'][$accion];

        Auditoria::create([
            'user_id'     => $user?->id,
            'usuario'     => $user?->name ?? 'Sistema',
            'rol'         => $user?->rol,
            'accion'      => $accion,
            'proceso'     => $proceso,
            'modelo'      => static::class,
            'registro_id' => $this->getKey(),
            'descripcion' => "{$verbo} {$proceso}: {$this->auditoriaNombreRegistroResuelto()}",
            'created_at'  => now(),
        ]);
    }

    private function auditoriaNombreRegistroResuelto(): string
    {
        if (method_exists($this, 'auditoriaNombreRegistro')) {
            $nombre = $this->auditoriaNombreRegistro();
            if (!empty($nombre)) {
                return $nombre;
            }
        }

        foreach (['codigo', 'numero_wo', 'name', 'nombre', 'titulo'] as $campo) {
            if (!empty($this->{$campo} ?? null)) {
                return (string) $this->{$campo};
            }
        }

        $nombreCompuesto = trim(($this->nombres ?? '') . ' ' . ($this->apellidos ?? ''));
        if ($nombreCompuesto !== '') {
            return $nombreCompuesto;
        }

        return '#' . $this->getKey();
    }
}
