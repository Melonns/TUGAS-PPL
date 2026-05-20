<?php

namespace Tests\Unit\Services;

use App\Models\Logbook;
use App\Models\User;
use App\Repositories\LogbookRepositoryInterface;
use App\Services\LogbookUpdateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class LogBookUpdateTest extends TestCase
{
    use RefreshDatabase;

    private LogbookRepositoryInterface $repository;
    private LogbookUpdateService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = Mockery::mock(LogbookRepositoryInterface::class);

        $this->service = new LogbookUpdateService(
            $this->repository
        );
    }


    public function test_tc_uupdate_01_validation()
    {
        $user = User::factory()->create();
        
        $input = [
            'deskripsi_kegiatan' => '',
            'is_draft' => false
        ];

        $result = $this->service->update($user, 1, $input);

        $this->assertEquals(422, $result['status']);
        $this->assertFalse($result['body']['success']);
        $this->assertArrayHasKey('errors', $result['body']);
    }


    public function test_tc_uupdate_02_logbook_not_found()
    {
        $user = User::factory()->create();

        $input = [
            'deskripsi_kegiatan' => 'Kegiatan testing',
            'is_draft' => false
        ];

        $result = $this->service->update($user, 999, $input);

        $this->assertEquals(404, $result['status']);
        $this->assertFalse($result['body']['success']);
        $this->assertEquals(
            'Logbook tidak ditemukan',
            $result['body']['message']
        );
    }


    public function test_tc_uupdate_03_update_fails_when_status_verified()
    {
        $user = User::factory()->create();

        $logbook = Logbook::factory()->create([
            'user_id' => $user->user_id,
            'status_verifikasi' => 'verified'
        ]);

        $input = [
            'deskripsi_kegiatan' => 'Update kegiatan',
            'is_draft' => false
        ];

        $result = $this->service->update(
            $user,
            $logbook->id_logbooks,
            $input
        );

        $this->assertEquals(400, $result['status']);
        $this->assertFalse($result['body']['success']);

        $this->assertStringContainsString(
            'tidak dapat diubah',
            $result['body']['message']
        );
    }


    public function test_tc_uupdate_04_update_success()
    {
        Storage::fake('public');

        $user = User::factory()->create();

        $logbook = Logbook::factory()->create([
            'user_id' => $user->user_id,
            'status_verifikasi' => 'draft'
        ]);

        $file = UploadedFile::fake()->create(
            'bukti.jpg',
            100,
            'image/jpeg'
        );

        $input = [
            'deskripsi_kegiatan' => 'Kegiatan dengan file',
            'is_draft' => false
        ];

        $this->repository
            ->shouldReceive('update')
            ->once()
            ->andReturn($logbook);

        $result = $this->service->update(
            $user,
            $logbook->id_logbooks,
            $input,
            [$file]
        );

        $this->assertEquals(200, $result['status']);
        $this->assertTrue($result['body']['success']);

        $this->assertCount(
            1,
            Storage::disk('public')->files('logbooks')
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}