FROM php:8.3-cli

# Instalar dependencias del sistema y extensiones de PostgreSQL para PHP
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libpq-dev

RUN docker-php-ext-install pdo pdo_pgsql pgsql mbstring exif pcntl bcmath gd

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copiar archivos del backend
COPY . .

# Instalar paquetes de PHP
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Permisos de almacenamiento
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 10000

# Ejecutar migraciones automáticamente e iniciar servidor de Laravel
CMD ["sh", "-c", "php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=10000"]
