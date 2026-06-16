<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('respuestas_ingresos', function (Blueprint $table) {
            $table->id();
            $table->string('documento', 40)->unique();
            $table->string('nombres', 200);
            $table->string('apellidos', 200);
            $table->date('fecha_nacimiento');
            $table->string('lugar_nacimiento', 200);
            $table->string('estado_civil', 50);
            $table->string('numero_hijos', 10);
            $table->string('rh', 10);
            $table->string('nivel_escolaridad', 100);
            $table->string('profesion', 150);
            $table->string('ciudad', 150);
            $table->string('barrio', 150);
            $table->string('direccion', 250);
            $table->string('estrato', 10);
            $table->string('correo', 180);
            $table->string('celular', 30);
            $table->string('emergencia_nombre', 200);
            $table->string('emergencia_telefono', 30);
            $table->string('emergencia_parentesco', 100);
            $table->string('eps', 150);
            $table->string('afp', 150);
            $table->string('talla_camisa', 20);
            $table->string('talla_pantalon', 20);
            $table->string('talla_zapatos', 20);
            $table->timestamps();
        });

        // Migrar datos existentes del JSON si existe
        $path = storage_path('app/respuestas_ingresos.json');
        if (file_exists($path)) {
            $rows = json_decode(file_get_contents($path), true) ?: [];
            $seen = [];
            foreach ($rows as $row) {
                $doc = $row['documento'] ?? null;
                if (!$doc || in_array($doc, $seen)) continue;
                $seen[] = $doc;
                DB::table('respuestas_ingresos')->insert([
                    'documento'               => $doc,
                    'nombres'                 => $row['nombres']                 ?? '',
                    'apellidos'               => $row['apellidos']               ?? '',
                    'fecha_nacimiento'        => $row['fecha_nacimiento']        ?? now()->toDateString(),
                    'lugar_nacimiento'        => $row['lugar_nacimiento']        ?? '',
                    'estado_civil'            => $row['estado_civil']            ?? '',
                    'numero_hijos'            => $row['numero_hijos']            ?? '0',
                    'rh'                      => $row['rh']                      ?? '',
                    'nivel_escolaridad'       => $row['nivel_escolaridad']       ?? '',
                    'profesion'               => $row['profesion']               ?? '',
                    'ciudad'                  => $row['ciudad']                  ?? '',
                    'barrio'                  => $row['barrio']                  ?? '',
                    'direccion'               => $row['direccion']               ?? '',
                    'estrato'                 => $row['estrato']                 ?? '',
                    'correo'                  => $row['correo']                  ?? '',
                    'celular'                 => $row['celular']                 ?? '',
                    'emergencia_nombre'       => $row['emergencia_nombre']       ?? '',
                    'emergencia_telefono'     => $row['emergencia_telefono']     ?? '',
                    'emergencia_parentesco'   => $row['emergencia_parentesco']   ?? '',
                    'eps'                     => $row['eps']                     ?? '',
                    'afp'                     => $row['afp']                     ?? '',
                    'talla_camisa'            => $row['talla_camisa']            ?? '',
                    'talla_pantalon'          => $row['talla_pantalon']          ?? '',
                    'talla_zapatos'           => $row['talla_zapatos']           ?? '',
                    'created_at'              => $row['created_at']              ?? now(),
                    'updated_at'              => $row['created_at']              ?? now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('respuestas_ingresos');
    }
};
