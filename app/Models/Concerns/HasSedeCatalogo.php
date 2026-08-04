<?php

namespace App\Models\Concerns;

use App\Models\Sede;

/**
 * `sede` sigue existiendo como columna de texto libre (legado de imports/formularios), pero
 * `sede_id` es ahora la fuente de verdad: se resuelve automáticamente contra el catálogo
 * `sedes` cada vez que `sede` cambia, y la lectura de `sede` prioriza el nombre actual del
 * catálogo. Así, renombrar una sede en el módulo Sedes se refleja de inmediato en Contratos y
 * Empleados sin tener que re-guardar cada registro.
 */
trait HasSedeCatalogo
{
    public function sedeCatalogo()
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    protected static function bootHasSedeCatalogo(): void
    {
        static::saving(function ($model) {
            if (!$model->isDirty('sede')) {
                return;
            }

            $nombre = trim((string) $model->sede);
            $model->sede_id = $nombre !== ''
                ? Sede::whereRaw('UPPER(nombre) = ?', [mb_strtoupper($nombre, 'UTF-8')])->value('id')
                : null;
        });
    }

    public function getSedeAttribute($value)
    {
        return $this->sede_id ? ($this->sedeCatalogo?->nombre ?? $value) : $value;
    }
}
