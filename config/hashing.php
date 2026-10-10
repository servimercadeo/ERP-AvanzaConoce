<?php

/*
 | Solo se sobrescribe lo que difiere de la configuración por defecto de Laravel (el resto
 | se toma de vendor/laravel/framework/config/hashing.php).
 */
return [

    /*
     | El ERP y AvanzaConoce comparten la misma contraseña: AvanzaConoce copia su hash a
     | erp_users (bcrypt de costo 10) y el ERP le envía el suyo al crear un empleado allá.
     | Laravel, por defecto, vuelve a cifrar la contraseña al iniciar sesión cuando el costo
     | no coincide con el configurado (12), y el hash del ERP dejaría de ser el mismo que el
     | de AvanzaConoce (además de registrar un "Actualizó Empleados" del Sistema en la
     | auditoría en cada primer login tras un cambio de contraseña).
     */
    'rehash_on_login' => false,

];
