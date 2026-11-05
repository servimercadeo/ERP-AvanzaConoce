<?php

namespace App\Models;

use App\Services\UsuarioAliadoEmpresa;
use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class PermisoDenegado extends Model
{
    use RegistraAuditoria;

    protected $table = 'permisos_denegados';

    protected $fillable = ['rol', 'modulo_id', 'submodulo_id', 'archivo_id', 'accion'];

    public function auditoriaProceso(): string
    {
        return 'Permisos';
    }

    public function auditoriaNombreRegistro(): string
    {
        $archivo = $this->archivo_id ? "/{$this->archivo_id}" : '';
        $accion = $this->accion ? " ({$this->accion})" : '';
        return "{$this->rol} · {$this->modulo_id}/{$this->submodulo_id}{$archivo}{$accion}";
    }

    public const ROLES_GESTIONABLES = ['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico'];

    /** submodulo_id de los archivos que cuelgan directo del módulo (igual que el frontend). */
    public const SUBMODULO_RAIZ = '_modulo';

    /** archivo_id de la denegación de todo el submódulo (no de una sola pestaña). */
    public const TODO_EL_SUBMODULO = '';

    /** accion de la denegación de ver (la pestaña o el submódulo completo). */
    public const VER = '';

    /** Acciones que se pueden negar dentro de una pestaña que el rol sí ve. */
    public const ACCIONES = ['crear', 'editar', 'eliminar', 'importar', 'exportar'];

    /**
     * Perfiles de la matriz que no son un rol que se asigne en Empleados, sino que salen del
     * aliado del usuario (perfilDe): el usuario de un aliado empresa, el técnico de un aliado
     * empresa y el aliado / técnico indirecto. El rol `tecnico` sin aliado es el técnico directo.
     */
    public const PERFIL_ALIADO_EMPRESA = 'aliado';
    public const PERFIL_TECNICO_DE_ALIADO = 'tecnico_aliado';
    public const PERFIL_TECNICO_INDIRECTO = 'tecnico_indirecto';
    public const PERFILES_DE_ALIADOS = [self::PERFIL_ALIADO_EMPRESA, self::PERFIL_TECNICO_DE_ALIADO, self::PERFIL_TECNICO_INDIRECTO];

    /** Pestañas de la matriz de Permisos: los roles y los perfiles de aliados. */
    public const PERFILES = [...self::ROLES_GESTIONABLES, ...self::PERFILES_DE_ALIADOS];

    /**
     * Con qué pestaña de la matriz se decide lo que ve este usuario: su rol, salvo los
     * aliados. El de un técnico con `aliado_id` depende del tipo de su aliado (empresa o
     * técnico indirecto, que es su propio aliado).
     */
    public static function perfilDe(?User $user): ?string
    {
        if (!$user || $user->rol === 'admin') {
            return $user?->rol;
        }
        if ($user->rol === UsuarioAliadoEmpresa::ROL) {
            return self::PERFIL_ALIADO_EMPRESA;
        }
        if ($user->aliado_id) {
            return $user->aliado?->tipo === Aliado::EMPRESA ? self::PERFIL_TECNICO_DE_ALIADO : self::PERFIL_TECNICO_INDIRECTO;
        }
        return $user->rol;
    }

    /** Módulos que un usuario todavía sin rol no puede ver (igual que canAccessSubmodule). */
    private const SIN_ROL_DENEGADOS = ['administrativo', 'permisos'];

    /**
     * ¿El usuario puede usar este módulo/submódulo (o una pestaña suya, si se da $archivo)?
     * Misma regla que el menú (resources/js/data/erpModules.js): admin todo; sin rol, todo
     * menos Administrativo y Permisos; el resto, todo lo que no esté denegado a su rol en la
     * matriz. Una pestaña queda cerrada si se le denegó a ella o a todo su submódulo.
     *
     * Con $accion (crear, editar, ...) además pide que esa acción no esté negada en la
     * pestaña ni en todo el submódulo (resources/js/data/erpModules.js: canDo).
     */
    /**
     * Middleware de ruta que pide $accion en alguno de los destinos ("módulo.submódulo" o
     * "módulo.submódulo.pestaña"). Ej.: PermisoDenegado::middleware('crear', 'parametros.regionales.regionales_file')
     * da 'permiso:parametros.regionales.regionales_file:crear'.
     */
    public static function middleware(string $accion, string ...$destinos): string
    {
        return 'permiso:' . implode(',', array_map(fn ($d) => "{$d}:{$accion}", $destinos));
    }

    /** ¿Puede hacer $accion en alguno de los destinos ("módulo.submódulo[.pestaña]")? */
    public static function permiteAlguno(?User $user, string $accion, array $destinos): bool
    {
        foreach ($destinos as $destino) {
            [$modulo, $submodulo, $archivo] = array_pad(explode('.', $destino, 3), 3, null);
            if (static::permite($user, $modulo, $submodulo ?? self::SUBMODULO_RAIZ, $archivo, $accion)) {
                return true;
            }
        }
        return false;
    }

    /**
     * `$reglas`: las de su rol ya cargadas (reglasDe) para no consultar la BD en cada
     * destino; el middleware las carga una vez por petición. Sin ellas, consulta.
     */
    public static function permite(?User $user, string $modulo, string $submodulo, ?string $archivo = null, string $accion = self::VER, ?Collection $reglas = null): bool
    {
        if (!$user) {
            return false;
        }
        if ($user->rol === 'admin') {
            return true;
        }
        if (!$user->rol) {
            return !in_array($modulo, self::SIN_ROL_DENEGADOS, true);
        }

        $archivos = array_unique([self::TODO_EL_SUBMODULO, $archivo ?? self::TODO_EL_SUBMODULO]);
        $acciones = array_unique([self::VER, $accion]);

        if ($reglas !== null) {
            // Igual que la consulta: la BD compara sin mayúsculas ni espacios finales.
            $n = fn ($v) => mb_strtolower(rtrim((string) $v), 'UTF-8');
            $archivos = array_map($n, $archivos);
            $acciones = array_map($n, $acciones);

            return !$reglas->contains(fn ($r) => $n($r->modulo_id) === $n($modulo)
                && $n($r->submodulo_id) === $n($submodulo)
                && in_array($n($r->archivo_id), $archivos, true)
                && in_array($n($r->accion), $acciones, true));
        }

        return !static::where('rol', self::perfilDe($user))
            ->where('modulo_id', $modulo)
            ->where('submodulo_id', $submodulo)
            ->whereIn('archivo_id', $archivos)
            ->whereIn('accion', $acciones)
            ->exists();
    }

    /** Todas las reglas (excepciones) de un rol, en una consulta. */
    public static function reglasDe(string $rol): Collection
    {
        return static::where('rol', $rol)->get(['modulo_id', 'submodulo_id', 'archivo_id', 'accion']);
    }
}
