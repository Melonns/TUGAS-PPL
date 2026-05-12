<?php

namespace App\Repositories;

use App\Models\Logbook;
use App\Models\User;

interface LogbookRepositoryInterface
{
    public function findExistingForUserOnDate(User $user, string $tanggal): ?Logbook;

    public function create(array $attributes): Logbook;

    public function update(Logbook $logbook, array $attributes): Logbook;
}