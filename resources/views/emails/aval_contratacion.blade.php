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
      <td>{{ $baseIngreso?->lugar_trabajo ?? $candidato->lugar_trabajo ?? '-' }}</td>
      {{-- Líder inmediato --}}
      <td>{{ $baseIngreso?->lider_inmediato ?? $candidato->requisicion?->responsable ?? '-' }}</td>
      {{-- Empleador --}}
      <td>{{ $baseIngreso?->empleador ?? $candidato->requisicion?->empleador?->nombre ?? '-' }}</td>
      {{-- Fecha programación ingreso --}}
      @php $fpi = $baseIngreso?->fecha_programacion_ingreso ?? $candidato->fecha_programacion_ingreso; @endphp
      <td>{{ $fpi ? \Carbon\Carbon::parse($fpi)->format('d/m/Y') : '-' }}</td>
      {{-- Fecha corrección --}}
      @php $fc = $baseIngreso?->fecha_correccion ?? $candidato->fecha_correccion; @endphp
      <td>{{ $fc ? \Carbon\Carbon::parse($fc)->format('d/m/Y') : '-' }}</td>
      {{-- Tasa riesgo ARL --}}
      <td>{{ $baseIngreso?->tasa_riesgo_arl ?? $candidato->tasa_riesgo_arl ?? '-' }}</td>
      {{-- Salario básico --}}
      @php $salario = $baseIngreso?->salario_basico ?? $candidato->salario_basico; @endphp
      <td>{{ $salario ? '$ ' . number_format($salario, 0, ',', '.') : '-' }}</td>
      {{-- Auxilio transporte --}}
      @php $auxTransporte = $baseIngreso?->auxilio_transporte ?? $candidato->auxilio_transporte; @endphp
      <td>{{ $auxTransporte ? '$ ' . number_format($auxTransporte, 0, ',', '.') : '-' }}</td>
      {{-- Otrosi variable --}}
      @php $otrosiVar = $baseIngreso?->otrosi_variable ?? $candidato->otrosi_variable; @endphp
      <td>{{ $otrosiVar ? '$ ' . number_format($otrosiVar, 0, ',', '.') : '$ -' }}</td>
      {{-- Auxilio rodamiento --}}
      @php $auxRodamiento = $baseIngreso?->auxilio_rodamiento ?? $candidato->auxilio_rodamiento; @endphp
      <td>{{ $auxRodamiento ? '$ ' . number_format($auxRodamiento, 0, ',', '.') : 'No aplica' }}</td>
      {{-- Auxilio comunicación --}}
      @php $auxComunicacion = $baseIngreso?->auxilio_comunicacion ?? $candidato->auxilio_comunicacion; @endphp
      <td>{{ $auxComunicacion ? '$ ' . number_format($auxComunicacion, 0, ',', '.') : '-' }}</td>
      {{-- Auxilio alimentación --}}
      @php $auxAlimentacion = $baseIngreso?->auxilio_alimentacion ?? $candidato->auxilio_alimentacion; @endphp
      <td>{{ $auxAlimentacion ? '$ ' . number_format($auxAlimentacion, 0, ',', '.') : '-' }}</td>
    </tr>
  </tbody>
</table>

<p class="footer">
  Cordialmente,<br>
  <strong>{{ config('mail.from.name') }}</strong>
</p>

</body>
</html>
