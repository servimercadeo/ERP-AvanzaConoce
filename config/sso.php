<?php

return [
    /*
     | Secreto compartido entre el ERP y AvanzaConoce.
     | Debe ser IDÉNTICO en el .env de ambas aplicaciones.
     */
    'secret' => env('SSO_SECRET', ''),

    /*
     | URL base de la API de AvanzaConoce (sin slash final).
     | Ejemplo local:  http://localhost:8001
     | Ejemplo prod:   https://avanzaconoce.com
     */
    'avanzaconoce_api_url' => env('AVANZACONOCE_API_URL', ''),
];