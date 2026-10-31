<?php

namespace App\Models;

use App\Models\Concerns\HasSedeCatalogo;
use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PedidoCompra extends Model
{
    use HasSedeCatalogo;
    use RegistraAuditoria;

    protected $table = 'pedidos_compra';

    public function auditoriaProceso(): string
    {
        return 'Pedidos';
    }

    /**
     * Aliado del usuario si es un aliado (el usuario de un aliado empresa o un técnico de
     * aliado, empresa o indirecto): sus pedidos son a nombre de ese aliado. Null para el resto.
     */
    public static function aliadoDe(?User $user): ?Aliado
    {
        if (!$user) {
            return null;
        }
        if ($user->rol === \App\Services\UsuarioAliadoEmpresa::ROL) {
            return $user->aliadoEmpresa;
        }
        return $user->aliado_id ? $user->aliado : null;
    }

    /**
     * Pedidos que este usuario ve: el aliado empresa, los de su aliado (también los que
     * crearon sus técnicos); un técnico de aliado, solo los que él registró; el resto, todos.
     */
    public static function visiblesPara(?User $user)
    {
        $query = static::query();
        if ($user?->rol === \App\Services\UsuarioAliadoEmpresa::ROL) {
            $query->where('aliado_id', $user->aliadoEmpresa?->id ?? 0);
        } elseif ($user?->aliado_id) {
            $query->where('registrado_por_id', $user->id);
        }
        return $query;
    }

    protected $fillable = [
        'codigo',
        'fecha_registro',
        'tipo_responsable',
        'responsable',
        'empresa_id',
        'sede',
        'sede_id',
        'clase',
        'concepto',
        'estado',
        'estado_compra',
        'registra',
        'registrado_por_id',
        'aliado_id',
        'asignado_a_user_id',
    ];

    protected $casts = [
        'fecha_registro' => 'date:Y-m-d',
    ];

    public function items()
    {
        return $this->hasMany(PedidoCompraItem::class);
    }

    public function asignadoA()
    {
        return $this->belongsTo(User::class, 'asignado_a_user_id');
    }

    /**
     * Empresa del EMPLEADO para quien se creó el pedido (resuelta y guardada una sola
     * vez al crear el pedido, ver PedidoCompraController::store()) — snapshot, no una
     * relación en vivo: si el empleado cambia de empresa después, este pedido histórico
     * no debe cambiar. De aquí sale la trazabilidad hacia la Orden de Compra y el Acta
     * de Entrega.
     */
    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public static function generarCodigo(): string
    {
        $max = DB::table('pedidos_compra')
            ->selectRaw('MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)) as max_c')
            ->value('max_c') ?? 0;

        return 'PED-' . str_pad((string) ((int) $max + 1), 3, '0', STR_PAD_LEFT);
    }
}
