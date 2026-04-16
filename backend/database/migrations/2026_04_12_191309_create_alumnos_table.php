<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alumnos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('apellido_paterno');
            $table->string('apellido_materno');
            $table->string('nombre_tutor');
            $table->string('telefono_tutor', 20);
            $table->string('email')->nullable();
            $table->date('fecha_nacimiento');
            $table->enum('cinta', [
                'blanca', 'blanca_avanzada',
                'amarilla', 'amarilla_avanzada',
                'naranja', 'naranja_avanzada',
                'verde', 'verde_avanzada',
                'azul', 'azul_avanzada',
                'marrón', 'marrón_avanzada',
                'roja', 'roja_avanzada',
                'negra'
            ])->default('blanca');
            $table->enum('estatus', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumnos');
    }
};