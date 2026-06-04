<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registro de Ingreso</title>
    <style>
        body { margin: 0; padding: 0; background: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { background: linear-gradient(135deg, #186059 0%, #0f4a44 100%); padding: 36px 40px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.03em; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 0.9rem; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 1.05rem; color: #1a3a35; font-weight: 600; margin-bottom: 16px; }
        .message { font-size: 0.93rem; color: #4a6a65; line-height: 1.7; margin-bottom: 28px; }
        .info-box { background: #e8f7f5; border-left: 4px solid #1a9b8c; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 28px; }
        .info-box p { margin: 0; font-size: 0.88rem; color: #186059; line-height: 1.6; }
        .btn-wrap { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #1a9b8c 0%, #157a6e 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 1rem; font-weight: 700; letter-spacing: 0.03em; box-shadow: 0 4px 14px rgba(26,155,140,0.35); }
        .url-fallback { text-align: center; margin-top: 16px; font-size: 0.78rem; color: #8aaba6; word-break: break-all; }
        .footer { background: #f8fbfb; border-top: 1px solid #d0ebe8; padding: 20px 40px; text-align: center; }
        .footer p { margin: 0; font-size: 0.78rem; color: #8aaba6; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>S&amp;M Servicios y Mercadeo S.A.S.</h1>
            <p>Proceso de Contratación</p>
        </div>

        <div class="body">
            <p class="greeting">Hola, {{ $baseIngreso->nombre_completo }}</p>

            <p class="message">
                Nos complace informarte que has sido seleccionado(a) para continuar con el proceso de contratación como
                <strong>{{ $baseIngreso->cargo ?? 'colaborador(a)' }}</strong>
                @if($baseIngreso->empresa) en <strong>{{ $baseIngreso->empresa }}</strong>@endif.
            </p>

            <div class="info-box">
                <p>
                    Para completar tu vinculación, necesitamos que diligencie el formulario de registro con tus datos personales.
                    Algunos campos estarán pre-diligenciados con la información que ya tenemos; verifica que sean correctos y completa los que falten.
                </p>
            </div>

            <p class="message">
                Haz clic en el botón a continuación para acceder al formulario:
            </p>

            <div class="btn-wrap">
                <a href="{{ $formUrl }}" class="btn">Completar mi registro</a>
            </div>

            <div class="url-fallback">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                {{ $formUrl }}
            </div>
        </div>

        <div class="footer">
            <p>
                Este correo fue enviado por S&amp;M Servicios y Mercadeo S.A.S.<br>
                Si tienes dudas, comunícate con el área de Recursos Humanos.<br>
                No respondas a este correo, es un envío automático.
            </p>
        </div>
    </div>
</body>
</html>
