<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Seguro: los tests usan RefreshDatabase (migrate:fresh). Si por cualquier motivo la
     * conexión apuntara a una base real, esto aborta antes de que se borre nada.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $database = (string) config('database.connections.' . config('database.default') . '.database');

        if (!str_ends_with($database, '_test')) {
            $this->fail("Los tests solo pueden correr contra una base que termine en '_test' (actual: '{$database}').");
        }
    }
}
