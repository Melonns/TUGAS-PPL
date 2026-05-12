<?php

namespace App\Repositories;

use App\Models\Logbook;
use App\Models\User;

class EloquentLogbookRepository implements LogbookRepositoryInterface
{
    public function findExistingForUserOnDate(User $user, string $tanggal): ?Logbook
    {
        return Logbook::forUser($user)
            ->where('tanggal', $tanggal)
            ->first();
    }

    public function create(array $attributes): Logbook
    {
        return Logbook::create($attributes);
    }

    public function update(int $id, array $attributes): Logbook
    {
        $logbook = Logbook::find($id);
        if (!$logbook) {
            throw new \Exception("Logbook with id {$id} not found");
        }
        $logbook->update($attributes);

        return $logbook->fresh();
    }
}