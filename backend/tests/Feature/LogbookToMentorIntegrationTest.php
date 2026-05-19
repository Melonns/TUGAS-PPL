<?php

namespace Tests\Feature;

use App\Models\Logbook;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LogbookToMentorIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $intern;
    private User $mentor;
    private User $unassignedMentor;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // 1. Create Intern (Mahasiswa Bimbingan)
        $this->intern = User::create([
            'nama' => 'Mahasiswa Intern',
            'email' => 'intern@example.com',
            'password' => bcrypt('password123'),
            'role' => 'intern',
        ]);

        // 2. Create Assigned Mentor (Dosen Pembimbing Sah)
        $this->mentor = User::create([
            'nama' => 'Dosen Pembimbing',
            'email' => 'mentor@example.com',
            'password' => bcrypt('password123'),
            'role' => 'mentor',
        ]);

        // 3. Create Unassigned Mentor (Dosen Lain / Pihak Ketiga)
        $this->unassignedMentor = User::create([
            'nama' => 'Dosen Lain',
            'email' => 'othermentor@example.com',
            'password' => bcrypt('password123'),
            'role' => 'mentor',
        ]);

        // 4. Create Active Mentoring Relationship in intern_mentors table
        DB::table('intern_mentors')->insert([
            'intern_id' => $this->intern->user_id,
            'mentor_id' => $this->mentor->user_id,
            'is_active' => true,
        ]);
        
        DB::table('intern_mentors')->insert([
            'intern_id' => $this->intern->user_id,
            'mentor_id' => $this->unassignedMentor->user_id,
            'is_active' => false, // Inactive relationship
        ]);
    }

    /**
     * INTEGRASI: Logbook Module -> Mentor Dashboard (Success Path)
     * Memvalidasi TC-INSTORE-01
     */
    public function test_integrasi_logbook_to_mentor_success_path(): void
    {
        // 1. Setup Data Tiruan via Laravel Factory & Mock Storage
        $fakeUploadedFile = UploadedFile::fake()->create('evidence_activity.pdf', 2048, 'application/pdf');
        $storedPath = $fakeUploadedFile->store('logbooks', 'public');

        // Membuat data logbook berstatus 'pending' yang terikat dengan mahasiswa bimbingan
        $logbook = Logbook::factory()->create([
            'user_id' => $this->intern->user_id,
            'tanggal' => now()->toDateString(),
            'status_verifikasi' => 'pending',
            'bukti_kegiatan' => $storedPath,
            'deskripsi_kegiatan' => 'Mengimplementasikan middleware keamanan API.',
        ]);

        // Membuat data logbook berstatus 'draft' sebagai pembanding filter data
        Logbook::factory()->create([
            'user_id' => $this->intern->user_id,
            'status_verifikasi' => 'draft',
        ]);

        // 2. Eksekusi TC-INSTORE-01: Akses Daftar Logbook via Test Stub Mentor Sah
        Sanctum::actingAs($this->mentor);
        
        $response = $this->getJson('/api/mentor/logbook');
        
        // Assertions pada API Response (Top-Layer)
        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        // Memastikan logbook yang dibuat ada dalam respons mentor dan berstatus 'pending'
        $data = $response->json('data');

        // Support two possible shapes: direct items array or paginator object
        if (is_array($data) && array_key_exists('data', $data) && is_array($data['data'])) {
            $items = $data['data'];
        } else {
            $items = is_array($data) ? $data : [];
        }

        $this->assertIsArray($items);

        $statuses = array_column($items, 'status_verifikasi');
        $this->assertContains('pending', $statuses, 'Tidak ada logbook berstatus pending dalam respons mentor');

        // Prefer to use the created logbook's id when available for file checks
        $matched = null;
        foreach ($items as $item) {
            if (isset($item['id_logbooks']) && $item['id_logbooks'] == $logbook->id_logbooks) {
                $matched = $item;
                break;
            }
        }

        // 3. Validasi Akses File Evidence pada Rute Terproteksi Proyek
        if ($matched) {
            $evidenceUrl = is_array($matched['bukti_kegiatan'] ?? null) ? ($matched['bukti_kegiatan'][0] ?? null) : ($matched['bukti_kegiatan'] ?? null);
        } else {
            // Jika tidak ditemukan di respons mentor, pakai path yang kita simpan sebelumnya
            $evidenceUrl = $storedPath;
        }

        $this->assertNotNull($evidenceUrl, 'Bukti kegiatan tidak ada pada logbook yang dibuat');

        $filename = basename($evidenceUrl);

        $fileResponse = $this->getJson("/api/logbook/{$logbook->id_logbooks}/file/{$filename}");
        $fileResponse->assertStatus(200);

        // Memastikan file fisik tiruan benar-benar eksis di memori RAM
        Storage::disk('public')->assertExists($storedPath);
    }

    /**
     * INTEGRASI: Logbook Module -> Mentor Dashboard (Forbidden Path)
     * Memvalidasi TC-INSTORE-02
     */
    public function test_integrasi_logbook_to_mentor_forbidden_path(): void
    {
        // 1. Setup Data Tiruan: Logbook Mahasiswa di bawah bimbingan Mentor Utama
        $logbookMahasiswaA = Logbook::factory()->create([
            'user_id' => $this->intern->user_id,
            'status_verifikasi' => 'pending',
        ]);

        // 2. Eksekusi TC-INSTORE-02: Simulasi Akses dari Mentor Lain (Unassigned)
        Sanctum::actingAs($this->unassignedMentor);
        
        // Mentor lain mencoba menembak data logbook user melalui endpoint relasi ilegal
        $response = $this->getJson("/api/mentor/logbook/user/{$this->intern->user_id}");
        
        // Assertions: Sistem harus mengisolasi data dan melempar status 403
        $response->assertStatus(403);
        $response->assertJsonPath('success', false);
        $message = $response->json('message');
        $this->assertTrue(in_array($message, ['Akses ditolak', 'Anda tidak berhak melihat logbooks intern ini']), "Unexpected error message: {$message}");
    }
}