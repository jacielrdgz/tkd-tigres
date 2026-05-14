<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('instructors', function (Blueprint $table) {
            $table->date('fecha_nacimiento')->nullable()->after('apellido_materno');
            $table->foreignId('configuracion_cinta_id')->nullable()->after('foto_url')->constrained('configuraciones_cintas')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('instructors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('configuracion_cinta_id');
            $table->dropColumn('fecha_nacimiento');
        });
    }
};
