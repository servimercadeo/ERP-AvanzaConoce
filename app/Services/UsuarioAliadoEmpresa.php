<?php

namespace App\Services;

use App\Models\Aliado;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Usuario del ERP de un aliado EMPRESA (aliados.usuario_id): rol `aliado`, con su NIT (solo
 * dígitos, como en AvanzaConoce) como cédula. Con eso entra igual que los empleados:
 *  - desde AvanzaConoce con "Ir al ERP" (el SSO busca por cédula = `nit` de AvanzaConoce), o
 *  - en el login del ERP con su correo y la misma contraseña de AvanzaConoce (AvanzaConoce
 *    copia cada cambio de clave a erp_users por cédula: User::syncPasswordErp allá).
 *
 * Adentro solo ve Operaciones > Aliados (su propia ficha: técnicos y sus Work Orders), sin
 * crear ni editar; el módulo Work Orders no (ver PermisoDenegado::ACCESO_ALIADO y el
 * middleware SoloAccesoDeAliado). No es un técnico: no lleva `aliado_id`.
 */
class UsuarioAliadoEmpresa
{
    public const ROL = 'aliado';

    /**
     * Crea (o completa) el usuario del aliado empresa. `$hash` es la contraseña cifrada a
     * usar; sin él se toma la de AvanzaConoce si allá existe, o la generada para el alta
     * allá (aliados.avanza_password), o una temporal nueva (se devuelve en `password`).
     *
     * @return array{estado: string, mensaje: string, password: ?string} estado: ok | existente | conflicto | no_aplica
     */
    public function asegurar(Aliado $aliado, ?string $hash = null): array
    {
        if ($aliado->tipo !== Aliado::EMPRESA) {
            return ['estado' => 'no_aplica', 'mensaje' => '', 'password' => null];
        }

        if ($aliado->usuario_id && ($usuario = User::find($aliado->usuario_id))) {
            $this->sincronizar($aliado, $usuario);
            return ['estado' => 'existente', 'mensaje' => 'Ya tenía usuario en el ERP.', 'password' => null];
        }

        $nit = AltaAliadoEnAvanzaConoce::nit($aliado);
        $correo = IdentidadUnica::normalizarCorreo((string) $aliado->correo);

        // Nunca se toma en silencio el usuario de otra persona (un empleado o técnico con ese
        // mismo documento o correo): queda sin acceso al ERP y se avisa para corregirlo.
        if (strlen($nit) < 3) {
            return $this->conflicto($aliado, 'el documento no tiene un número válido');
        }
        if (User::where('cedula', $nit)->exists()) {
            return $this->conflicto($aliado, "ya hay un usuario del ERP con el documento {$nit}");
        }
        if ($correo === '' || User::where('email', $correo)->exists()) {
            return $this->conflicto($aliado, $correo === '' ? 'falta el correo' : "el correo {$correo} ya es de otro usuario del ERP");
        }

        $plano = null;
        $hash ??= CredencialesAvanzaConoce::passwordEnAvanza($nit) ?? $aliado->avanza_password;
        if (!$hash) {
            $credenciales = CredencialesAvanzaConoce::paraAlta($nit);
            $hash = $credenciales['hash'];
            $plano = $credenciales['de_avanza'] ? null : $credenciales['mostrar'];
        }

        $usuario = new User([
            'cedula'         => $nit,
            'name'           => $aliado->nombre,
            'nombres'        => $aliado->nombre,
            'email'          => $correo,
            'movil'          => $aliado->telefono,
            'password'       => $hash,
            'activo'         => (bool) $aliado->activo,
            'pendiente_alta' => false,
        ]);
        $usuario->forceFill(['rol' => self::ROL])->save();
        $aliado->forceFill(['usuario_id' => $usuario->id])->saveQuietly();

        return ['estado' => 'ok', 'mensaje' => 'Usuario del ERP creado: entra desde AvanzaConoce ("Ir al ERP") o con su correo y contraseña.', 'password' => $plano];
    }

    /** Lleva al usuario los datos del aliado que cambiaron (nombre, correo, teléfono, activo). */
    public function sincronizar(Aliado $aliado, ?User $usuario = null): void
    {
        $usuario ??= $aliado->usuario_id ? User::find($aliado->usuario_id) : null;
        if (!$usuario) {
            return;
        }

        $correo = IdentidadUnica::normalizarCorreo((string) $aliado->correo);
        $usuario->fill([
            'name'    => $aliado->nombre,
            'nombres' => $aliado->nombre,
            'movil'   => $aliado->telefono,
            'activo'  => (bool) $aliado->activo,
        ]);
        // El correo es el usuario del login: solo si nadie más lo tiene.
        if ($correo !== '' && !User::where('email', $correo)->whereKeyNot($usuario->id)->exists()) {
            $usuario->email = $correo;
        }
        $usuario->save();
    }

    private function conflicto(Aliado $aliado, string $motivo): array
    {
        Log::warning("Aliado {$aliado->documento}: sin usuario del ERP, {$motivo}.");

        return ['estado' => 'conflicto', 'mensaje' => "No se creó su usuario del ERP: {$motivo}. Corrígelo editando el aliado.", 'password' => null];
    }
}
