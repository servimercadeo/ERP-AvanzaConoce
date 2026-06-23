#!/bin/bash
set -e

# Recrear symlink storage (public/storage puede ser directorio por el COPY del Dockerfile)
rm -rf /var/www/html/public/storage
php artisan storage:link

# Migraciones (--seed solo en primer arranque si la tabla está vacía)
php artisan migrate --force

# Ejecutar seeders si la tabla de usuarios está vacía
USER_COUNT=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tail -n1 || echo "1")
if [ "$USER_COUNT" = "0" ]; then
    php artisan db:seed --force
fi

# Cachear config/rutas/vistas para producción
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Iniciar Apache
exec apache2-foreground
