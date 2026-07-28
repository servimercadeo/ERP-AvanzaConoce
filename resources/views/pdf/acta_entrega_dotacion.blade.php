<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Acta de entrega de elementos</title>
    <style>
        @page { margin: 90px 36px 50px 36px; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10.5px; color: #1a1a1a; }

        header { position: fixed; top: -70px; left: 0; right: 0; height: 70px; }
        .brand-bar { background: #0b2540; color: #ffffff; padding: 10px 14px; font-weight: bold; font-size: 13px; letter-spacing: 0.04em; }
        .brand-bar .sub { font-weight: normal; font-size: 8.5px; color: #cfd8e3; }
        .accent-line { height: 3px; background: #e8792c; }

        footer { position: fixed; bottom: -40px; left: 0; right: 0; font-size: 8px; color: #888; text-align: center; }

        .page-num { position: fixed; top: -85px; right: 0; font-size: 10px; font-weight: bold; }

        .titles { margin-top: 6px; margin-bottom: 10px; }
        .titles td { padding: 0; }
        .titles h1 { font-size: 12px; margin: 0 0 2px; text-transform: uppercase; }
        .titles h2 { font-size: 12px; margin: 0; text-transform: uppercase; }
        .vigencia { font-size: 9px; text-align: right; }

        .meta-row { width: 100%; margin-bottom: 8px; font-size: 10px; }
        .meta-row td { padding: 2px 0; }

        table.box { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.box th, table.box td { border: 1px solid #444; padding: 5px 6px; font-size: 9.5px; text-align: left; }
        table.box th { background: #eef2f6; font-weight: bold; text-transform: uppercase; font-size: 8.5px; }

        .observaciones { margin-bottom: 10px; }
        .observaciones .label { font-weight: bold; font-size: 10px; margin-bottom: 3px; }
        .observaciones .valor { min-height: 16px; font-size: 9.5px; }

        table.items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.items th, table.items td { border: 1px solid #444; padding: 5px 6px; font-size: 9.5px; }
        table.items th { background: #eef2f6; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 8.5px; }
        table.items td.item { text-align: center; width: 30px; }
        table.items td.cantidad { text-align: center; width: 60px; }
        table.items td.tipo { text-align: center; width: 90px; }

        .manifiesta { font-weight: bold; font-size: 10px; margin: 14px 0 6px; }
        ul.condiciones { margin: 0 0 18px; padding-left: 16px; }
        ul.condiciones li { font-size: 9px; line-height: 1.5; margin-bottom: 5px; text-align: justify; }

        .firma { margin-top: 30px; font-size: 10px; }
        .firma .label { font-weight: bold; margin-bottom: 30px; }
        .firma .linea { border-top: 1px solid #444; width: 260px; margin-bottom: 6px; }
        .firma .dato { margin-bottom: 2px; }
    </style>
</head>
<body>
    <header>
        <div class="brand-bar">
            {{ $empresa }}
        </div>
        <div class="accent-line"></div>
    </header>
    <div class="page-num">1</div>

    <footer>
        Documento generado autom&aacute;ticamente por el sistema el {{ $generadoEl }}.
    </footer>

    <table class="titles" width="100%">
        <tr>
            <td width="80%">
                <h1>Gesti&oacute;n Log&iacute;stica y Almacenamiento</h1>
                <h2>Formato Acta de Entrega de Elementos</h2>
            </td>
            <td width="20%" class="vigencia">Vigencia:</td>
        </tr>
    </table>

    <table class="meta-row" width="100%">
        <tr>
            <td width="50%"><strong>Entrega N&uacute;mero:</strong> {{ $entregaNumero }}</td>
            <td width="50%"><strong>Creado por:</strong> {{ $creadoPor }}</td>
        </tr>
    </table>

    <table class="box">
        <tr>
            <th width="18%">Fecha de registro</th>
            <th width="18%">Fecha de entrega</th>
            <th width="24%">Ciudad / Sede Origen</th>
            <th width="40%">Empleado</th>
        </tr>
        <tr>
            <td>{{ $fechaRegistro }}</td>
            <td>{{ $fechaEntrega }}</td>
            <td>{{ $sede }}</td>
            <td>{{ $empleadoNombre }}</td>
        </tr>
    </table>

    <div class="observaciones">
        <div class="label">Observaciones:</div>
        <div class="valor">{{ $observaciones ?: '—' }}</div>
    </div>

    <table class="items">
        <tr>
            <th class="item">Item</th>
            <th>Producto</th>
            <th class="tipo">Tipo</th>
            <th class="cantidad">Cantidad</th>
        </tr>
        @foreach ($items as $i => $it)
            <tr>
                <td class="item">{{ $i + 1 }}</td>
                <td>{{ $it['producto'] }}</td>
                <td class="tipo">{{ $it['tipo'] }}</td>
                <td class="cantidad">{{ $it['cantidad'] }}</td>
            </tr>
        @endforeach
        @for ($i = count($items); $i < max(count($items), 6); $i++)
            <tr>
                <td class="item">{{ $i + 1 }}</td>
                <td>&nbsp;</td>
                <td class="tipo">&nbsp;</td>
                <td class="cantidad">&nbsp;</td>
            </tr>
        @endfor
    </table>

    <div class="manifiesta">El trabajador manifiesta que:</div>
    <ul class="condiciones">
        <li>El inventario que aqu&iacute; se entrega es y ser&aacute; de la empresa en todo momento.</li>
        <li>El inventario ser&aacute; de uso exclusivo para el ejercicio de sus funciones como trabajador de la Empresa {{ $empresa }}.</li>
        <li>En caso de terminaci&oacute;n del contrato de trabajo o la entrega de una nueva dotaci&oacute;n, se compromete a hacer la devoluci&oacute;n de la dotaci&oacute;n y materiales si la empresa se lo solicita. En caso de da&ntilde;o de la dotaci&oacute;n o inventarios o parte de ella por cualquier causa que fuere, se compromete a devolverla a la empresa.</li>
        <li>Autoriza expresamente a la empresa {{ $empresa }} mediante este documento a descontar en forma inmediata de sus salarios y liquidaci&oacute;n de prestaciones sociales los valores de la dotaci&oacute;n o inventarios cuando en cualquiera de los casos anteriores no la devuelva al empleador.</li>
        <li>En caso de hurto, extrav&iacute;o o da&ntilde;o diferente al producido por el uso normal y transcurrir del tiempo, asumir&aacute; el valor de la misma y en consecuencia autoriza expresamente a la Empresa {{ $empresa }} mediante este documento para que realice el descuento respectivo en forma inmediata de sus salarios y liquidaci&oacute;n de prestaciones sociales.</li>
        <li>Se compromete a mantener en buen estado y dar un uso adecuado a los elementos entregados como dotaci&oacute;n e inventario.</li>
    </ul>

    <div class="firma">
        <div class="label">RECIBIDO POR:</div>
        <div class="linea"></div>
        <div class="dato">Nombre: {{ $empleadoNombre }}</div>
        <div class="dato">C&eacute;dula: {{ $empleadoCedula }}</div>
    </div>
</body>
</html>
