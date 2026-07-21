<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'recaptcha' => [
        'secret' => env('RECAPTCHA_SECRET_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sharepoint' => [
        'delete_flow_url'   => env('SHAREPOINT_DELETE_FLOW_URL'),
        'contrato_flow_url' => env('SHAREPOINT_CONTRATO_FLOW_URL'),
        'medico_flow_url'   => env('SHAREPOINT_MEDICO_FLOW_URL', 'https://251096727969e82c98eb7eaa0a0fc8.e6.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/19/workflows/45ba95de50b94b638a5d230cc6012d1b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=FcS4oaDM7z3PO6nTdfFh4SVXY9674xlKr2PyxUtYWkQ'),
    ],

];
