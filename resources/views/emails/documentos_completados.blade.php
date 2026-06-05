<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentos recibidos</title>
    <style>
        body { margin: 0; padding: 0; background: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { background: linear-gradient(135deg, #186059 0%, #0f4a44 100%); padding: 36px 40px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.03em; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 0.9rem; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 1.05rem; color: #1a3a35; font-weight: 600; margin-bottom: 16px; }
        .check-box { background: #e8f7f5; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 14px; }
        .check-icon { font-size: 1.6rem; flex-shrink: 0; line-height: 1.4; }
        .check-text { font-size: 0.95rem; color: #186059; line-height: 1.7; font-weight: 600; }
        .message { font-size: 0.93rem; color: #4a6a65; line-height: 1.7; margin-bottom: 20px; }
        .info-box { background: #fff8e8; border-left: 4px solid #f5a623; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 28px; }
        .info-box p { margin: 0; font-size: 0.88rem; color: #7a5a00; line-height: 1.6; }
        .closing { font-size: 0.93rem; color: #4a6a65; line-height: 1.7; }
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
            <p class="greeting">Hola, {{ $nombres }},</p>

            <div class="check-box">
                <span class="check-icon">✅</span>
                <span class="check-text">
                    Te confirmamos que ya completaste la información de esta fase de la contratación
                    necesaria para el diligenciamiento y gestión de tu contrato laboral. ¡Falta muy poco!
                </span>
            </div>

            <div class="info-box">
                <p>
                    👷 Por favor ten muy presente tu correo electrónico. Seguiremos enviando información
                    respecto a los pasos a seguir, específicamente con la <strong>fecha, hora y lugar
                    de tus exámenes de ingreso</strong>.
                </p>
            </div>

            <p class="closing">
                ¡Estamos muy felices de tenerte en el proceso! 😊 ¡Nos vemos pronto!
            </p>
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
