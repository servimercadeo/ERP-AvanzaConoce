<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\HasSedeCatalogo;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;
    use HasSedeCatalogo;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        // Acceso al sistema
        'name', 'email', 'password', 'avanzaconoce_id', 'rol', 'activo', 'pendiente_alta', 'ultimo_sso_at',

        // Información General
        'cedula', 'fecha_expedicion', 'apellidos', 'nombres', 'fotografia',
        'sede', 'fecha_nacimiento', 'lugar_nacimiento', 'raza',
        'genero', 'estado_civil', 'nivel_escolaridad', 'profesion',
        'direccion_residencia', 'movil', 'estrato', 'barrio',
        'numero_hijos', 'ingresos', 'observaciones_medicas', 'alergias',
        'talla_camisa', 'talla_pantalon', 'talla_zapatos',

        // Seguridad Social
        'rh', 'eps', 'arl', 'fondo_pensiones', 'caja_compensacion',

        // Licencias y certificaciones
        'licencia_carro', 'licencia_carro_vence',
        'licencia_moto', 'licencia_moto_vence',
        'tiene_cert_alturas', 'cert_alturas_vence',

        // Estado
        'estado_empleado', 'codigo_directv', 'empresa_id', 'empleador', 'jefe_inmediato',
        'jefe_inmediato_nombre', 'jefe_inmediato_correo', 'comentarios',

        // Información Adicional
        'cargo', 'tipo_funcionario', 'tipo_vinculacion',
        'cuenta_bancaria', 'tipo_cuenta', 'banco',

        // Contacto de emergencia
        'contacto_emergencia_nombre', 'contacto_emergencia_telefono', 'contacto_emergencia_parentesco',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function contratos(): HasMany
    {
        return $this->hasMany(Contrato::class, 'empleado_id');
    }

    public function preference(): HasOne
    {
        return $this->hasOne(UserPreference::class);
    }

    /**
     * Deriva automáticamente el rol (th/tic) a partir del cargo cada vez que
     * este cambia. Si el cargo no coincide con ningún patrón conocido, el rol
     * queda vacío (todavía no existen otros roles derivados de cargo). El rol
     * 'admin' es una asignación manual y nunca se sobrescribe aquí.
     */
    protected static function booted(): void
    {
        static::saving(function (User $user) {
            if (!$user->isDirty('cargo') || $user->rol === 'admin') {
                return;
            }

            $cargo = mb_strtoupper((string) $user->cargo);

            if ($cargo !== '' && str_contains($cargo, 'TALENTO HUMANO')) {
                $user->rol = 'th';
            } elseif ($cargo !== '' && (str_contains($cargo, 'SISTEMAS') || str_contains($cargo, 'TIC'))) {
                $user->rol = 'tic';
            } else {
                $user->rol = null;
            }
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'password'             => 'hashed',
            'activo'               => 'boolean',
            'pendiente_alta'       => 'boolean',
            'ultimo_sso_at'        => 'datetime',
            'fecha_nacimiento'     => 'date',
            'fecha_expedicion'     => 'date',
            'licencia_carro_vence' => 'date',
            'licencia_moto_vence'  => 'date',
            'cert_alturas_vence'   => 'date',
            'tiene_cert_alturas'   => 'boolean',
            'ingresos'             => 'decimal:2',
        ];
    }
}
