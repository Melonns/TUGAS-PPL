<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Logbook;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LogbookUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected $intern;

    protected function setUp(): void
    {
        parent::setUp();

        $this->intern = User::factory()->create([
            'role' => 'intern'
        ]);
    }

    public function test_update_empty_payload_returns_422_validation_error()
    {
        $logbook = Logbook::create([
            'user_id' => $this->intern->user_id,
            'tanggal' => now()->toDateString(),
            'deskripsi_kegiatan' => 'Test logbook',
            'status_verifikasi' => 'draft',
        ]);

        $response = $this->actingAs($this->intern)
            ->putJson("/api/logbook/{$logbook->id_logbooks}", []);

        $response->assertStatus(422);
    }

    public function test_update_logbook_not_found_returns_404()
    {
        $response = $this->actingAs($this->intern)
            ->putJson('/api/logbook/99999', [
                'deskripsi_kegiatan' => 'Update logbook',
                'is_draft' => true,
            ]);

        $response->assertStatus(404);
    }

    public function test_update_locked_logbook_returns_400()
    {
        $logbook = Logbook::create([
            'user_id' => $this->intern->user_id,
            'tanggal' => now()->toDateString(),
            'deskripsi_kegiatan' => 'Locked logbook',
            'status_verifikasi' => 'verified',
        ]);

        $response = $this->actingAs($this->intern)
            ->putJson("/api/logbook/{$logbook->id_logbooks}", [
                'deskripsi_kegiatan' => 'Attempt update',
                'is_draft' => false,
            ]);

        $response->assertStatus(400);
    }

    public function test_update_logbook_as_draft_returns_200()
    {
        $logbook = Logbook::create([
            'user_id' => $this->intern->user_id,
            'tanggal' => now()->toDateString(),
            'deskripsi_kegiatan' => 'Revision logbook',
            'status_verifikasi' => 'revision_needed',
        ]);

        $response = $this->actingAs($this->intern)
            ->putJson("/api/logbook/{$logbook->id_logbooks}", [
                'deskripsi_kegiatan' => 'Updated as draft',
                'is_draft' => true,
            ]);

        $response->assertStatus(200);
    }

    public function test_update_logbook_and_submit_returns_200()
    {
        $logbook = Logbook::create([
            'user_id' => $this->intern->user_id,
            'tanggal' => now()->toDateString(),
            'deskripsi_kegiatan' => 'Revision submit',
            'status_verifikasi' => 'revision_needed',
        ]);

        $response = $this->actingAs($this->intern)
            ->putJson("/api/logbook/{$logbook->id_logbooks}", [
                'deskripsi_kegiatan' => 'Updated and submitted',
                'is_draft' => false,
            ]);

        $response->assertStatus(200);
    }

    public function test_update_logbook_with_new_file_array_returns_200()
    {
        Storage::fake('public');

        $logbook = Logbook::create([
            'user_id' => $this->intern->user_id,
            'tanggal' => now()->toDateString(),
            'deskripsi_kegiatan' => 'File update',
            'status_verifikasi' => 'draft',
            'bukti_kegiatan' => json_encode([
                'storage/logbooks/oldfile.pdf'
            ]),
        ]);

        $file = UploadedFile::fake()->create('evidence.pdf', 100);

        $response = $this->actingAs($this->intern)
            ->put("/api/logbook/{$logbook->id_logbooks}", [
                'deskripsi_kegiatan' => 'Update with file',
                'bukti_kegiatan' => [$file],
                'is_draft' => false,
            ]);

        $response->assertStatus(200);
    }

    public function test_update_logbook_with_new_file_string_returns_200()
    {
        Storage::fake('public');

        $logbook = Logbook::create([
            'user_id' => $this->intern->user_id,
            'tanggal' => now()->toDateString(),
            'deskripsi_kegiatan' => 'File update string',
            'status_verifikasi' => 'draft',
            'bukti_kegiatan' => json_encode([
                'storage/logbooks/oldfile.pdf'
            ]),
        ]);

        $file = UploadedFile::fake()->create('evidence.pdf', 100);

        $response = $this->actingAs($this->intern)
            ->put("/api/logbook/{$logbook->id_logbooks}", [
                'deskripsi_kegiatan' => 'Update replacement file',
                'bukti_kegiatan' => [$file],
                'is_draft' => false,
            ]);

        $response->assertStatus(200);
    }
}