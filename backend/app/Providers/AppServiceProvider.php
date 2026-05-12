<?php

namespace App\Providers;

use App\Repositories\EloquentLogbookRepository;
use App\Repositories\LogbookRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(LogbookRepositoryInterface::class, EloquentLogbookRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
