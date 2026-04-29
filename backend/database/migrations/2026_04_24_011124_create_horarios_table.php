<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::create('horarios', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('tenant_id'); // Para saber de qué escuela es el horario
        $table->string('nombre');                // Ej: "Grupo Infantil", "Turno Matutino"
        $table->time('hora_inicio');             // Ej: 16:00:00
        $table->time('hora_fin');                // Ej: 17:00:00
        $table->string('dias')->nullable();      // Ej: "Lunes, Miércoles, Viernes"
        $table->timestamps();

        $table->foreign('tenant_id')->references('id')->on('tenants');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('horarios');
    }
};
