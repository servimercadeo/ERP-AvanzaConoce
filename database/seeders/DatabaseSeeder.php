<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Empresas primero (los empleados referencian empresa_id)
        $this->call(EmpresasSeeder::class);

        // 2. Empleados
        $this->call(EmpleadosSeeder::class);

        // 3. Contratos vinculados a esos empleados
        $this->call(ContratosSeeder::class);
    }
}
