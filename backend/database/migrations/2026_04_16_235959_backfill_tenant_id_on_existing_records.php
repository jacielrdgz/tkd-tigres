<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Si tienes un solo tenant (caso típico de una sola escuela), asignamos ese tenant
        // a registros viejos donde tenant_id quedó en NULL.
        $tenantIds = DB::table('tenants')->orderBy('id')->pluck('id');

        if ($tenantIds->count() !== 1) {
            // Si hay 0 o más de 1 tenant, no podemos adivinar el tenant correcto.
            return;
        }

        $tenantId = (int) $tenantIds->first();

        foreach (['users', 'alumnos', 'pagos', 'asistencias', 'eventos'] as $table) {
            if (Schema::hasColumn($table, 'tenant_id')) {
                DB::table($table)->whereNull('tenant_id')->update(['tenant_id' => $tenantId]);
            }
        }
    }

    public function down(): void
    {
        // No revertimos: sería destructivo (no sabemos cuál era el tenant original).
    }
};

