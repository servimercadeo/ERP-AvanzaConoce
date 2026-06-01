<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CandidatoDocumento extends Model
{
    protected $table = 'candidato_documentos';

    protected $fillable = ['candidato_id', 'nombre', 'ruta', 'nombre_original'];

    public function candidato()
    {
        return $this->belongsTo(Candidato::class);
    }
}
