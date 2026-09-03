<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('alumnos') && Schema::hasColumn('alumnos', 'foto')) {
            Schema::table('alumnos', function (Blueprint $table) {
                $table->text('foto')->nullable()->change();
            });
        }
        if (Schema::hasTable('escuelas') && Schema::hasColumn('escuelas', 'logo_url')) {
            Schema::table('escuelas', function (Blueprint $table) {
                $table->text('logo_url')->nullable()->change();
            });
        }
        if (Schema::hasTable('tenants') && Schema::hasColumn('tenants', 'logo')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->text('logo')->nullable()->change();
            });
        }
        if (Schema::hasTable('instructores') && Schema::hasColumn('instructores', 'foto_url')) {
            Schema::table('instructores', function (Blueprint $table) {
                $table->text('foto_url')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
    }
};
