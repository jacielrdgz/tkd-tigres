<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SupabaseStorageService
{
    /**
     * Sube un archivo al bucket de Supabase Storage estructurado por escuela.
     * Estructura: {nombre_escuela}/{categoria}/{archivo}
     * Categorías estándar: 'alumnos', 'avatars', 'instructores', 'logos'
     * 
     * @param UploadedFile|string $file Archivo subido o contenido binario/base64
     * @param string $category Carpeta de categoría (ej: 'alumnos', 'avatars', 'instructores', 'logos')
     * @param string|null $customName Nombre opcional del archivo
     * @param string|null $escuelaNombre Nombre explícito de la escuela (opcional)
     * @return string URL pública de la imagen o base64 en caso de fallback
     */
    public static function upload($file, string $category = 'general', ?string $customName = null, ?string $escuelaNombre = null): string
    {
        $supabaseUrl = config('services.supabase.url') ?: env('SUPABASE_URL');
        $supabaseKey = config('services.supabase.key') ?: (env('SUPABASE_SERVICE_ROLE_KEY') ?: env('SUPABASE_KEY') ?: env('SUPABASE_ANON_KEY'));
        $bucket = config('services.supabase.bucket') ?: env('SUPABASE_BUCKET', 'multimedia');

        // Determinar contenido binario, extensión y mime-type
        $content = null;
        $mime = 'image/jpeg';
        $extension = 'jpg';

        if ($file instanceof UploadedFile) {
            $mime = $file->getMimeType() ?: 'image/jpeg';
            $extension = $file->getClientOriginalExtension() ?: 'jpg';
            $content = file_get_contents($file->getRealPath());
        } elseif (is_string($file)) {
            if (str_starts_with($file, 'data:image')) {
                // Es un string Base64
                if (preg_match('/^data:image\/(\w+);base64,/', $file, $matches)) {
                    $extension = $matches[1];
                    $mime = 'image/' . $extension;
                    $file = substr($file, strpos($file, ',') + 1);
                }
                $content = base64_decode($file);
            } else {
                $content = $file;
            }
        }

        if (!$content) {
            throw new \Exception('No se pudo leer el contenido del archivo.');
        }

        // Determinar el nombre de la escuela para la jerarquía del bucket
        if (empty($escuelaNombre)) {
            $user = auth()->user();
            if ($user) {
                if ($user->tenant && !empty($user->tenant->nombre)) {
                    $escuelaNombre = $user->tenant->nombre;
                } elseif ($user->tenant_id) {
                    $escuelaNombre = \App\Models\Escuela::where('tenant_id', $user->tenant_id)->value('nombre');
                }
            }
        }

        $escuelaFolder = !empty($escuelaNombre) ? Str::slug($escuelaNombre) : 'general';
        $categoryFolder = trim(strtolower($category), '/');

        // Jerarquía: (nombre-escuela)/(categoria)/(archivo)
        $fileName = $customName ?: ($categoryFolder . '_' . time() . '_' . Str::random(8) . '.' . $extension);
        $filePath = "{$escuelaFolder}/{$categoryFolder}/{$fileName}";

        // Si tenemos las credenciales de Supabase configuradas, intentamos subir al Bucket
        if (!empty($supabaseUrl) && !empty($supabaseKey)) {
            try {
                $supabaseUrl = rtrim($supabaseUrl, '/');
                $uploadUrl = "{$supabaseUrl}/storage/v1/object/{$bucket}/{$filePath}";

                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $supabaseKey,
                    'apikey'        => $supabaseKey,
                    'Content-Type'  => $mime,
                    'x-upsert'      => 'true',
                ])->withBody($content, $mime)->post($uploadUrl);

                if ($response->successful()) {
                    // Retornar la URL pública permanente
                    return "{$supabaseUrl}/storage/v1/object/public/{$bucket}/{$filePath}";
                }

                Log::warning('Error en subida a Supabase Storage: ' . $response->status() . ' - ' . $response->body());
            } catch (\Throwable $e) {
                Log::error('Excepción al conectar con Supabase Storage: ' . $e->getMessage());
            }
        }

        // Fallback a Base64 si Supabase Storage no está conectado
        return 'data:' . $mime . ';base64,' . base64_encode($content);
    }

    /**
     * Elimina un archivo del bucket de Supabase Storage si es una URL de Supabase.
     */
    public static function delete(?string $url): bool
    {
        if (empty($url) || str_starts_with($url, 'data:')) {
            return false;
        }

        $supabaseUrl = config('services.supabase.url') ?: env('SUPABASE_URL');
        $supabaseKey = config('services.supabase.key') ?: (env('SUPABASE_SERVICE_ROLE_KEY') ?: env('SUPABASE_KEY') ?: env('SUPABASE_ANON_KEY'));
        $bucket = config('services.supabase.bucket') ?: env('SUPABASE_BUCKET', 'multimedia');

        if (empty($supabaseUrl) || empty($supabaseKey)) {
            return false;
        }

        try {
            $supabaseUrl = rtrim($supabaseUrl, '/');
            $prefix = "{$supabaseUrl}/storage/v1/object/public/{$bucket}/";

            if (str_starts_with($url, $prefix)) {
                $filePath = substr($url, strlen($prefix));
                $deleteUrl = "{$supabaseUrl}/storage/v1/object/{$bucket}/{$filePath}";

                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $supabaseKey,
                    'apikey'        => $supabaseKey,
                ])->delete($deleteUrl);

                return $response->successful();
            }
        } catch (\Throwable $e) {
            Log::warning('Error al eliminar archivo de Supabase Storage: ' . $e->getMessage());
        }

        return false;
    }
}
