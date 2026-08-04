<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillSedeCiudadCommand extends Command
{
    protected $signature = 'sedes:backfill-ciudad {--apply : Aplica los cambios; sin esta bandera solo se muestra un reporte}';

    protected $description = 'Asigna id_ciudad a las sedes que no la tienen, detectando el nombre de la ciudad dentro del nombre de la sede';

    // Ciudades cuyo nombre real en el catálogo no coincide con como se nombran
    // coloquialmente en el nombre de la sede (ej. Bogotá está guardada como
    // "SANTA FE DE BOGOTA"). Se buscan por el id exacto en la tabla `ciudades`.
    private const ALIAS_CIUDAD_ID = [
        'BOGOTA' => 149, // SANTA FE DE BOGOTA
        'TOLU'   => 954, // Santiago de tolú
    ];

    private function normalizar(string $value): string
    {
        $value = mb_strtoupper(trim($value), 'UTF-8');
        $value = str_replace(
            ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ'],
            ['A', 'E', 'I', 'O', 'U', 'N'],
            $value
        );
        return $value;
    }

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $ciudadesRaw = DB::table('ciudades')->select('id', 'nombre')->get()
            ->map(fn ($c) => ['id' => $c->id, 'nombre' => $c->nombre, 'norm' => $this->normalizar($c->nombre)]);

        // Nombres duplicados en el catálogo (mismo nombre, distinto departamento):
        // no se puede elegir automáticamente sin arriesgar el departamento/flete
        // equivocado, así que se excluyen de la búsqueda y quedan para revisión manual.
        $conteoPorNombre = $ciudadesRaw->groupBy('norm')->map->count();
        $duplicados = $conteoPorNombre->filter(fn ($n) => $n > 1)->keys();

        $ciudades = $ciudadesRaw
            ->filter(fn ($c) => mb_strlen($c['norm']) >= 4 && !$duplicados->contains($c['norm']))
            ->values();

        $aliasCiudades = collect(self::ALIAS_CIUDAD_ID)->map(function ($id, $clave) {
            $c = DB::table('ciudades')->where('id', $id)->first();
            return ['id' => $id, 'nombre' => $c->nombre, 'norm' => $clave];
        })->values();

        $sedes = DB::table('sedes')->whereNull('id_ciudad')->select('id', 'nombre')->get();

        $asignadas = 0;
        $ambiguas = [];
        $sinMatch = [];
        $duplicadasEnNombre = [];

        foreach ($sedes as $sede) {
            $nombreNorm = $this->normalizar($sede->nombre);

            // Los alias (Bogotá, Tolú) tienen prioridad si aparecen.
            $match = $aliasCiudades->first(function ($c) use ($nombreNorm) {
                return (bool) preg_match('/\b' . preg_quote($c['norm'], '/') . '\b/u', $nombreNorm);
            });

            $candidatos = $ciudades->filter(function ($c) use ($nombreNorm) {
                return (bool) preg_match('/\b' . preg_quote($c['norm'], '/') . '\b/u', $nombreNorm);
            })->map(function ($c) use ($nombreNorm) {
                $c['pos'] = mb_strpos($nombreNorm, $c['norm']);
                return $c;
            })->values();

            // También se avisa si el nombre de la sede menciona una ciudad
            // duplicada en el catálogo (no se puede resolver sola).
            foreach ($ciudadesRaw->filter(fn ($c) => $duplicados->contains($c['norm'])) as $c) {
                if (preg_match('/\b' . preg_quote($c['norm'], '/') . '\b/u', $nombreNorm)) {
                    $duplicadasEnNombre[] = "{$sede->nombre} -> menciona \"{$c['nombre']}\", que está duplicada en el catálogo (varios departamentos); no se asignó automáticamente.";
                }
            }

            if (!$match) {
                if ($candidatos->isEmpty()) {
                    $sinMatch[] = $sede->nombre;
                    continue;
                }
                // Entre varias coincidencias no-alias, se prefiere la que aparece
                // primero en el nombre (convención: "TIGO EXPRESS <CIUDAD> <dirección>").
                $match = $candidatos->sortBy('pos')->first();

                if ($candidatos->count() > 1) {
                    $otros = $candidatos->reject(fn ($c) => $c['id'] === $match['id'])->pluck('nombre')->implode(', ');
                    $ambiguas[] = "{$sede->nombre} -> elegido: {$match['nombre']} (también coincidía con: {$otros})";
                }
            }

            $this->line("{$sede->nombre} -> {$match['nombre']}");

            if ($apply) {
                DB::table('sedes')->where('id', $sede->id)->update(['id_ciudad' => $match['id']]);
            }

            $asignadas++;
        }

        if ($duplicadasEnNombre) {
            $this->newLine();
            $this->warn('Sedes que mencionan una ciudad duplicada en el catálogo:');
            foreach (array_unique($duplicadasEnNombre) as $d) {
                $this->line("  - {$d}");
            }
        }

        $this->newLine();
        $this->info("Sedes con coincidencia: {$asignadas}" . ($apply ? ' (aplicado)' : ' (modo reporte, no se guardó nada — usa --apply)'));
        $this->warn('Sedes sin ninguna coincidencia (' . count($sinMatch) . '):');
        foreach ($sinMatch as $n) {
            $this->line("  - {$n}");
        }
        if ($ambiguas) {
            $this->warn('Sedes con más de una coincidencia posible (revisar manualmente):');
            foreach ($ambiguas as $a) {
                $this->line("  - {$a}");
            }
        }

        return self::SUCCESS;
    }
}
