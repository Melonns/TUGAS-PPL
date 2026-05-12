<?php

namespace Tests\Unit;

use App\Models\Logbook;
use App\Models\User;
use App\Repositories\LogbookRepositoryInterface;
use App\Services\LogbookStoreService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class LogbookStoreServiceTest extends TestCase
{
    use RefreshDatabase;

    private LogbookRepositoryInterface $repository;

    private LogbookStoreService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->repository = Mockery::mock(LogbookRepositoryInterface::class);
        $this->app->instance(LogbookRepositoryInterface::class, $this->repository);
        $this->service = $this->app->make(LogbookStoreService::class);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function makeUser(): User
    {
        $user = new User();
        $user->forceFill([
            'user_id' => 1,
            'nama' => 'Mahasiswa Uji',
            'email' => 'mahasiswa-uji@example.com',
            'password' => 'password123',
            'role' => 'intern',
        ]);

        return $user;
    }

    private function makeLogbook(User $user, string $date, string $status, array $attributes = []): Logbook
    {
        $logbook = new Logbook();
        $logbook->forceFill(array_merge([
            'id_logbooks' => 10,
            'user_id' => $user->user_id,
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Deskripsi lama',
            'bukti_kegiatan' => [],
            'status_verifikasi' => $status,
            'submitted_at' => $status === 'draft' ? null : Carbon::now()->subDay(),
        ], $attributes));

        return $logbook;
    }

    public function test_tc_ustore_01_validasi_gagal_tanpa_file(): void
    {
        $user = $this->makeUser();

        $result = $this->service->store($user, [
            'tanggal' => '',
            'deskripsi_kegiatan' => '',
            'is_draft' => false,
        ]);

        $this->assertSame(422, $result['status']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('tanggal', $result['body']['errors']->toArray());
        $this->assertArrayHasKey('deskripsi_kegiatan', $result['body']['errors']->toArray());
    }

    public function test_tc_ustore_02_validasi_gagal_ada_file(): void
    {
        $user = $this->makeUser();
        $file = UploadedFile::fake()->create('bukti.pdf', 100, 'application/pdf');

        $result = $this->service->store($user, [
            'tanggal' => 'not-a-date',
            'deskripsi_kegiatan' => 'Kegiatan valid',
            'is_draft' => false,
        ], [$file]);

        $this->assertSame(422, $result['status']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('tanggal', $result['body']['errors']->toArray());
    }

    public function test_tc_ustore_03_data_terkunci(): void
    {
        $user = $this->makeUser();
        $date = now()->subDay()->toDateString();
        $existing = $this->makeLogbook($user, $date, 'pending');

        $this->repository->shouldReceive('findExistingForUserOnDate')
            ->once()
            ->andReturn($existing);

        $this->repository->shouldNotReceive('update');
        $this->repository->shouldNotReceive('create');

        $result = $this->service->store($user, [
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Kegiatan baru',
            'is_draft' => false,
        ]);

        $this->assertSame(400, $result['status']);
        $this->assertFalse($result['body']['success']);
        $this->assertSame('Status Locked', $result['body']['message']);
    }

    public function test_tc_ustore_04_update_teks_saja(): void
    {
        $user = $this->makeUser();
        $date = now()->subDays(2)->toDateString();
        $existing = $this->makeLogbook($user, $date, 'draft', [
            'deskripsi_kegiatan' => 'Teks lama',
            'bukti_kegiatan' => ['storage/logbooks/old-bukti.pdf'],
            'submitted_at' => null,
        ]);

        $this->repository->shouldReceive('findExistingForUserOnDate')
            ->once()
            ->andReturn($existing);

        $this->repository->shouldReceive('update')
            ->once()
            ->with($existing, Mockery::on(function (array $data) {
                return $data['deskripsi_kegiatan'] === 'Teks baru saja'
                    && $data['status_verifikasi'] === 'draft'
                    && $data['submitted_at'] === null
                    && $data['feedback'] === null
                    && !array_key_exists('bukti_kegiatan', $data);
            }))
            ->andReturn($existing);

        $result = $this->service->store($user, [
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Teks baru saja',
            'is_draft' => true,
        ]);

        $this->assertSame(200, $result['status']);
        $this->assertTrue($result['body']['success']);
        Storage::disk('public')->assertDirectoryEmpty('logbooks');
    }

    public function test_tc_ustore_05_update_teks_dan_file(): void
    {
        $user = $this->makeUser();
        $date = now()->subDays(3)->toDateString();
        $existing = $this->makeLogbook($user, $date, 'draft', [
            'deskripsi_kegiatan' => 'Teks lama',
            'bukti_kegiatan' => ['storage/logbooks/old-bukti.pdf'],
            'submitted_at' => null,
        ]);

        Storage::disk('public')->put('logbooks/old-bukti.pdf', 'old-content');
        $newFile = UploadedFile::fake()->create('bukti-baru.pdf', 100, 'application/pdf');

        $this->repository->shouldReceive('findExistingForUserOnDate')
            ->once()
            ->andReturn($existing);

        $this->repository->shouldReceive('update')
            ->once()
            ->andReturnUsing(function (Logbook $logbook, array $data) {
                $logbook->fill($data);
                return $logbook;
            });

        $result = $this->service->store($user, [
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Teks baru dan file baru',
            'is_draft' => false,
        ], [$newFile]);

        $this->assertSame(200, $result['status']);
        $this->assertTrue($result['body']['success']);
        Storage::disk('public')->assertMissing('logbooks/old-bukti.pdf');
        $storedFiles = Storage::disk('public')->allFiles('logbooks');
        $this->assertCount(1, $storedFiles);
        $this->assertStringEndsWith('.pdf', $storedFiles[0]);
    }

    public function test_tc_ustore_06_insert_tanpa_file(): void
    {
        $user = $this->makeUser();
        $date = now()->subDays(4)->toDateString();

        $this->repository->shouldReceive('findExistingForUserOnDate')
            ->once()
            ->andReturnNull();

        $this->repository->shouldReceive('create')
            ->once()
            ->with(Mockery::on(function (array $data) use ($user, $date) {
                return $data['user_id'] === $user->user_id
                    && $data['tanggal'] === $date
                    && $data['deskripsi_kegiatan'] === 'Logbook baru tanpa file'
                    && $data['status_verifikasi'] === 'pending'
                    && $data['submitted_at'] instanceof Carbon
                    && $data['bukti_kegiatan'] === [];
            }))
            ->andReturn(new Logbook());

        $result = $this->service->store($user, [
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Logbook baru tanpa file',
            'is_draft' => false,
        ]);

        $this->assertSame(201, $result['status']);
        $this->assertTrue($result['body']['success']);
        Storage::disk('public')->assertDirectoryEmpty('logbooks');
    }

    public function test_tc_ustore_07_insert_dengan_file(): void
    {
        $user = $this->makeUser();
        $date = now()->subDays(5)->toDateString();
        $file = UploadedFile::fake()->create('bukti.pdf', 100, 'application/pdf');

        $this->repository->shouldReceive('findExistingForUserOnDate')
            ->once()
            ->andReturnNull();

        $this->repository->shouldReceive('create')
            ->once()
            ->andReturnUsing(function (array $data) {
                $logbook = new Logbook();
                $logbook->fill($data);
                return $logbook;
            });

        $result = $this->service->store($user, [
            'tanggal' => $date,
            'deskripsi_kegiatan' => 'Logbook baru dengan file',
            'is_draft' => false,
        ], [$file]);

        $this->assertSame(201, $result['status']);
        $this->assertTrue($result['body']['success']);
        $storedFiles = Storage::disk('public')->allFiles('logbooks');
        $this->assertCount(1, $storedFiles);
        $this->assertStringEndsWith('.pdf', $storedFiles[0]);
    }
}