<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/ejecutar-migraciones', function () {
    try {
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'pgsql') {
            $tables = \Illuminate\Support\Facades\DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
            foreach ($tables as $table) {
                \Illuminate\Support\Facades\DB::statement('DROP TABLE IF EXISTS "' . $table->table_name . '" CASCADE;');
            }
        }

        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $outputMigrate = \Illuminate\Support\Facades\Artisan::output();

        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
        $outputSeed = \Illuminate\Support\Facades\Artisan::output();

        return response()->json([
            'status' => 'success',
            'message' => 'Todas las 42 migraciones y seeders fueron ejecutados con éxito en Supabase!',
            'migrate_output' => $outputMigrate,
            'seed_output' => $outputSeed,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ], 200);
    }
});
