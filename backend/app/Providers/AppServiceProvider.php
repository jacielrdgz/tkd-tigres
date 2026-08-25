<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        try {
            if (Schema::hasTable('users') && !Schema::hasColumn('users', 'is_superadmin')) {
                \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            }
        } catch (\Throwable $e) {
            // Ignorar errores temporales de conexión
        }

        Gate::policy(\App\Models\Alumno::class, \App\Policies\AlumnoPolicy::class);
        Gate::policy(\App\Models\Pago::class, \App\Policies\PagoPolicy::class);
        Gate::policy(\App\Models\Evento::class, \App\Policies\EventoPolicy::class);
    }

    public function register(): void
    {
        //
    }
}