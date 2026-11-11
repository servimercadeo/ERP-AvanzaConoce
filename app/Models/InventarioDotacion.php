<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class InventarioDotacion extends Model
{
    use HasFactory;

    protected $table = 'inventario_dotacion';

    /** Caché del catálogo completo (InventarioDotacionController::index). */
    public const CACHE_KEY_FLAT = 'inventario-dotacion:flat';

    /**
     * La misma talla escrita de distintas formas: el formulario de ingreso usa XS...XXXL y el
     * inventario 2XL/3XL, o "10 (M)" en las prendas femeninas de Tigo.
     */
    // El número solo va al final: en producción las camisas de mujer de DIRECTV vienen por
    // número ("CAMISA COMERCIAL DAMA" talla 10). Al final para que primero se busque la letra.
    private const TALLAS_EQUIVALENTES = [
        ['XS', '6 (XS)', '6'],
        ['S', '8 (S)', '8'],
        ['M', '10 (M)', '10'],
        ['L', '12 (L)', '12'],
        ['XL', '14 (XL)', '14'],
        ['2XL', 'XXL', '16 (2XL)', '16'],
        ['3XL', 'XXXL', '18 (3XL)', '18'],
        ['4XL', '20 (4XL)', '20'],
    ];

    /** @return string[] la talla dada primero y luego sus equivalentes. */
    public static function tallasEquivalentes(string $talla): array
    {
        $talla = trim($talla);
        foreach (self::TALLAS_EQUIVALENTES as $grupo) {
            if (in_array(mb_strtoupper($talla, 'UTF-8'), $grupo, true)) {
                return array_values(array_unique([$talla, ...$grupo]));
            }
        }

        return [$talla];
    }

    protected static function booted(): void
    {
        // increment/decrement disparan "updated": los pedidos también dejan el catálogo al día.
        $olvidar = fn () => Cache::store('file')->forget(self::CACHE_KEY_FLAT);
        static::created($olvidar);
        static::updated($olvidar);
        static::deleted($olvidar);
    }

    /**
     * Proyecto de dotación => nombre exacto en la tabla `proyectos`. Fuente única de verdad
     * para resolver qué sedes aplican a cada proyecto de dotación vía el pivote proyecto_sede
     * (usado por InventarioDotacionController y por InventarioDotacionSeeder).
     */
    public const PROYECTO_DOTACION_A_PROYECTO = [
        'SYM TIGO EXPRESS'   => 'TIGO EXPRESS',
        'SYM TIGO HOME'      => 'TIGO HOME',
        'SYM ADMINISTRATIVO' => 'ADMINISTRATIVO',
        'DIRECTV'            => 'DIRECTV',
    ];

    protected $fillable = [
        'proyecto',
        'sede_id',
        'prenda',
        'genero',
        'talla',
        'precio',
        'cantidad',
        'stock_minimo',
    ];

    protected $casts = [
        'precio' => 'integer',
        'cantidad' => 'integer',
        'stock_minimo' => 'integer',
    ];

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }
}
