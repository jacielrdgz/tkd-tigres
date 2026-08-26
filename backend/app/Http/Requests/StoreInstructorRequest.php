<?php

namespace App\Http\Requests;

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
            'foto'                   => 'nullable|max:10240',
            'configuracion_cinta_id' => 'nullable|exists:configuraciones_cintas,id',
        ];
    }

    protected function prepareForValidation(): void
    {
        $fields = ['apellido_materno', 'fecha_nacimiento', 'telefono', 'configuracion_cinta_id'];
        $merges = [];
        foreach ($fields as $field) {
            if ($this->has($field) && ($this->input($field) === '' || $this->input($field) === 'null' || $this->input($field) === 'undefined')) {
                $merges[$field] = null;
            }
        }
        if (!empty($merges)) {
            $this->merge($merges);
        }
    }
}
