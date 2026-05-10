<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Logbook;
use App\Models\User;
use Carbon\Carbon;

class LogbookSeeder extends Seeder
{
    public function run(): void
    {
        $aktivitas = [
            'Mempelajari dokumentasi project dan setup environment development.',
            'Mengikuti onboarding session dan mempelajari arsitektur project.',
            'Setup environment development, konfigurasi IDE, dan git workflow.',
            'Implementasi REST API endpoint untuk fitur absensi.',
            'Membuat database migration dan testing di berbagai environment.',
            'Memperbaiki bug di modul authentication dan authorization.',
            'Implementasi fitur logbooks dengan status verifikasi.',
            'Membuat UI component untuk dashboard menggunakan React.',
            'Implementasi form validation dan error handling untuk login.',
            'Membuat attendance report dashboard dengan chart dan table.',
            'Code review dengan senior developer dan refactoring code.',
            'Database query optimization dan menambahkan indexes.',
            'Testing fitur baru dan membuat comprehensive bug report.',
            'Pair programming dengan senior developer untuk complex feature.',
            'Presentasi progress mingguan kepada tim dan stakeholder.',
        ];

        // Get interns (mahasiswa)
        $interns = User::where('role', 'intern')->get();
        $mentor = User::where('role', 'mentor')->first();

        // Create logbooks for each intern (last 10 working days)
        $startDate = Carbon::now()->subDays(30);
        
        foreach ($interns as $intern) {
            for ($i = 0; $i < 10; $i++) {
                $date = $startDate->copy()->addDays($i);
                
                // Skip weekends
                if ($date->isWeekend()) {
                    $date = $date->nextWeekday();
                }

                $status = $i < 3 ? 'draft' : ($i < 6 ? 'pending' : 'verified');

                Logbook::create([
                    'user_id' => $intern->user_id,
                    'tanggal' => $date,
                    'deskripsi_kegiatan' => $aktivitas[array_rand($aktivitas)],
                    'bukti_kegiatan' => json_encode([]),
                    'status_verifikasi' => $status,
                    'verified_by' => $status === 'verified' ? $mentor?->user_id : null,
                    'verified_at' => $status === 'verified' ? now() : null,
                    'submitted_at' => $status !== 'draft' ? now()->subHours(rand(1, 48)) : null,
                    'feedback' => $status === 'verified' ? 'Bagus, sesuai dengan rencana kerja.' : null,
                ]);
            }
        }

        $this->command->info('✓ Logbook seeder complete');
    }
}
