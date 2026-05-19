<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Logbook;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LogbookVerifyTest extends TestCase
{
    use RefreshDatabase;

    protected $authorizedMentor;
    protected $intern;
    protected $logbook;

    protected function setUp(): void
    {
        parent::setUp();

        // Mentor
        $this->authorizedMentor = User::factory()->create([
            'role' => 'mentor'
        ]);

        // Intern
        $this->intern = User::factory()->create([
            'role' => 'intern'
        ]);

        // Relasi mentor - intern
        DB::table('intern_mentors')->insert([
            'mentor_id' => $this->authorizedMentor->user_id,
            'intern_id' => $this->intern->user_id,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Logbook milik intern
        $this->logbook = Logbook::factory()->create([
            'user_id' => $this->intern->user_id,
            'status_verifikasi' => 'pending'
        ]);
    }

    public function test_it_fails_validation_if_status_is_invalid()
    {
        $response = $this->actingAs($this->authorizedMentor)
            ->postJson("/api/mentor/logbook/{$this->logbook->id_logbooks}/verify", [
                'status_verifikasi' => 'draft',
                'feedback' => 'Coba lagi'
            ]);

        $response->assertStatus(422);
    }

    public function test_it_returns_404_if_logbook_not_found()
    {
        $response = $this->actingAs($this->authorizedMentor)
            ->postJson("/api/mentor/logbook/999999/verify", [
                'status_verifikasi' => 'verified'
            ]);

        $response->assertStatus(404);
    }

    public function test_it_denies_access_if_user_is_not_the_assigned_mentor()
    {
        $mentorLain = User::factory()->create([
            'role' => 'mentor'
        ]);

        $response = $this->actingAs($mentorLain)
            ->postJson("/api/mentor/logbook/{$this->logbook->id_logbooks}/verify", [
                'status_verifikasi' => 'verified'
            ]);

        $response->assertStatus(403);
    }

    public function test_it_successfully_verifies_logbook_with_verified_status()
    {
        $response = $this->actingAs($this->authorizedMentor)
            ->postJson("/api/mentor/logbook/{$this->logbook->id_logbooks}/verify", [
                'status_verifikasi' => 'verified',
                'feedback' => 'Sangat baik'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('logbooks', [
            'id_logbooks' => $this->logbook->id_logbooks,
            'status_verifikasi' => 'verified',
            'verified_by' => $this->authorizedMentor->user_id,
        ]);
    }

    public function test_it_successfully_updates_status_to_revision_needed()
    {
        $response = $this->actingAs($this->authorizedMentor)
            ->postJson("/api/mentor/logbook/{$this->logbook->id_logbooks}/verify", [
                'status_verifikasi' => 'revision_needed',
                'feedback' => 'Perbaiki bagian analisis'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('logbooks', [
            'id_logbooks' => $this->logbook->id_logbooks,
            'status_verifikasi' => 'revision_needed',
            'revision_by' => $this->authorizedMentor->user_id,
        ]);
    }
}