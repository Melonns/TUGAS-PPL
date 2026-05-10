<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\LogbookController;

Route::middleware('auth:sanctum')->group(function () {
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

    Route::prefix('mentor')->group(function () {
        Route::get('/logbook', [LogbookController::class, 'listForMentor']);
        Route::get('/logbook/progress', [LogbookController::class, 'progressForMentor']);
        Route::get('/logbook/user/{user_id}', [LogbookController::class, 'listByIntern'])->whereNumber('user_id');
        Route::post('/logbook/{id}/verify', [LogbookController::class, 'verify'])->whereNumber('id');
    });

    Route::prefix('admin')->group(function () {
        Route::get('/logbook', [LogbookController::class, 'listAll']);
    });
});
