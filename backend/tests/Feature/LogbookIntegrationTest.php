<?php

namespace Tests\Feature;

use App\Models\Logbook;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LogbookIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $intern;
    private User $mentor;
    private User $unassignedMentor;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // 1. Create Intern
        $this->intern = User::create([
            'nama' => 'Mahasiswa Intern',
            'email' => 'intern@example.com',
            'password' => bcrypt('password123'),
            'role' => 'intern',
        ]);

        // 2. Create Assigned Mentor
        $this->mentor = User::create([
            'nama' => 'Dosen Pembimbing',
            'email' => 'mentor@example.com',
            'password' => bcrypt('password123'),
            'role' => 'mentor',
        ]);

        // 3. Create Unassigned Mentor
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
     * INTEGRASI: Mentor Verification -> Logbook Module (Locking)
     * Menjamin keputusan verifikasi mentor (Approved / Verified) mengubah status data dan mengunci hak akses intern.
     */
    public function test_integrasi_mentor_to_logbook_verified_locks_intern(): void
    {
        // --- STEP 1: Intern membuat logbook PENDING ---
        Sanctum::actingAs($this->intern);
        $date = Carbon::today()->toDateString();
        $response = $this->postJson('/api/logbook', [
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Logbook Untuk Diverifikasi',
            'is_draft' => false,
        ]);
        $logbookId = $response->json('data.id_logbooks');

        // --- STEP 2: Mentor menyetujui (VERIFIED) logbook tersebut ---
        Sanctum::actingAs($this->mentor);
        $response = $this->postJson("/api/mentor/logbook/{$logbookId}/verify", [
            'status_verifikasi' => 'verified',
            'feedback' => 'Kerja bagus!',
        ]);
        $response->assertStatus(200);

        // Verifikasi database
        $this->assertDatabaseHas('logbooks', [
            'id_logbooks' => $logbookId,
            'status_verifikasi' => 'verified',
            'feedback' => 'Kerja bagus!',
            'verified_by' => $this->mentor->user_id,
        ]);

        // --- STEP 3: Intern mencoba mengubah logbook yang sudah diverifikasi (LOCKED) ---
        Sanctum::actingAs($this->intern);
        
        // Coba Update -> Harus Ditolak (400 Bad Request)
        $response = $this->putJson("/api/logbook/{$logbookId}", [
            'deskripsi_kegiatan' => 'Mencoba meretas kegiatan yang disetujui',
            'is_draft' => false,
        ]);
        $response->assertStatus(400);
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('message', 'Logbook dengan status verified tidak dapat diubah');

        // Coba Delete -> Harus Ditolak (400 Bad Request)
        $response = $this->deleteJson("/api/logbook/{$logbookId}");
        $response->assertStatus(400);
        $response->assertJsonPath('success', false);
    }

    /**
     * INTEGRASI: Mentor Verification -> Logbook Module (Revision Unlocking)
     * Menjamin keputusan verifikasi mentor (Revision Needed) membuka status data dan memperbolehkan intern mengedit & resubmit.
     */
    public function test_integrasi_mentor_to_logbook_revision_unlocks_intern(): void
    {
        // --- STEP 1: Intern membuat logbook PENDING ---
        Sanctum::actingAs($this->intern);
        $date = Carbon::today()->toDateString();
        $response = $this->postJson('/api/logbook', [
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Logbook Perlu Revisi',
            'is_draft' => false,
        ]);
        $logbookId = $response->json('data.id_logbooks');

        // --- STEP 2: Mentor meminta REVISI (revision_needed) ---
        Sanctum::actingAs($this->mentor);
        $response = $this->postJson("/api/mentor/logbook/{$logbookId}/verify", [
            'status_verifikasi' => 'revision_needed',
            'feedback' => 'Tolong jelaskan lebih detail bagian implementasi.',
        ]);
        $response->assertStatus(200);

        // Verifikasi database
        $this->assertDatabaseHas('logbooks', [
            'id_logbooks' => $logbookId,
            'status_verifikasi' => 'revision_needed',
            'feedback' => 'Tolong jelaskan lebih detail bagian implementasi.',
            'revision_by' => $this->mentor->user_id,
        ]);

        // --- STEP 3: Intern merevisi dan mengajukan ulang (UNLOCKED) ---
        Sanctum::actingAs($this->intern);
        
        $response = $this->putJson("/api/logbook/{$logbookId}", [
            'deskripsi_kegiatan' => 'Logbook Revisi: Menambahkan detail implementasi middleware.',
            'is_draft' => false,
        ]);
        
        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('message', 'Logbook berhasil diajukan untuk verifikasi');

        // Verifikasi database: Status kembali PENDING dan feedback terhapus (siap diperiksa ulang)
        $this->assertDatabaseHas('logbooks', [
            'id_logbooks' => $logbookId,
            'status_verifikasi' => 'pending',
            'feedback' => null,
            'deskripsi_kegiatan' => 'Logbook Revisi: Menambahkan detail implementasi middleware.',
        ]);
    }
}
