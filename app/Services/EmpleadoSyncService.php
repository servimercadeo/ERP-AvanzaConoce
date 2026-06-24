<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EmpleadoSyncService
{
    /**
     * Sync non-null values FROM any CRUD TO the users table.
     * $userFields: [users_column => value]
     */
    public function syncToUser(string $cedula, array $userFields): void
    {
        try {
            $user = User::where('cedula', $cedula)->first();
            if (!$user) return;

            $updates = array_filter($userFields, fn($v) => !is_null($v) && $v !== '');

            // Email: evitar violación de unique constraint
            if (isset($updates['email'])) {
                $taken = User::where('email', $updates['email'])->where('id', '!=', $user->id)->exists();
                if ($taken) unset($updates['email']);
            }

            if ($updates) {
                $user->update($updates);
            }
        } catch (\Exception $e) {
            Log::warning('EmpleadoSyncService::syncToUser failed for cedula=' . $cedula . ': ' . $e->getMessage());
        }
    }

    /**
     * Sync FROM users TO candidatos, respuestas_ingresos y base_ingresos.
     * Llamado al guardar un empleado en EmpleadosCrud.
     */
    public function syncFromUser(User $user): void
    {
        try {
            $cedula = $user->cedula;
            if (!$cedula) return;

            $toDate = fn($v) => $v ? (\Carbon\Carbon::parse($v)->format('Y-m-d')) : null;

            // Omitir email auto-generado (cedula@dominio)
            $email = ($user->email && !str_starts_with($user->email, $cedula . '@'))
                ? $user->email
                : null;

            // Omitir móvil placeholder
            $movil = ($user->movil && $user->movil !== '0000000000') ? $user->movil : null;

            // → candidatos
            $candidatoFields = $this->notNull([
                'correo'           => $email,
                'celular'          => $movil,
                'fecha_expedicion' => $toDate($user->fecha_expedicion),
                'caja_compensacion'=> $user->caja_compensacion,
                'genero'           => $user->genero,
                'arl'              => $user->arl,
                'salario_basico'   => $user->ingresos,
            ]);
            if ($candidatoFields) {
                DB::table('candidatos')->where('identificacion', $cedula)->update($candidatoFields);
            }

            // → respuestas_ingresos
            $respuestaFields = $this->notNull([
                'correo'               => $email,
                'celular'              => $movil,
                'estado_civil'         => $user->estado_civil,
                'nivel_escolaridad'    => $user->nivel_escolaridad,
                'profesion'            => $user->profesion,
                'estrato'              => $user->estrato,
                'barrio'               => $user->barrio,
                'numero_hijos'         => $user->numero_hijos,
                'rh'                   => $user->rh,
                'fecha_nacimiento'     => $toDate($user->fecha_nacimiento),
                'lugar_nacimiento'     => $user->lugar_nacimiento,
                'eps'                  => $user->eps,
                'afp'                  => $user->fondo_pensiones,
                'talla_camisa'         => $user->talla_camisa,
                'talla_pantalon'       => $user->talla_pantalon,
                'talla_zapatos'        => $user->talla_zapatos,
                'emergencia_nombre'    => $user->contacto_emergencia_nombre,
                'emergencia_telefono'  => $user->contacto_emergencia_telefono,
                'emergencia_parentesco'=> $user->contacto_emergencia_parentesco,
                'direccion'            => $user->direccion_residencia,
            ]);
            if ($respuestaFields) {
                DB::table('respuestas_ingresos')->where('documento', $cedula)->update($respuestaFields);
            }

            // → base_ingresos (via candidato_id)
            $baseFields = $this->notNull([
                'correo'         => $email,
                'telefono'       => $movil,
                'salario_basico' => $user->ingresos,
            ]);
            if ($baseFields) {
                DB::table('base_ingresos')
                    ->whereIn('candidato_id', fn($q) => $q->select('id')->from('candidatos')->where('identificacion', $cedula))
                    ->update($baseFields);
            }
        } catch (\Exception $e) {
            Log::warning('EmpleadoSyncService::syncFromUser failed for cedula=' . ($user->cedula ?? '?') . ': ' . $e->getMessage());
        }
    }

    private function notNull(array $fields): array
    {
        return array_filter($fields, fn($v) => !is_null($v) && $v !== '');
    }
}
