<?php

namespace App\Services;

use App\Models\Logbook;
use App\Models\User;
use App\Repositories\LogbookRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class LogbookStoreService
{
    public function __construct(private readonly LogbookRepositoryInterface $repository)
    {
    }

    public function store(User $user, array $input, array $uploadedFiles = []): array
    {
        $payload = $input;
        $isDraft = (bool) ($input['is_draft'] ?? false);

        $normalizedFiles = array_values(array_filter($uploadedFiles, fn ($file) => $file instanceof UploadedFile));
        if (!empty($normalizedFiles)) {
            $payload['bukti_kegiatan'] = $normalizedFiles;
        } else {
            unset($payload['bukti_kegiatan']);
        }

        $validator = Validator::make($payload, [
            'tanggal' => 'required|date|before_or_equal:today',
            'deskripsi_kegiatan' => $isDraft ? 'nullable|string|max:5000' : 'required|string|max:5000',
            'bukti_kegiatan' => 'nullable',
            'bukti_kegiatan.*' => 'file|mimes:jpg,jpeg,png,pdf|max:51200',
            'is_draft' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return [
                'status' => 422,
                'body' => ['errors' => $validator->errors()],
            ];
        }

        $existing = $this->repository->findExistingForUserOnDate($user, (string) $input['tanggal']);

        if ($existing instanceof Logbook) {
            if (!in_array($existing->status_verifikasi, ['rejected', 'revision_needed', 'draft'], true)) {
                return [
                    'status' => 400,
                    'body' => [
                        'success' => false,
                        'message' => 'Status Locked',
                        'existing_logbooks' => $existing,
                    ],
                ];
            }

            $buktiPaths = [];
            if (!empty($normalizedFiles)) {
                $this->deleteExistingEvidence($existing->bukti_kegiatan);
                $buktiPaths = $this->storeEvidenceFiles($normalizedFiles);
            }

            $updateData = [
                'deskripsi_kegiatan' => $input['deskripsi_kegiatan'] ?? $existing->deskripsi_kegiatan,
                'status_verifikasi' => $isDraft ? 'draft' : 'pending',
                'feedback' => null,
                'submitted_at' => $isDraft ? null : Carbon::now(),
            ];

            if (!empty($buktiPaths)) {
                $updateData['bukti_kegiatan'] = $buktiPaths;
            }

            $updated = $this->repository->update($existing->id_logbooks, $updateData);
            $message = $isDraft ? 'Logbook berhasil disimpan sebagai draft' : 'Logbook berhasil diajukan ulang';

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => $message,
                    'data' => $updated,
                ],
            ];
        }

        $buktiPaths = $this->storeEvidenceFiles($normalizedFiles);

        $created = $this->repository->create([
            'user_id' => $user->user_id,
            'tanggal' => $input['tanggal'],
            'deskripsi_kegiatan' => $input['deskripsi_kegiatan'] ?? '',
            'bukti_kegiatan' => $buktiPaths,
            'status_verifikasi' => $isDraft ? 'draft' : 'pending',
            'submitted_at' => $isDraft ? null : Carbon::now(),
        ]);

        $message = $isDraft ? 'Logbook berhasil disimpan sebagai draft' : 'Logbook berhasil diajukan';

        return [
            'status' => 201,
            'body' => [
                'success' => true,
                'message' => $message,
                'data' => $created,
            ],
        ];
    }

    private function storeEvidenceFiles(array $files): array
    {
        $paths = [];

        foreach ($files as $file) {
            $filename = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('logbooks', $filename, 'public');
            $paths[] = 'storage/' . $path;
        }

        return $paths;
    }

    private function deleteExistingEvidence(mixed $files): void
    {
        if (is_array($files)) {
            foreach ($files as $file) {
                $path = str_replace('storage/', '', (string) $file);
                Storage::disk('public')->delete($path);
            }

            return;
        }

        if (is_string($files) && $files !== '') {
            $path = str_replace('storage/', '', $files);
            Storage::disk('public')->delete($path);
        }
    }
}