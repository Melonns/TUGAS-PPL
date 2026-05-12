<?php

namespace Database\Factories;

use App\Models\Logbook;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LogbookFactory extends Factory
{
    protected $model = Logbook::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'tanggal' => $this->faker->date(),
            'deskripsi_kegiatan' => $this->faker->sentence(10),
            'status_verifikasi' => 'draft',
            'bukti_kegiatan' => [],
            'feedback' => null,
            'submitted_at' => null,
            'verified_at' => null,
            'verified_by' => null,
            'revision_at' => null,
            'revision_by' => null,
        ];
    }
}
