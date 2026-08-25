<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'tenant_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->onDelete('cascade');
                $table->string('role', 20)->default('owner');
            });
        }

        // Agregar tenant_id a alumnos
        Schema::table('alumnos', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->onDelete('cascade');
            $table->index('tenant_id');
        });

        // Agregar tenant_id a pagos
        Schema::table('pagos', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->onDelete('cascade');
            $table->index('tenant_id');
        });

        // Agregar tenant_id a asistencias
        Schema::table('asistencias', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->onDelete('cascade');
            $table->index('tenant_id');
        });

        // Agregar tenant_id a eventos
        Schema::table('eventos', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->onDelete('cascade');
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        $tables = ['users', 'alumnos', 'pagos', 'asistencias', 'eventos'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign([$tableName === 'users' ? 'tenant_id' : 'tenant_id']);
                $table->dropColumn('tenant_id');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
