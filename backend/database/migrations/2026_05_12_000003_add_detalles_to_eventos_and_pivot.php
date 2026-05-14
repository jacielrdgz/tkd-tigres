<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->json('detalles')->nullable()->after('descripcion');
        });

        Schema::table('evento_alumno', function (Blueprint $table) {
            $table->json('detalles')->nullable()->after('pago_inscripcion');
        });
    }

    public function down(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn('detalles');
        });

        Schema::table('evento_alumno', function (Blueprint $table) {
            $table->dropColumn('detalles');
        });
    }
};
