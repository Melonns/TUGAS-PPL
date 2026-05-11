<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


class Logbook extends Model
{
    use HasFactory;

    protected $table = 'logbooks';
    protected $primaryKey = 'id_logbooks';

    protected $fillable = [
        'user_id',
        'tanggal',
        'deskripsi_kegiatan',
        'bukti_kegiatan',
        'status_verifikasi',
        'verified_by',
        'feedback',
        'verified_at',
        'revision_at',
        'revision_by',
        'submitted_at',
    ];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
        'verified_at' => 'datetime',
        'revision_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function scopeForUser($query, $user)
    {
        return $query->where('user_id', $user->user_id);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by', 'user_id');
    }

    public function scopeStatus($query, $status)
    {
        return $query->where('status_verifikasi', $status);
    }

    public function scopeDraft($query)
    {
        return $query->where('status_verifikasi', 'draft');
    }

    public function scopePending($query)
    {
        return $query->where('status_verifikasi', 'pending');
    }

    public function scopeVerified($query)
    {
        return $query->where('status_verifikasi', 'verified');
    }

    public function scopeRevision($query)
    {
        return $query->where('status_verifikasi', 'revision_needed');
    }

    public function getBuktiKegiatanAttribute($value)
    {
        if (is_null($value)) return [];

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return empty($value) ? [] : [$value];
    }

    public function setBuktiKegiatanAttribute($value)
    {
        if (is_array($value)) {
            $this->attributes['bukti_kegiatan'] = json_encode($value);
        } else {
            $this->attributes['bukti_kegiatan'] = $value;
        }
    }
}
