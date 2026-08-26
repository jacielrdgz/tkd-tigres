<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            // Establecer tenant_id = NULL para todos los usuarios con is_superadmin = true
            DB::table('users')
                ->where('is_superadmin', true)
                ->update(['tenant_id' => null]);

            // Por seguridad, si existe el admin default por email
            DB::table('users')
                ->where('email', 'admin@tkdtigres.com')
                ->update([
                    'tenant_id' => null,
                    'is_superadmin' => true,
                ]);

            // Sincronizar todos los tenants con sus nombres de escuela
            if (Schema::hasTable('escuelas') && Schema::hasTable('tenants')) {
                $escuelas = DB::table('escuelas')->get();
                foreach ($escuelas as $esc) {
                    if (!empty($esc->nombre) && !empty($esc->tenant_id)) {
                        DB::table('tenants')->where('id', $esc->tenant_id)->update(['nombre' => $esc->nombre]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revertimos
    }
};
