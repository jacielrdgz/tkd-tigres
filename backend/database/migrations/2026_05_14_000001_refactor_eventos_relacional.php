<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Actualizar tabla `eventos`
        Schema::table('eventos', function (Blueprint $table) {
            // Cambiar enum para incluir demostracion
            $table->string('tipo', 20)->change(); // primero lo hacemos string para reemplazar el enum
        });

        Schema::table('eventos', function (Blueprint $table) {
            $table->string('lugar', 200)->nullable()->after('fecha');
            $table->decimal('costo', 10, 2)->nullable()->after('lugar');
        });

        // 2. Actualizar tabla `evento_alumno`
        Schema::table('evento_alumno', function (Blueprint $table) {
            $table->boolean('pagado')->default(false)->after('resultado');
            $table->date('fecha_pago')->nullable()->after('pagado');
            $table->boolean('asistio')->default(false)->after('fecha_pago');
        });

        // 3. Crear `examen_alumno`
        Schema::create('examen_alumno', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evento_id')->constrained('eventos')->onDelete('cascade');
            $table->foreignId('alumno_id')->constrained('alumnos')->onDelete('cascade');
            $table->foreignId('grado_actual_id')->constrained('configuraciones_cintas')->onDelete('restrict');
            $table->foreignId('grado_siguiente_id')->constrained('configuraciones_cintas')->onDelete('restrict');
            $table->decimal('costo_examen', 10, 2)->nullable();
            $table->enum('resultado', ['pendiente', 'aprobado', 'reprobado'])->default('pendiente');
            $table->timestamps();
            $table->unique(['evento_id', 'alumno_id']);
        });

        // 4. Crear `historial_grados`
        Schema::create('historial_grados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alumno_id')->constrained('alumnos')->onDelete('cascade');
            $table->foreignId('evento_id')->nullable()->constrained('eventos')->onDelete('set null');
            $table->foreignId('grado_anterior_id')->constrained('configuraciones_cintas')->onDelete('restrict');
            $table->foreignId('grado_nuevo_id')->constrained('configuraciones_cintas')->onDelete('restrict');
            $table->date('fecha_ascenso');
            $table->timestamps();
        });

        // 5. Crear `torneo_alumno`
        Schema::create('torneo_alumno', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evento_id')->constrained('eventos')->onDelete('cascade');
            $table->foreignId('alumno_id')->constrained('alumnos')->onDelete('cascade');
            $table->decimal('costo_torneo', 10, 2)->nullable();
            $table->enum('resultado', ['oro', 'plata', 'bronce', 'eliminado', 'pendiente'])->default('pendiente');
            $table->timestamps();
            $table->unique(['evento_id', 'alumno_id']);
        });

        // 6. Crear `torneo_modalidades`
        Schema::create('torneo_modalidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evento_id')->constrained('eventos')->onDelete('cascade');
            $table->string('nombre', 100); // ej. poomsae, combate, otro
            $table->string('categoria', 100)->nullable(); // ej. infantil, cadete, juvenil, adulto
            $table->timestamps();
        });

        // 7. Crear `torneo_alumno_modalidad`
        Schema::create('torneo_alumno_modalidad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('torneo_alumno_id')->constrained('torneo_alumno')->onDelete('cascade');
            $table->foreignId('modalidad_id')->constrained('torneo_modalidades')->onDelete('cascade');
            $table->enum('resultado', ['oro', 'plata', 'bronce', 'eliminado', 'pendiente'])->default('pendiente');
            $table->timestamps();
            $table->unique(['torneo_alumno_id', 'modalidad_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('torneo_alumno_modalidad');
        Schema::dropIfExists('torneo_modalidades');
        Schema::dropIfExists('torneo_alumno');
        Schema::dropIfExists('historial_grados');
        Schema::dropIfExists('examen_alumno');

        Schema::table('evento_alumno', function (Blueprint $table) {
            $table->dropColumn(['pagado', 'fecha_pago', 'asistio']);
        });

        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn(['lugar', 'costo']);
        });
    }
};
