# ── Etapa 1: compilar assets con Node.js ────────────────────────────────────
FROM node:20-alpine AS assets

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY resources/ resources/
COPY vite.config.js ./

RUN npm run build

# ── Etapa 2: imagen PHP + Apache ────────────────────────────────────────────
FROM php:8.2-apache

# Dependencias del sistema
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev zip unzip \
    && rm -rf /var/lib/apt/lists/*

# Extensiones PHP requeridas por Laravel
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Apache: apuntar DocumentRoot a /public y activar mod_rewrite
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
        /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' \
        /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && a2enmod rewrite headers

WORKDIR /var/www/html

# Dependencias PHP (cache layer separado)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Código fuente
COPY . .

# Assets compilados desde la etapa anterior
COPY --from=assets /app/public/build public/build

# Post-install scripts de Composer
RUN composer run-script post-autoload-dump 2>/dev/null || true

# Permisos de Laravel
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
