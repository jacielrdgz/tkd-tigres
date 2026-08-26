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

        // Las migraciones se ejecutan al iniciar el contenedor (ver Dockerfile)

        Gate::policy(\App\Models\Alumno::class, \App\Policies\AlumnoPolicy::class);
        Gate::policy(\App\Models\Pago::class, \App\Policies\PagoPolicy::class);
        Gate::policy(\App\Models\Evento::class, \App\Policies\EventoPolicy::class);
    }

    public function register(): void
    {
        //
    }
}