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

    /*
     | Tabla de usuarios de AvanzaConoce en la misma base de datos (sin el prefijo `erp_`
     | del ERP). De ahí se toma la contraseña al dar de alta a un empleado que ya existe allá.
     */
    'avanzaconoce_users_table' => env('AVANZACONOCE_USERS_TABLE', 'users'),

    /*
     | Crear el usuario en AvanzaConoce al dar de alta a un empleado en el ERP (ver
     | App\Services\AltaEnAvanzaConoce). Apagado por defecto: se enciende cuando
     | AvanzaConoce ya tenga publicado POST /api/erp/empleados.
     */
    'crear_usuarios_en_avanza' => (bool) env('AVANZACONOCE_CREAR_USUARIOS', false),

    /* Segundos máximos de espera a AvanzaConoce por cada alta (no debe frenar el ERP). */
    'avanzaconoce_timeout' => (int) env('AVANZACONOCE_TIMEOUT', 10),
];