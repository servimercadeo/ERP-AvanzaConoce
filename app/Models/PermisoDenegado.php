<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class PermisoDenegado extends Model
{
    use RegistraAuditoria;

    protected $table = 'permisos_denegados';

    protected $fillable = ['rol', 'modulo_id', 'submodulo_id'];

    public function auditoriaProceso(): string
    {
        return 'Permisos';
    }

    public function auditoriaNombreRegistro(): string
    {
        return "{$this->rol} · {$this->modulo_id}/{$this->submodulo_id}";
    }

    public const ROLES_GESTIONABLES = ['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'];

    /** submodulo_id de los archivos que cuelgan directo del módulo (igual que el frontend). */
    public const SUBMODULO_RAIZ = '_modulo';

    /** Módulos que un usuario todavía sin rol no puede ver (igual que canAccessSubmodule). */
    private const SIN_ROL_DENEGADOS = ['administrativo', 'permisos'];

    /**
     * ¿El usuario puede usar este módulo/submódulo? Misma regla que el menú
     * (resources/js/data/erpModules.js): admin todo; sin rol, todo menos Administrativo y
     * Permisos; el resto, todo lo que no esté denegado a su rol en la matriz.
     */
    public static function permite(?User $user, string $modulo, string $submodulo): bool
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
            ->exists();
    }
}
