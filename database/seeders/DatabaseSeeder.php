<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Empresas primero (los empleados referencian empresa_id)
        $this->call(EmpresasSeeder::class);

        // 2. Sedes (empleados la usan para lookup de sede)
        $this->call(SedesSeeder::class);

        // 3. Catálogos de referencia (cargos, eps, rh, bancos, etc.)
        $this->call(CatalogsSeeder::class);

        // 4. Empleados (usa todos los catálogos anteriores para los lookups)
        $this->call(EmpleadosSeeder::class);

        // 5. Contratos vinculados a esos empleados
        $this->call(ContratosSeeder::class);

        // 6. Proyectos ya están en su propia migración con seed inline
        // 7. Requisiciones de selección
        $this->call(RequisicionesSeeder::class);

    }
}
