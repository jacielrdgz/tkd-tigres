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

# Configurar limites de carga de archivos en PHP (64MB)
RUN echo "upload_max_filesize = 64M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 64M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

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

# Servidor de Laravel en producción
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=10000"]
