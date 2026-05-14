<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $table    = 'app_settings';
    protected $fillable = ['key', 'value'];

    /** Obtiene un valor por clave, con un default opcional. */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    /** Crea o actualiza un valor por clave. */
    public static function setValue(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
