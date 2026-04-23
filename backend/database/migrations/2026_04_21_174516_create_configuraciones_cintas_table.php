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
        Schema::create('configuraciones_cintas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('tenant_id'); // ID de la escuela (Tigres Do, etc.)
        $table->string('nombre_nivel');          // "Blanca", "Amarilla", "VIP"
        $table->string('color_hex')->default('#94a3b8'); 
        $table->integer('orden')->default(0);    // Para que aparezcan en orden jerárquico
        $table->string('categoria_label')->default('Cinta'); // Para que diga "Cinta" o "Membresía"
        $table->timestamps();

        $table->index('tenant_id');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuraciones_cintas');
    }
};
