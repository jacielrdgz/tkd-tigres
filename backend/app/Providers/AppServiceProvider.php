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

        // Sincronización automática de esquema y migraciones
        try {
            if (!\Illuminate\Support\Facades\App::runningInConsole()) {
                \Illuminate\Support\Facades\Cache::remember('db_schema_synced_v1', 1800, function () {
                    // 1. DDL directo seguro para columnas críticas
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE alumnos ALTER COLUMN nombre_tutor DROP NOT NULL');
                    } catch (\Throwable $e) {}
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE alumnos ALTER COLUMN telefono_tutor DROP NOT NULL');
                    } catch (\Throwable $e) {}
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_ingreso DATE NULL');
                    } catch (\Throwable $e) {}

                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE eventos ADD COLUMN IF NOT EXISTS precios_cintas JSON NULL');
                    } catch (\Throwable $e) {}
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE eventos ADD COLUMN IF NOT EXISTS lugar VARCHAR(200) NULL');
                    } catch (\Throwable $e) {}
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE eventos ADD COLUMN IF NOT EXISTS costo NUMERIC(10,2) NULL');
                    } catch (\Throwable $e) {}

                    try {
                        \Illuminate\Support\Facades\DB::statement('CREATE INDEX IF NOT EXISTS asistencias_fecha_idx ON asistencias(fecha)');
                    } catch (\Throwable $e) {}
                    try {
                        \Illuminate\Support\Facades\DB::statement('CREATE INDEX IF NOT EXISTS pagos_alumno_id_idx ON pagos(alumno_id)');
                    } catch (\Throwable $e) {}
                    try {
                        \Illuminate\Support\Facades\DB::statement('CREATE INDEX IF NOT EXISTS pagos_alumno_fecha_inicio_idx ON pagos(alumno_id, fecha_inicio)');
                    } catch (\Throwable $e) {}

                    // 2. Registrar migraciones base si la tabla existe en la BD
                    if (!\Illuminate\Support\Facades\Schema::hasTable('migrations')) {
                        \Illuminate\Support\Facades\DB::statement('
                            CREATE TABLE IF NOT EXISTS migrations (
                                id SERIAL PRIMARY KEY,
                                migration VARCHAR(255) NOT NULL,
                                batch INTEGER NOT NULL
                            )
                        ');
                    }

                    $tableToMigration = [
                        'users'                  => '0001_01_01_000000_create_users_table',
                        'cache'                  => '0001_01_01_000001_create_cache_table',
                        'jobs'                   => '0001_01_01_000002_create_jobs_table',
                        'personal_access_tokens' => '2026_04_12_190923_create_personal_access_tokens_table',
                        'alumnos'                => '2026_04_12_191309_create_alumnos_table',
                        'asistencias'            => '2026_04_12_191342_create_asistencias_table',
                        'eventos'                => '2026_04_12_191349_create_eventos_table',
                        'evento_alumno'          => '2026_04_12_191357_create_evento_alumno_table',
                        'pagos'                  => '2026_04_13_042851_create_pagos_table',
                        'tenants'                => '2026_04_16_000001_create_tenants_table',
                        'configuraciones_cintas' => '2026_04_21_174516_create_configuraciones_cintas_table',
                        'horarios'               => '2026_04_24_011124_create_horarios_table',
                        'instructors'            => '2026_05_07_063413_create_instructors_table',
                        'escuelas'               => '2026_05_07_075644_create_escuelas_table',
                        'direcciones_escuelas'   => '2026_05_07_075709_create_direcciones_escuelas_table',
                        'examen_alumno'          => '2026_05_14_000001_refactor_eventos_relacional',
                        'global_configs'         => '2026_05_27_000758_create_global_configs_table',
                        'suscripcion_historials' => '2026_05_27_000932_create_suscripcion_historials_table',
                    ];

                    $existing = \Illuminate\Support\Facades\DB::table('migrations')->pluck('migration')->toArray();

                    foreach ($tableToMigration as $table => $migrationName) {
                        if (\Illuminate\Support\Facades\Schema::hasTable($table) && !in_array($migrationName, $existing)) {
                            \Illuminate\Support\Facades\DB::table('migrations')->insert([
                                'migration' => $migrationName,
                                'batch'     => 1,
                            ]);
                            $existing[] = $migrationName;
                        }
                    }

                    $pre2026Sept = [
                        '2026_04_13_165246_add_foto_to_alumnos_table',
                        '2026_04_15_060523_add_horario_to_alumnos_table',
                        '2026_04_16_000002_add_tenant_id_to_all_tables',
                        '2026_04_16_235959_backfill_tenant_id_on_existing_records',
                        '2026_04_23_190722_alter_cinta_to_configuracion_cinta_id_on_alumnos_table',
                        '2026_04_23_193612_add_color_texto_to_configuraciones_cintas_table',
                        '2026_04_23_194702_add_color_texto_to_configuraciones_cintas_table',
                        '2026_04_24_013453_add_horario_id_to_alumnos_table',
                        '2026_04_24_014106_drop_horario_column_from_alumnos_table',
                        '2026_05_07_000001_add_dia_pago_to_alumnos_table',
                        '2026_05_07_000002_add_periodo_to_pagos_table',
                        '2026_05_07_064516_add_details_to_tenants_table',
                        '2026_05_07_072622_add_extra_fields_to_instructors_table',
                        '2026_05_12_000001_add_tipo_to_pagos_table',
                        '2026_05_12_000003_add_detalles_to_eventos_and_pivot',
                        '2026_05_14_055554_add_es_historico_to_examen_alumnos_table',
                        '2026_05_14_064143_normalize_event_tables',
                        '2026_05_14_064629_sync_pago_inscripcion_amounts',
                        '2026_05_14_070845_simplify_evento_alumno_table',
                        '2026_05_26_224954_add_avatar_to_users_table',
                        '2026_05_26_232805_add_is_superadmin_to_users_table',
                        '2026_05_26_234535_add_escuela_solicitada_to_users_table',
                        '2026_05_27_000823_add_subscription_fields_to_tenants_table',
                        '2026_05_27_000853_add_last_login_and_suspension_to_users_table',
                        '2026_08_26_014000_change_foto_columns_to_text',
                        '2026_08_26_020000_ensure_superadmin_has_no_tenant',
                        '2026_08_26_100000_add_telefono_to_users_table',
                    ];

                    foreach ($pre2026Sept as $mig) {
                        if (!in_array($mig, $existing)) {
                            \Illuminate\Support\Facades\DB::table('migrations')->insert([
                                'migration' => $mig,
                                'batch'     => 1,
                            ]);
                            $existing[] = $mig;
                        }
                    }

                    // 3. Ejecutar migraciones restantes de forma segura
                    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);

                    return true;
                });
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Auto-migration/schema sync notice: ' . $e->getMessage());
        }
    }

    public function register(): void
    {
        //
    }
}