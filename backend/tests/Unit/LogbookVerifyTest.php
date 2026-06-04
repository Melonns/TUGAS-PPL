<?php

namespace Tests\Unit;

use App\Models\Logbook;
use App\Models\User;
use App\Repositories\LogbookRepositoryInterface;
use App\Services\LogbookVerifyService;
use Mockery;
use Tests\TestCase;

class LogbookVerifyTest extends TestCase
{
    private LogbookRepositoryInterface $repository;
    private LogbookVerifyService $service;

    protected User $mentor;
    protected User $intern;
    protected Logbook $logbookInstance;

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

        $this->mentor = $this->makeUser(1, 'mentor');
        $this->intern = $this->makeUser(2, 'intern');

        $this->logbookInstance = new Logbook();

        $this->logbookInstance->forceFill([
            'id_logbooks' => 10,
            'user_id' => $this->intern->user_id,
            'status_verifikasi' => 'pending',
            'feedback' => null,
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function makeUser(int $id, string $role): User
    {
        $user = Mockery::mock(User::class)->makePartial();

        $user->forceFill([
            'user_id' => $id,
            'nama' => 'User Uji ' . ucfirst($role),
            'email' => $role . '@example.com',
            'role' => $role,
        ]);

        $user->shouldReceive('isAdmin')
            ->andReturn($role === 'admin');

        return $user;
    }

    public function test_tc_uverify_01_verify_successfully(): void
    {
        $this->repository
            ->shouldReceive('findById')
            ->once()
            ->with(10)
            ->andReturn($this->logbookInstance);

        $this->repository
            ->shouldReceive('isMentorAssigned')
            ->once()
            ->with(
                $this->mentor->user_id,
                $this->intern->user_id
            )
            ->andReturn(true);

        $this->repository
            ->shouldReceive('update')
            ->once()
            ->andReturnUsing(function ($id, $data) {
                $this->logbookInstance->forceFill($data);
                return $this->logbookInstance;
            });

        $result = $this->service->verify(
            $this->mentor,
            10,
            'verified',
            'Sangat baik'
        );

        $this->assertSame(200, $result['status']);
        $this->assertTrue($result['body']['success']);
        $this->assertSame(
            'verified',
            $this->logbookInstance->status_verifikasi
        );
    }

    public function test_tc_uverify_02_forbidden_if_not_assigned_mentor(): void
    {
        $mentorLain = $this->makeUser(3, 'mentor');

        $this->repository
            ->shouldReceive('findById')
            ->once()
            ->with(10)
            ->andReturn($this->logbookInstance);

        $this->repository
            ->shouldReceive('isMentorAssigned')
            ->once()
            ->with(
                $mentorLain->user_id,
                $this->intern->user_id
            )
            ->andReturn(false);

        $this->repository->shouldNotReceive('update');

        $result = $this->service->verify(
            $mentorLain,
            10,
            'verified'
        );

        $this->assertSame(403, $result['status']);
        $this->assertFalse($result['body']['success']);
    }

    public function test_tc_uverify_03_invalid_status_validation(): void
    {
        $this->repository->shouldNotReceive('findById');
        $this->repository->shouldNotReceive('update');

        $result = $this->service->verify(
            $this->mentor,
            10,
            'draft'
        );

        $this->assertSame(422, $result['status']);
        $this->assertFalse($result['body']['success']);
    }

    public function test_tc_uverify_04_logbook_not_found(): void
    {
        $this->repository
            ->shouldReceive('findById')
            ->once()
            ->with(999999)
            ->andReturn(null);

        $this->repository->shouldNotReceive('update');

        $result = $this->service->verify(
            $this->mentor,
            999999,
            'verified'
        );

        $this->assertSame(404, $result['status']);
        $this->assertFalse($result['body']['success']);
    }

    public function test_tc_uverify_05_revision_needed(): void
    {
        $this->repository
            ->shouldReceive('findById')
            ->once()
            ->with(10)
            ->andReturn($this->logbookInstance);

        $this->repository
            ->shouldReceive('isMentorAssigned')
            ->once()
            ->with(
                $this->mentor->user_id,
                $this->intern->user_id
            )
            ->andReturn(true);

        $this->repository
            ->shouldReceive('update')
            ->once()
            ->andReturnUsing(function ($id, $data) {
                $this->logbookInstance->forceFill($data);
                return $this->logbookInstance;
            });

        $result = $this->service->verify(
            $this->mentor,
            10,
            'revision_needed',
            'Perbaiki bagian analisis'
        );

        $this->assertSame(200, $result['status']);
        $this->assertTrue($result['body']['success']);
        $this->assertSame(
            'revision_needed',
            $this->logbookInstance->status_verifikasi
        );
    }
}