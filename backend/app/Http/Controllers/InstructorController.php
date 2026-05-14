<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInstructorRequest;
use App\Http\Requests\UpdateInstructorRequest;
use App\Models\Instructor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InstructorController extends Controller
{
    public function index()
    {
        return response()->json(Instructor::with('cintaConfig')->orderBy('nombre')->get());
    }

    public function store(StoreInstructorRequest $request)
    {
        $validated = $request->validated();

        if ($request->hasFile('foto')) {
            $validated['foto_url'] = $request->file('foto')->store('instructores', 'public');
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
                Storage::disk('public')->delete($instructor->foto_url);
            }
            $data['foto_url'] = null;
        }

        if ($request->hasFile('foto')) {
            if ($instructor->foto_url) {
                Storage::disk('public')->delete($instructor->foto_url);
            }
            $data['foto_url'] = $request->file('foto')->store('instructores', 'public');
        }

        $instructor->fill($data);
        $instructor->save();

        return response()->json($instructor->load('cintaConfig'));
    }

    public function destroy(Instructor $instructor)
    {
        if ($instructor->foto_url) {
            Storage::disk('public')->delete($instructor->foto_url);
        }
        $instructor->delete();
        return response()->json(['message' => 'Instructor eliminado correctamente']);
    }
}
