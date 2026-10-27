<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Monto en pesos con hasta 2 decimales (columna decimal(15,2)). Se lee como entero si no
 * tiene centavos (1500, no "1500.00") y como decimal si los tiene (150.5): así la API y el
 * PDF siguen mostrando igual los valores de siempre.
 */
class Monto implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): int|float|null
    {
        if ($value === null) {
            return null;
        }

        $monto = round((float) $value, 2);

        return floor($monto) == $monto ? (int) $monto : $monto;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : number_format(round((float) $value, 2), 2, '.', '');
    }
}
