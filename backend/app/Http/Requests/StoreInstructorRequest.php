<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreInstructorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'                 => 'required|string|max:100',
            'apellido_paterno'       => 'required|string|max:100',
            'apellido_materno'       => 'nullable|string|max:100',
            'fecha_nacimiento'       => 'nullable|date',
            'telefono'               => 'nullable|string|max:20',
            'foto'                   => 'nullable|image|max:2048',
            'configuracion_cinta_id' => 'nullable|exists:configuraciones_cintas,id',
        ];
    }
}
