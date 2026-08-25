<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pagos', function (Blueprint $table) {
            $table->string('tipo', 20)->default('mensualidad')->after('alumno_id');
        });

        if (DB::getDriverName() !== 'pgsql') {
            Schema::table('pagos', function (Blueprint $table) {
                // Cambiar mes, fecha_inicio y fecha_fin a nullable para cuando sea inscripcion
                $table->string('mes', 7)->nullable()->change();
                $table->date('fecha_inicio')->nullable()->change();
                $table->date('fecha_fin')->nullable()->change();
            });
        }

        // Asegurar que los existentes sean mensualidad
        DB::table('pagos')->update(['tipo' => 'mensualidad']);
    }

    public function down(): void
    {
        Schema::table('pagos', function (Blueprint $table) {
            $table->dropColumn('tipo');
            $table->string('mes', 7)->nullable(false)->change();
        });
    }
};
