<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear empleados (en tabla users con todos sus campos)
        $this->call(EmpleadosSeeder::class);

        // 2. Crear contratos vinculados a esos empleados
        $this->call(ContratosSeeder::class);
    }
}
