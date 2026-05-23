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
        Schema::table('evento_alumno', function (Blueprint $table) {
            $table->dropColumn(['resultado', 'detalles']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evento_alumno', function (Blueprint $table) {
            $table->string('resultado')->nullable();
            $table->json('detalles')->nullable();
        });
    }
};
