<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/ejecutar-migraciones', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $outputMigrate = \Illuminate\Support\Facades\Artisan::output();

        return response()->json([
            'status' => 'success',
            'message' => 'Migraciones ejecutadas con éxito en Supabase!',
            'output' => $outputMigrate,
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
