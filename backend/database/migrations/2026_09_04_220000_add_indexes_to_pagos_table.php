<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pagos', function (Blueprint $table) {
            try {
                $table->index('alumno_id');
            } catch (\Throwable $e) {}
            try {
                $table->index(['alumno_id', 'fecha_inicio']);
            } catch (\Throwable $e) {}
            try {
                $table->index('fecha_pago');
            } catch (\Throwable $e) {}
        });
    }

    public function down(): void
    {
        Schema::table('pagos', function (Blueprint $table) {
            try {
                $table->dropIndex(['alumno_id']);
                $table->dropIndex(['alumno_id', 'fecha_inicio']);
                $table->dropIndex(['fecha_pago']);
            } catch (\Throwable $e) {}
        });
    }
};
