<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LogbookController;

// Public routes (no auth required)
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (auth:sanctum required)
Route::middleware('auth:sanctum')->group(function () {
    // Auth endpoints
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Logbook endpoints
    Route::prefix('logbook')->group(function () {
        Route::get('/', [LogbookController::class, 'index']);
        Route::post('/', [LogbookController::class, 'store']);
        Route::get('/{id}/file/{filename}', [LogbookController::class, 'getFile'])->where('filename', '.*')->whereNumber('id');
        Route::get('/summary/{id}', [LogbookController::class, 'progressForMentor'])->whereNumber('id');
        Route::get('/{id}', [LogbookController::class, 'show'])->whereNumber('id');
        Route::put('/{id}', [LogbookController::class, 'update'])->whereNumber('id');
        Route::post('/{id}', [LogbookController::class, 'update'])->whereNumber('id');
        Route::delete('/{id}', [LogbookController::class, 'destroy'])->whereNumber('id');
    });

    // Mentor routes
    Route::prefix('mentor')->group(function () {
        Route::get('/logbook', [LogbookController::class, 'listForMentor']);
        Route::get('/logbook/progress', [LogbookController::class, 'progressForMentor']);
        Route::get('/logbook/user/{user_id}', [LogbookController::class, 'listByIntern'])->whereNumber('user_id');
        Route::post('/logbook/{id}/verify', [LogbookController::class, 'verify'])->whereNumber('id');
    });

    // Admin routes
    Route::prefix('admin')->group(function () {
        Route::get('/logbook', [LogbookController::class, 'listAll']);
    });
});
