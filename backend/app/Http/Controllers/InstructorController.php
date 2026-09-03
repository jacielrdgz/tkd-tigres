<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInstructorRequest;
use App\Http\Requests\UpdateInstructorRequest;
use App\Models\Instructor;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InstructorController extends Controller
{
    public function index()
    {
        return response()->json(Instructor::with('cintaConfig')->orderBy('nombre')->get());
    }

    public function store(StoreInstructorRequest $request)
    {
        $validated = $request->validated();

        if ($request->hasFile('foto') && $request->file('foto')->isValid()) {
            $file = $request->file('foto');
            $customName = 'instructor_' . time() . '_' . Str::random(6) . '.' . ($file->getClientOriginalExtension() ?: 'jpg');
            $tenantNombre = auth()->user()?->tenant?->nombre ?? 'tigres-do';
            $validated['foto_url'] = SupabaseStorageService::upload($file, 'instructores', $customName, $tenantNombre);
        }

        $instructor = Instructor::create($validated);
        return response()->json($instructor->load('cintaConfig'), 201);
    }

    public function show(Instructor $instructor)
    {
        return response()->json($instructor->load('cintaConfig'));
    }

    public function update(UpdateInstructorRequest $request, Instructor $instructor)
    {
        $data = $request->validated();

        if ($request->has('eliminar_foto') && $request->eliminar_foto) {
            if ($instructor->foto_url) {
                SupabaseStorageService::delete($instructor->foto_url);
            }
            $data['foto_url'] = null;
        }

        if ($request->hasFile('foto') && $request->file('foto')->isValid()) {
            if ($instructor->foto_url) {
                SupabaseStorageService::delete($instructor->foto_url);
            }
            $file = $request->file('foto');
            $customName = 'instructor_' . $instructor->id . '_' . time() . '.' . ($file->getClientOriginalExtension() ?: 'jpg');
            $tenantNombre = $instructor->tenant?->nombre ?? auth()->user()?->tenant?->nombre ?? 'tigres-do';
            $data['foto_url'] = SupabaseStorageService::upload($file, 'instructores', $customName, $tenantNombre);
        }

        $instructor->fill($data);
        $instructor->save();

        return response()->json($instructor->load('cintaConfig'));
    }

    public function destroy(Instructor $instructor)
    {
        if ($instructor->foto_url) {
            SupabaseStorageService::delete($instructor->foto_url);
        }
        $instructor->delete();
        return response()->json(['message' => 'Instructor eliminado correctamente']);
    }
}
