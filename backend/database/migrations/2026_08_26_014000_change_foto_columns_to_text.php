<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Cambiar columnas de varchar(255) a TEXT para poder almacenar Base64
        // Usar SQL directo para máxima compatibilidad con PostgreSQL
        DB::statement('ALTER TABLE alumnos ALTER COLUMN foto TYPE TEXT');
        DB::statement('ALTER TABLE escuelas ALTER COLUMN logo_url TYPE TEXT');
        DB::statement('ALTER TABLE tenants ALTER COLUMN logo TYPE TEXT');
        
        // También instructores si existe la columna
        try {
            DB::statement('ALTER TABLE instructors ALTER COLUMN foto_url TYPE TEXT');
        } catch (\Throwable $e) {
            // La columna podría no existir
        }
    }

    public function down(): void
    {
        // No revertimos porque podría perder datos
    }
};
