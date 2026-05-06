<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // ── INFORMACIÓN GENERAL ────────────────────────────────────────
            $table->string('cedula', 20)->nullable()->unique()->after('id');
            $table->string('apellidos', 100)->nullable()->after('cedula');
            $table->string('nombres', 100)->nullable()->after('apellidos');
            $table->string('fotografia', 255)->nullable()->after('nombres');

            $table->string('sede', 100)->nullable()->after('fotografia');
            $table->date('fecha_nacimiento')->nullable()->after('sede');
            $table->string('lugar_nacimiento', 100)->nullable()->after('fecha_nacimiento');
            $table->string('raza', 50)->nullable()->after('lugar_nacimiento');

            $table->string('genero', 30)->nullable()->after('raza');
            $table->string('estado_civil', 30)->nullable()->after('genero');
            $table->string('nivel_escolaridad', 50)->nullable()->after('estado_civil');
            // email ya existe en la tabla users
            $table->string('direccion_residencia', 200)->nullable()->after('nivel_escolaridad');
            $table->string('movil', 20)->nullable()->after('direccion_residencia');
            $table->string('estrato', 5)->nullable()->after('movil');
            $table->string('barrio', 100)->nullable()->after('estrato');
            $table->unsignedTinyInteger('numero_hijos')->nullable()->after('barrio');
            $table->decimal('ingresos', 12, 2)->nullable()->after('numero_hijos');

            $table->text('observaciones_medicas')->nullable()->after('ingresos');
            $table->text('alergias')->nullable()->after('observaciones_medicas');

            // ── SEGURIDAD SOCIAL ───────────────────────────────────────────
            $table->string('rh', 5)->nullable()->after('alergias');
            $table->string('eps', 100)->nullable()->after('rh');
            $table->string('arl', 100)->nullable()->after('eps');
            $table->string('fondo_pensiones', 100)->nullable()->after('arl');
            $table->string('caja_compensacion', 100)->nullable()->after('fondo_pensiones');

            // ── LICENCIAS Y CERTIFICACIONES ────────────────────────────────
            $table->string('licencia_carro', 50)->nullable()->after('caja_compensacion');
            $table->date('licencia_carro_vence')->nullable()->after('licencia_carro');
            $table->string('licencia_moto', 50)->nullable()->after('licencia_carro_vence');
            $table->date('licencia_moto_vence')->nullable()->after('licencia_moto');
            $table->boolean('tiene_cert_alturas')->nullable()->after('licencia_moto_vence');
            $table->date('cert_alturas_vence')->nullable()->after('tiene_cert_alturas');

            // ── ESTADO Y OTROS ─────────────────────────────────────────────
            $table->string('estado_empleado', 30)->default('Activo')->after('cert_alturas_vence');
            $table->string('codigo_directv', 50)->nullable()->after('estado_empleado');
            $table->string('empresa', 150)->nullable()->after('codigo_directv');
            $table->text('comentarios')->nullable()->after('empresa');

            // ── INFORMACIÓN ADICIONAL (segunda pestaña) ────────────────────
            $table->string('cargo', 100)->nullable()->after('comentarios');
            $table->string('tipo_funcionario', 80)->nullable()->after('cargo');
            $table->string('tipo_vinculacion', 30)->nullable()->after('tipo_funcionario');
            $table->string('cuenta_bancaria', 30)->nullable()->after('tipo_vinculacion');
            $table->string('tipo_cuenta', 30)->nullable()->after('cuenta_bancaria');
            $table->string('banco', 100)->nullable()->after('tipo_cuenta');

            // ── CONTACTO EN CASO DE EMERGENCIA ─────────────────────────────
            $table->string('contacto_emergencia_nombre', 150)->nullable()->after('banco');
            $table->string('contacto_emergencia_telefono', 20)->nullable()->after('contacto_emergencia_nombre');
            $table->string('contacto_emergencia_parentesco', 80)->nullable()->after('contacto_emergencia_telefono');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'cedula', 'apellidos', 'nombres', 'fotografia',
                'sede', 'fecha_nacimiento', 'lugar_nacimiento', 'raza',
                'genero', 'estado_civil', 'nivel_escolaridad', 'direccion_residencia',
                'movil', 'estrato', 'barrio', 'numero_hijos', 'ingresos',
                'observaciones_medicas', 'alergias',
                'rh', 'eps', 'arl', 'fondo_pensiones', 'caja_compensacion',
                'licencia_carro', 'licencia_carro_vence',
                'licencia_moto', 'licencia_moto_vence',
                'tiene_cert_alturas', 'cert_alturas_vence',
                'estado_empleado', 'codigo_directv', 'empresa', 'comentarios',
                'cargo', 'tipo_funcionario', 'tipo_vinculacion',
                'cuenta_bancaria', 'tipo_cuenta', 'banco',
                'contacto_emergencia_nombre', 'contacto_emergencia_telefono', 'contacto_emergencia_parentesco',
            ]);
        });
    }
};
