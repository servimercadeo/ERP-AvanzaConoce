<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Catálogo de "Anexo / Auxilio" del contrato (Parámetros > Anexos y Auxilios). */
class AnexoAuxilio extends Model
{
    protected $table = 'anexos_auxilios';

    protected $fillable = ['nombre'];
}
