<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Acta de traslado de inventario</title>
    <style>
        @page { margin: 90px 36px 50px 36px; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10.5px; color: #1a1a1a; }

        header { position: fixed; top: -70px; left: 0; right: 0; height: 70px; }
        .brand-bar { background: #0b2540; color: #ffffff; padding: 10px 14px; font-weight: bold; font-size: 13px; letter-spacing: 0.04em; }
        .accent-line { height: 3px; background: #e8792c; }

        footer { position: fixed; bottom: -40px; left: 0; right: 0; font-size: 8px; color: #888; text-align: center; }
        .page-num { position: fixed; top: -85px; right: 0; font-size: 10px; font-weight: bold; }

        .titles { margin-top: 6px; margin-bottom: 10px; }
        .titles h1 { font-size: 12px; margin: 0 0 2px; text-transform: uppercase; }
        .titles h2 { font-size: 12px; margin: 0; text-transform: uppercase; }

        .meta-row { width: 100%; margin-bottom: 8px; font-size: 10px; }
        .meta-row td { padding: 2px 0; }

        table.box { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.box th, table.box td { border: 1px solid #444; padding: 5px 6px; font-size: 9.5px; text-align: left; }
        table.box th { background: #eef2f6; font-weight: bold; text-transform: uppercase; font-size: 8.5px; }

        table.items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.items th, table.items td { border: 1px solid #444; padding: 5px 6px; font-size: 9.5px; }
        table.items th { background: #eef2f6; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 8.5px; }
        table.items td.cantidad { text-align: center; width: 80px; }

        .manifiesta { font-size: 9.5px; margin: 14px 0 6px; text-align: justify; }

        .firmas { width: 100%; margin-top: 40px; }
        .firmas td { width: 50%; font-size: 10px; vertical-align: top; padding-right: 20px; }
        .firmas .label { font-weight: bold; margin-bottom: 30px; }
        .firmas .linea { border-top: 1px solid #444; width: 220px; margin-bottom: 6px; }
        .firmas .dato { margin-bottom: 2px; }
    </style>
</head>
<body>
    <header>
        <div class="brand-bar">{{ $empresa }}</div>
        <div class="accent-line"></div>
    </header>
    <div class="page-num">1</div>

    <footer>
        Documento generado autom&aacute;ticamente por el sistema el {{ $generadoEl }}.
    </footer>

    <table class="titles" width="100%">
        <tr>
            <td width="100%">
                <h1>Pedidos y Compras</h1>
                <h2>Formato Acta de Traslado de Inventario</h2>
            </td>
        </tr>
    </table>

    <table class="meta-row" width="100%">
        <tr>
            <td><strong>Traslado N&uacute;mero:</strong> {{ $trasladoNumero }} &nbsp;&nbsp;
                <strong>Pedido asociado:</strong> {{ $pedidoCodigo }}</td>
        </tr>
    </table>

    <table class="box">
        <tr>
            <th width="20%">Fecha de traslado</th>
            <th width="40%">Sede origen (de d&oacute;nde sale)</th>
            <th width="40%">Sede destino (a d&oacute;nde llega)</th>
        </tr>
        <tr>
            <td>{{ $fechaTraslado }}</td>
            <td>{{ $sedeOrigen }}</td>
            <td>{{ $sedeDestino }}</td>
        </tr>
        <tr>
            <th width="50%" colspan="2">Solicitado por</th>
            <th width="50%">Pedido para</th>
        </tr>
        <tr>
            <td colspan="2">{{ $solicitadoPor }}</td>
            <td>{{ $responsablePide }}</td>
        </tr>
    </table>

    <table class="items">
        <tr>
            <th>Producto</th>
            <th>Categor&iacute;a</th>
            @if($seriales ?? null)
                <th>Serial</th>
            @endif
            <th class="cantidad">Cantidad</th>
        </tr>
        <tr>
            <td>{{ $producto }}</td>
            <td>{{ $categoria ?? '—' }}</td>
            @if($seriales ?? null)
                <td>{{ $seriales }}</td>
            @endif
            <td class="cantidad">{{ $cantidad }}</td>
        </tr>
    </table>

    <p class="manifiesta">
        Este traslado se realiza porque la sede que pidi&oacute; el producto no ten&iacute;a existencias
        suficientes; se traslada desde la sede de origen indicada arriba, que s&iacute; contaba con stock
        disponible al momento de la revisi&oacute;n. El movimiento de inventario queda registrado en el
        sistema en la fecha indicada.
    </p>

    <table class="firmas">
        <tr>
            <td>
                <div class="label">ENTREGA (Sede Origen):</div>
                <div class="linea"></div>
                <div class="dato">Nombre / Cargo:</div>
            </td>
            <td>
                <div class="label">RECIBE (Sede Destino):</div>
                <div class="linea"></div>
                <div class="dato">Nombre / Cargo:</div>
            </td>
        </tr>
    </table>
</body>
</html>
