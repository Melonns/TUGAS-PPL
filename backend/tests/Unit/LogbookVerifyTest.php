<?php

namespace Tests\Unit;

use App\Models\Logbook;
use App\Models\User;
use App\Repositories\LogbookRepositoryInterface;
use App\Services\LogbookVerifyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class LogbookVerifyTest extends TestCase
{
    use RefreshDatabase;

    private LogbookRepositoryInterface $repository;

    private LogbookVerifyService $service;

    protected $mentor;
    protected $intern;
    protected $logbook;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = Mockery::mock(
            LogbookRepositoryInterface::class
        );

        $this->app->instance(
            LogbookRepositoryInterface::class,
            $this->repository
        );

        $this->service = $this->app->make(
            LogbookVerifyService::class
        );

        $this->mentor = User::factory()->create([
            'role' => 'mentor',
        ]);

        $this->intern = User::factory()->create([
            'role' => 'intern',
        ]);

        $this->logbook = Logbook::factory()->create([
            'user_id' => $this->intern->user_id,
            'status_verifikasi' => 'pending',
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    public function test_tc_uverify_01_verify_successfully(): void
    {
        DB::table('intern_mentors')->insert([
            'mentor_id' => $this->mentor->user_id,
            'intern_id' => $this->intern->user_id,
            'is_active' => true,
        ]);

        $this->repository->shouldReceive('update')
            ->once()
            ->andReturnUsing(function ($id, $data) {

                $this->logbook->update($data);

                return $this->logbook;
            });

        $result = $this->service->verify(
            $this->mentor,
            $this->logbook->id_logbooks,
            'verified',
            'Sangat baik'
        );

        $this->assertSame(200, $result['status']);

        $this->assertTrue(
            $result['body']['success']
        );

        $this->assertDatabaseHas('logbooks', [
            'id_logbooks' => $this->logbook->id_logbooks,
            'status_verifikasi' => 'verified',
        ]);
    }

    public function test_tc_uverify_02_forbidden_if_not_assigned_mentor(): void
    {
        $mentorLain = User::factory()->create([
            'role' => 'mentor',
        ]);

        $result = $this->service->verify(
            $mentorLain,
            $this->logbook->id_logbooks,
            'verified'
        );

        $this->assertSame(403, $result['status']);

        $this->assertFalse(
            $result['body']['success']
        );
    }

    public function test_tc_uverify_03_invalid_status_validation(): void
    {
        $result = $this->service->verify(
            $this->mentor,
            $this->logbook->id_logbooks,
            'draft'
        );

        $this->assertSame(422, $result['status']);

        $this->assertFalse(
            $result['body']['success']
        );
    }

    public function test_tc_uverify_04_logbook_not_found(): void
    {
        $result = $this->service->verify(
            $this->mentor,
            999999,
            'verified'
        );

        $this->assertSame(404, $result['status']);

        $this->assertFalse(
            $result['body']['success']
        );
    }

    public function test_tc_uverify_05_revision_needed(): void
    {
        DB::table('intern_mentors')->insert([
            'mentor_id' => $this->mentor->user_id,
            'intern_id' => $this->intern->user_id,
            'is_active' => true,
        ]);

        $this->repository->shouldReceive('update')
            ->once()
            ->andReturnUsing(function ($id, $data) {

                $this->logbook->update($data);

                return $this->logbook;
            });

        $result = $this->service->verify(
            $this->mentor,
            $this->logbook->id_logbooks,
            'revision_needed',
            'Perbaiki bagian analisis'
        );

        $this->assertSame(200, $result['status']);

        $this->assertTrue(
            $result['body']['success']
        );

        $this->assertDatabaseHas('logbooks', [
            'id_logbooks' => $this->logbook->id_logbooks,
            'status_verifikasi' => 'revision_needed',
        ]);
    }
}