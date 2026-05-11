<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContratoAnexo extends Model
{
    use HasFactory;

    protected $table = 'contrato_anexos';

    protected $fillable = [
        'contrato_id',
        'anexo_auxilio',
        'valor',
        'fecha_entrega_firma',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'fecha_entrega_firma' => 'date',
    ];

    public function contrato()
    {
        return $this->belongsTo(Contrato::class);
    }
}
