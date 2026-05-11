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

        // Assign interns to mentor
        $mentorUser = User::where('email', 'mentor@test.com')->first();
        $internUsers = User::where('role', 'intern')->get();

        foreach ($internUsers as $intern) {
            \Illuminate\Support\Facades\DB::table('intern_mentors')->updateOrInsert(
                ['intern_id' => $intern->user_id, 'mentor_id' => $mentorUser->user_id],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }
        
        $this->command->info('✓ Mentors assigned to interns');
    }
}
