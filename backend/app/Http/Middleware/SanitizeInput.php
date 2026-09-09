<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInput
{
    /**
     * Nombres de campos de contraseñas que no deben ser despojados de caracteres especiales
     * pero sí de bytes nulos para prevenir ataques de null-byte injection.
     */
    protected array $passwordFields = [
        'password',
        'password_confirmation',
        'current_password',
        'new_password',
        'old_password',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Sanitizar Query Parameters (?param=valor)
        $query = $request->query->all();
        if (!empty($query)) {
            $cleanedQuery = $this->cleanArray($query);
            $request->query->replace($cleanedQuery);
        }

        // 2. Sanitizar Body / Inputs (JSON o form-data)
        $input = $request->all();
        if (!empty($input)) {
            $cleanedInput = $this->cleanArray($input);
            $request->replace($cleanedInput);
        }

        return $next($request);
    }

    /**
     * Limpia un array de forma recursiva.
     */
    protected function cleanArray(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->cleanArray($value);
            } elseif (is_string($value)) {
                $data[$key] = $this->cleanString((string) $key, $value);
            }
        }

        return $data;
    }

    /**
     * Aplica reglas de sanitización a una cadena según su tipo de campo.
     */
    protected function cleanString(string $key, string $value): ?string
    {
        // Remover siempre bytes nulos (\0) en cualquier campo para evitar SQL injection / null-byte poisoning
        $value = str_replace("\0", '', $value);

        // Si es una contraseña, no alteramos etiquetas ni caracteres especiales (ej: P@ss<word>!),
        // pero sí prevenimos que exceda una longitud máxima absurda contra ataques DoS en bcrypt
        if (in_array(strtolower($key), $this->passwordFields, true)) {
            // Limitar longitud para mitigar DoS en Hash::make / bcrypt (máximo 255 caracteres)
            return mb_substr($value, 0, 255, 'UTF-8');
        }

        // Remover caracteres de control invisibles (permitiendo saltos de línea \n \r y tabulaciones \t)
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);

        // Eliminar tags HTML / PHP / Javascript para prevenir stored XSS
        $value = strip_tags($value);

        // Recortar espacios en blanco al inicio y al final
        $value = trim($value);

        // Normalizar correos electrónicos a minúsculas
        if (str_contains(strtolower($key), 'email')) {
            $value = mb_strtolower($value, 'UTF-8');
        }

        return $value;
    }
}
