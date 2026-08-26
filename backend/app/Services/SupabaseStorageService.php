<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SupabaseStorageService
{
    /**
     * Sube un archivo al bucket de Supabase Storage.
     * 
     * @param UploadedFile|string $file Archivo subido o contenido binario/base64
     * @param string $folder Carpeta dentro del bucket (ej: 'logos', 'alumnos', 'avatars')
     * @param string|null $customName Nombre opcional del archivo
     * @return string URL pública de la imagen o base64 en caso de fallback
     */
    public static function upload($file, string $folder = 'general', ?string $customName = null): string
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

        $fileName = $customName ?: (Str::slug($folder) . '_' . time() . '_' . Str::random(8) . '.' . $extension);
        $filePath = trim($folder, '/') . '/' . $fileName;

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
