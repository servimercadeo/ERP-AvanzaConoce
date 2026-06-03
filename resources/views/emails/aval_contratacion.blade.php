<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aval de Contratación</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #fff; margin: 0; padding: 20px; }
  .greeting { margin-bottom: 18px; line-height: 1.6; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th { background: #c0392b; color: #fff; text-align: center; padding: 6px 5px; font-size: 10px; white-space: nowrap; }
  td { border: 1px solid #ccc; padding: 5px 6px; text-align: center; white-space: nowrap; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .footer { margin-top: 24px; font-size: 12px; color: #555; }
</style>
</head>
<body>

<p class="greeting">
  Buenos días,<br><br>
  Espero que estés muy bien, agradezco tu colaboración con la gestión de esta contratación
  @if($baseIngreso?->fecha_programacion_ingreso)
    con fecha tentativa de ingreso {{ \Carbon\Carbon::parse($baseIngreso->fecha_programacion_ingreso)->format('d/m/Y') }}.
  @else
    .
  @endif
</p>

<table>
  <thead>
    <tr>
      <th>FECHA</th>
      <th>NÚMERO DE DOCUMENTO DE IDENTIFICACIÓN</th>
      <th>NOMBRE COMPLETO</th>
      <th>CARGO</th>
      <th>CIUDAD</th>
      <th>EMPRESA</th>
      <th>PROYECTO</th>
      <th>TELÉFONO DE CONTACTO</th>
      <th>CORREO ELECTRÓNICO</th>
      <th>TIPO DE INGRESO</th>
      <th>LUGAR DE TRABAJO</th>
      <th>LÍDER INMEDIATO</th>
      <th>EMPLEADOR</th>
      <th>FECHA PROGRAMACIÓN INGRESO</th>
      <th>FECHA DE CORRECCIÓN</th>
      <th>TASA DE RIESGO ARL</th>
      <th>SALARIO BÁSICO</th>
      <th>AUXILIO DE TRANSPORTE</th>
      <th>OTROS VARIABLE</th>
      <th>AUXILIO EXT. DE RODAMIENTO</th>
      <th>AUXILIO EXT. DE COMUNICACIÓN</th>
      <th>AUXILIO EXT. DE ALIMENTACIÓN</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      {{-- Fecha aval --}}
      <td>{{ $candidato->fecha_aval ? \Carbon\Carbon::parse($candidato->fecha_aval)->format('d/m/Y') : now()->format('d/m/Y') }}</td>
      {{-- Identificación --}}
      <td>{{ $candidato->identificacion }}</td>
      {{-- Nombre --}}
      <td>{{ $candidato->nombres }}</td>
      {{-- Cargo --}}
      <td>{{ $candidato->requisicion?->cargo?->nombre ?? '-' }}</td>
      {{-- Ciudad --}}
      <td>{{ $candidato->ciudad?->nombre ?? '-' }}</td>
      {{-- Empresa --}}
      <td>{{ $candidato->requisicion?->empresa?->nombre ?? '-' }}</td>
      {{-- Proyecto --}}
      <td>{{ $candidato->requisicion?->proyecto?->nombre ?? '-' }}</td>
      {{-- Teléfono --}}
      <td>{{ $candidato->celular ?? '-' }}</td>
      {{-- Correo --}}
      <td>{{ $candidato->correo ?? '-' }}</td>
      {{-- Tipo de ingreso / vinculación --}}
      <td>{{ $baseIngreso?->tipo_vinculacion ?? $candidato->tipo_vinculacion ?? '-' }}</td>
      {{-- Lugar de trabajo / Sede --}}
      <td>{{ $baseIngreso?->lugar_trabajo ?? '-' }}</td>
      {{-- Líder inmediato --}}
      <td>{{ $baseIngreso?->lider_inmediato ?? '-' }}</td>
      {{-- Empleador --}}
      <td>{{ $baseIngreso?->empleador ?? '-' }}</td>
      {{-- Fecha programación ingreso --}}
      <td>{{ $baseIngreso?->fecha_programacion_ingreso ? \Carbon\Carbon::parse($baseIngreso->fecha_programacion_ingreso)->format('d/m/Y') : '-' }}</td>
      {{-- Fecha corrección --}}
      <td>{{ $baseIngreso?->fecha_correccion ? \Carbon\Carbon::parse($baseIngreso->fecha_correccion)->format('d/m/Y') : '-' }}</td>
      {{-- Tasa riesgo ARL --}}
      <td>{{ $baseIngreso?->tasa_riesgo_arl ?? '-' }}</td>
      {{-- Salario básico --}}
      <td>{{ $baseIngreso?->salario_basico ? '$ ' . number_format($baseIngreso->salario_basico, 0, ',', '.') : '-' }}</td>
      {{-- Auxilio transporte --}}
      <td>{{ $baseIngreso?->auxilio_transporte ? '$ ' . number_format($baseIngreso->auxilio_transporte, 0, ',', '.') : '-' }}</td>
      {{-- Otrosi variable --}}
      <td>{{ $baseIngreso?->otrosi_variable ? '$ ' . number_format($baseIngreso->otrosi_variable, 0, ',', '.') : '$ -' }}</td>
      {{-- Auxilio rodamiento --}}
      <td>{{ $baseIngreso?->auxilio_rodamiento ? '$ ' . number_format($baseIngreso->auxilio_rodamiento, 0, ',', '.') : 'No aplica' }}</td>
      {{-- Auxilio comunicación --}}
      <td>{{ $baseIngreso?->auxilio_comunicacion ? '$ ' . number_format($baseIngreso->auxilio_comunicacion, 0, ',', '.') : '-' }}</td>
      {{-- Auxilio alimentación --}}
      <td>{{ $baseIngreso?->auxilio_alimentacion ? '$ ' . number_format($baseIngreso->auxilio_alimentacion, 0, ',', '.') : '-' }}</td>
    </tr>
  </tbody>
</table>

<p class="footer">
  Cordialmente,<br>
  <strong>{{ config('mail.from.name') }}</strong>
</p>

</body>
</html>
