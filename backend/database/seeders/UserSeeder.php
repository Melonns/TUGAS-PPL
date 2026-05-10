<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Seed simple test accounts
     * 
     * Users:
     * - Mentor/Dosen: mentor@test.com / password123
     * - Mahasiswa 1: mahasiswa1@test.com / password123
     * - Mahasiswa 2: mahasiswa2@test.com / password123
     */
    public function run(): void
    {
        // Mentor/Dosen
        User::updateOrCreate(
            ['email' => 'mentor@test.com'],
            [
                'nama' => 'Dosen Pembimbing',
                'password' => Hash::make('password123'),
                'role' => 'mentor',
            ]
        );

        // Mahasiswa 1
        User::updateOrCreate(
            ['email' => 'mahasiswa1@test.com'],
            [
                'nama' => 'Budi Santoso',
                'password' => Hash::make('password123'),
                'role' => 'intern',
            ]
        );

        // Mahasiswa 2
        User::updateOrCreate(
            ['email' => 'mahasiswa2@test.com'],
            [
                'nama' => 'Siti Nurhaliza',
                'password' => Hash::make('password123'),
                'role' => 'intern',
            ]
        );

        $this->command->info('✓ User accounts created');
    }
}
