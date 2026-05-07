<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alumnos', function (Blueprint $table) {
            // Día del mes en que el alumno debe pagar (1-31). Default 1.
            $table->tinyInteger('dia_pago')->unsigned()->default(1)->after('estatus');
        });
    }

    public function down(): void
    {
        Schema::table('alumnos', function (Blueprint $table) {
            $table->dropColumn('dia_pago');
        });
    }
};
