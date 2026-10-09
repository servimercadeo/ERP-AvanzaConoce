<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\HasSedeCatalogo;
use App\Traits\RegistraAuditoria;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;
    use HasSedeCatalogo;
    use RegistraAuditoria;

    // "ultimo_sso_at" se toca en cada login SSO y "remember_token" en cada sesión nueva:
    // ninguno de los dos es una edición real del empleado, así que no deben generar ruido
    // en la Auditoría del Sistema.
    protected $auditoriaIgnorar = ['ultimo_sso_at', 'remember_token'];

    public function auditoriaProceso(): string
    {
        return 'Empleados';
    }

    public function auditoriaNombreRegistro(): string
    {
        $nombre = trim(($this->nombres ?? '') . ' ' . ($this->apellidos ?? ''));
        return $nombre !== '' ? $nombre : ($this->name ?? ('#' . $this->id));
    }

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
     * `email` suele quedar con el correo autogenerado "{cedula}@avanzaconoce.com" cuando
     * no se registró un correo real al crear el contrato (ver ContratoController::store).
     * En ese caso se busca el correo real en respuestas_ingresos / candidatos (igual que
     * EmpleadoController::index() para mostrarlo en el listado). Si tampoco existe ahí,
     * se devuelve null en vez del placeholder: no es una casilla real, no tiene sentido
     * enviarle nada.
     */
    public function resolverEmailReal(): ?string
    {
        if (!$this->email) {
            return null;
        }

        $cedula = $this->cedula ?? '';
        if (!$cedula || !str_starts_with($this->email, $cedula . '@')) {
            return $this->email;
        }

        return \App\Models\RespuestaIngreso::where('documento', $cedula)->value('correo')
            ?? \Illuminate\Support\Facades\DB::table('candidatos')->where('identificacion', $cedula)->value('correo');
    }

    /**
     * Deriva automáticamente el rol (th/tic) a partir del cargo cada vez que
     * este cambia. Si el cargo no coincide con ningún patrón conocido, el rol
     * queda vacío (todavía no existen otros roles derivados de cargo). El rol
     * 'admin' es una asignación manual y nunca se sobrescribe aquí.
     */
    protected static function booted(): void
    {
        // Sus contratos se borran en cascada en la base (sin eventos de Contrato): sus
        // pedidos de dotación no entregados se anulan antes, mientras aún se le encuentran.
        static::deleting(function (User $user) {
            PedidoAutomatico::anularSinContrato($user->id, aunqueTengaContrato: true);
        });

        // El rol se elige en Empleados ("Tipo de funcionario"). El cargo solo sugiere uno
        // (th/tic/supervisores) a quien todavía no tiene rol asignado; nunca cambia ni quita
        // uno elegido. Los asesores comerciales se quedan en "general".
        static::saving(function (User $user) {
            $rolElegidoAhora = $user->exists && $user->isDirty('rol');
            if (!$user->isDirty('cargo') || $rolElegidoAhora || !in_array($user->rol, [null, 'general'], true)) {
                return;
            }

            $cargo = mb_strtoupper((string) $user->cargo);

            if ($cargo !== '' && str_contains($cargo, 'TALENTO HUMANO')) {
                $user->rol = 'th';
            } elseif ($cargo !== '' && (str_contains($cargo, 'SISTEMAS') || str_contains($cargo, 'TIC'))) {
                $user->rol = 'tic';
            } elseif ($cargo !== '' && str_contains($cargo, 'SUPERVIS')) {
                $user->rol = 'supervisores';
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
            'avanza_sync_at'       => 'datetime',
            'fecha_nacimiento'     => 'date',
            'fecha_expedicion'     => 'date',
            'licencia_carro_vence' => 'date',
            'licencia_moto_vence'  => 'date',
            'cert_alturas_vence'   => 'date',
            'tiene_cert_alturas'   => 'boolean',
            'ingresos'             => 'decimal:2',
        ];
    }

    /**
     * Completa en memoria (sin guardar) `fotografia` de los usuarios que no la tienen en
     * `users`: primero la del formulario de nuevos ingresos (fuente actual) y si no, la de
     * candidatos (fuente antigua). Resuelto en dos consultas para toda la colección.
     *
     * @param  iterable<User|null>  $users
     */
    public static function completarFotografias(iterable $users): void
    {
        // Una ruta guardada cuyo archivo ya no existe (p. ej. importada de otro sistema)
        // cuenta como "sin foto": si no, nunca se buscaría la del formulario de ingreso.
        $sinFoto = collect($users)->filter(fn ($u) => $u && $u->cedula && !self::fotoExiste($u->fotografia));
        if ($sinFoto->isEmpty()) {
            return;
        }

        $cedulas = $sinFoto->pluck('cedula')->unique()->values()->all();
        // `union` (no `merge`): las cédulas son claves numéricas y `merge` las renumeraría.
        // Ante la misma cédula gana la de respuestas_ingresos (lado izquierdo).
        $fotos = DB::table('respuestas_ingresos')
            ->whereIn('documento', $cedulas)
            ->whereNotNull('fotografia')->where('fotografia', '!=', '')
            ->orderBy('id')
            ->pluck('fotografia', 'documento')
            ->union(
                DB::table('candidatos')
                    ->whereIn('identificacion', $cedulas)
                    ->whereNotNull('fotografia')->where('fotografia', '!=', '')
                    ->orderBy('id')
                    ->pluck('fotografia', 'identificacion')
            );

        foreach ($sinFoto as $user) {
            if ($foto = $fotos->get($user->cedula)) {
                $user->fotografia = $foto;
            }
        }
    }

    /** Correo en minúsculas y sin espacios (ver IdentidadUnica). */
    public function setEmailAttribute($value): void
    {
        $this->attributes['email'] = $value === null ? null : \App\Services\IdentidadUnica::normalizarCorreo($value);
    }

    /**
     * Lo que el frontend recibe del usuario en sesión (login y /api/user). Incluye
     * "permisos_denegados" para armar el menú: las excepciones (módulo/submódulo) que el
     * módulo Permisos le oculta a su rol. "admin" nunca tiene nada denegado.
     */
    public function datosDeSesion(): array
    {
        return array_merge($this->only('id', 'name', 'email', 'rol', 'sede_id'), [
            'permisos_denegados' => (!$this->rol || $this->rol === 'admin')
                ? []
                : PermisoDenegado::where('rol', $this->rol)->get(['modulo_id', 'submodulo_id', 'archivo_id', 'accion'])->toArray(),
        ]);
    }

    /** true si la ruta apunta a un archivo que existe en el disco público. */
    public static function fotoExiste(?string $ruta): bool
    {
        return $ruta !== null && $ruta !== '' && \Illuminate\Support\Facades\Storage::disk('public')->exists($ruta);
    }
}
