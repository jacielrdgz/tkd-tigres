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

        // Gate global: SuperAdmin y Owner tienen acceso completo
        Gate::before(function ($user, $ability) {
            if ($user->isSuperAdmin() || $user->role === 'owner') {
                return true;
            }
        });

        Gate::policy(\App\Models\Alumno::class, \App\Policies\AlumnoPolicy::class);
        Gate::policy(\App\Models\Pago::class, \App\Policies\PagoPolicy::class);
        Gate::policy(\App\Models\Evento::class, \App\Policies\EventoPolicy::class);

        // Sincronización de esquema removida del boot para evitar deadlocks/timeouts.
        // Se debe ejecutar manualmente mediante /api/ejecutar-migraciones.
    }

    public function register(): void
    {
        //
    }
}