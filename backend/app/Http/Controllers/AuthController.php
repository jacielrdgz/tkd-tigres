<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Login — devuelve token Sanctum + datos del usuario + tenant.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Credenciales incorrectas'
            ], 401);
        }

        $token = $user->createToken('tkd-token')->plainTextToken;

        return response()->json([
            'token'  => $token,
            'user'   => $user->load('tenant'),
        ]);
    }

    /**
     * Logout — revoca el token actual.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada'
        ]);
    }

    /**
     * Me — devuelve el usuario autenticado con su tenant.
     */
    public function me(Request $request)
    {
        return response()->json(
            $request->user()->load('tenant')
        );
    }
}