<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

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

    public const ROLES_GESTIONABLES = ['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'];

    /** submodulo_id de los archivos que cuelgan directo del módulo (igual que el frontend). */
    public const SUBMODULO_RAIZ = '_modulo';

    /** archivo_id de la denegación de todo el submódulo (no de una sola pestaña). */
    public const TODO_EL_SUBMODULO = '';

    /** accion de la denegación de ver (la pestaña o el submódulo completo). */
    public const VER = '';

    /** Acciones que se pueden negar dentro de una pestaña que el rol sí ve. */
    public const ACCIONES = ['crear', 'editar', 'eliminar', 'importar', 'exportar'];

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

    public static function permite(?User $user, string $modulo, string $submodulo, ?string $archivo = null, string $accion = self::VER): bool
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

        return !static::where('rol', $user->rol)
            ->where('modulo_id', $modulo)
            ->where('submodulo_id', $submodulo)
            ->whereIn('archivo_id', array_unique([self::TODO_EL_SUBMODULO, $archivo ?? self::TODO_EL_SUBMODULO]))
            ->whereIn('accion', array_unique([self::VER, $accion]))
            ->exists();
    }
}
