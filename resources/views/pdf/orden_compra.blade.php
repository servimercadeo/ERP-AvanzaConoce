<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden de compra</title>
    <style>
        @page { margin: 30px 30px 40px 30px; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1a1a1a; }

        .header-empresa { text-align: right; font-size: 11px; font-weight: bold; margin-bottom: 2px; }
        .header-nit { text-align: right; font-size: 9px; margin-bottom: 2px; }
        .header-orden { text-align: right; font-size: 11px; font-weight: bold; margin-bottom: 10px; }

        table.datos { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.datos td { border: 1px solid #888; padding: 4px 8px; font-size: 9.5px; vertical-align: top; }
        table.datos td.label { font-weight: bold; width: 110px; background: #f5f5f5; }

        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.items th { background: #eef2f6; border: 1px solid #888; padding: 5px 6px; font-size: 8.5px; font-weight: bold; text-transform: uppercase; text-align: center; }
        table.items td { border: 1px solid #888; padding: 4px 6px; font-size: 9px; }
        table.items td.num { text-align: center; width: 24px; }
        table.items td.cant, table.items td.talla, table.items td.unidad { text-align: center; }
        table.items td.precio, table.items td.subtotal { text-align: right; }
        tr.grupo-ciudad td { background: #dcdcdc; text-align: center; font-size: 9px; padding: 6px; }
        tr.grupo-ciudad .ciudad-nombre { font-weight: bold; }

        table.totales { width: 100%; border-collapse: collapse; margin-top: 0; }
        table.totales td { border: 1px solid #888; padding: 6px 10px; font-size: 9.5px; vertical-align: middle; }
        table.totales td.encabezado { background: #dcdcdc; font-weight: bold; text-align: center; }
        table.totales td.valor { text-align: right; font-weight: bold; }
        table.totales td.letras { background: #dcdcdc; font-weight: bold; }

        table.firmas { width: 100%; border-collapse: collapse; margin-top: 20px; }
        table.firmas td { border: 1px solid #888; padding: 22px 10px 8px; font-size: 9px; }
    </style>
</head>
<body>
    <div class="header-empresa">SERVIMERCADEO</div>
    <div class="header-nit">NIT: 800.084.227-7 REGIMEN: COMUN</div>
    <div class="header-orden">ORDEN DE COMPRA No: {{ $ordenNumero }}</div>

    <table class="datos">
        <tr>
            <td class="label">DIRECCIÓN</td>
            <td>CRA 12 NO. 3 - 49</td>
            <td class="label">FECHA ORDEN :</td>
            <td>{{ $fechaOrden }}</td>
        </tr>
        <tr>
            <td class="label">TELÉFONO</td>
            <td>3401222</td>
            <td class="label">CIUDAD :</td>
            <td>{{ $ciudad }}</td>
        </tr>
    </table>

    <table class="datos">
        <tr>
            <td class="label">SEÑORES</td>
            <td>{{ $proveedorNombre }}</td>
            <td class="label">FECHA DE ENTREGA:</td>
            <td>{{ $fechaEntrega }}</td>
        </tr>
        <tr>
            <td class="label">NIT</td>
            <td colspan="3">{{ $proveedorNit }}</td>
        </tr>
    </table>

    <table class="items">
        <tr>
            <th style="width:24px;">ITEM</th>
            <th>PRODUCTO</th>
            <th style="width:80px;">EMPRESA</th>
            <th>UNIDAD DE MEDIDA</th>
            <th style="width:40px;">TALLA</th>
            <th style="width:70px;">CANTIDAD ORDENADA</th>
            <th style="width:70px;">PRECIO SIN IVA</th>
            <th style="width:75px;">SUBTOTAL</th>
        </tr>
        @foreach ($grupos as $grupo)
            <tr class="grupo-ciudad">
                <td colspan="8">
                    Productos de la ciudad: <span class="ciudad-nombre">{{ $grupo['ciudad'] }}</span><br>
                    Direccion: <strong>{{ $grupo['direccion'] }}</strong> Telefono: <strong>{{ $grupo['telefono'] }}</strong>
                </td>
            </tr>
            @foreach ($grupo['items'] as $it)
                <tr>
                    <td class="num">{{ $it['num'] }}</td>
                    <td>{{ $it['producto'] }}</td>
                    <td style="text-align:center;">{{ $it['empresa'] ?? '—' }}</td>
                    <td class="unidad">UNIDADES</td>
                    <td class="talla">NA</td>
                    <td class="cant">{{ $it['cantidad'] }}</td>
                    <td class="precio">${{ number_format($it['precio_unitario'], 0, ',', '.') }}</td>
                    <td class="subtotal">${{ number_format($it['subtotal'], 0, ',', '.') }}</td>
                </tr>
            @endforeach
        @endforeach
    </table>

    <table class="totales">
        <tr>
            <td class="encabezado" style="width:35%;">OBSERVACIONES DE ORDEN</td>
            <td class="encabezado" style="width:20%;">SUBTOTAL</td>
            <td class="valor" style="width:20%;">${{ number_format($subtotal, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td rowspan="3" style="vertical-align: top;">OBSERVACIONES: {{ $observaciones ?: '—' }}</td>
            <td class="encabezado">IVA</td>
            <td class="valor">${{ number_format($iva, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="encabezado">VALOR TRANSPORTE</td>
            <td class="valor">${{ number_format($transporte, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="encabezado" style="font-size: 11px;">TOTAL</td>
            <td class="valor" style="font-size: 11px;">${{ number_format($total, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="letras" colspan="3">VALOR TOTAL EN LETRAS: {{ $totalEnLetras }}</td>
        </tr>
    </table>

    <table class="firmas">
        <tr>
            <td style="width:34%;">FIRMA Y SELLO DEL COMPRADOR</td>
            <td style="width:33%;"></td>
            <td style="width:33%;"></td>
        </tr>
    </table>
</body>
</html>
