<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternMentor extends Model
{
    protected $table = 'intern_mentors';

    protected $fillable = [
        'intern_id',
        'mentor_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the intern user.
     */
    public function intern(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intern_id', 'user_id');
    }

    /**
     * Get the mentor user.
     */
    public function mentor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mentor_id', 'user_id');
    }
}
