<?php

namespace App\Services;

use App\Models\Logbook;
use App\Models\User;
use App\Repositories\LogbookRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class LogbookUpdateService
{
    public function __construct(
        private LogbookRepositoryInterface $repository,
    ) {}

    /**
     * Update logbook (draft, rejected, or revision_needed only)
     * Returns ['status' => int, 'body' => array]
     */
    public function update(User $user, int $id, array $input, array $uploadedFiles = []): array
    {
        // Validation
        $isDraft = $input['is_draft'] ?? false;
        
        if ($isDraft) {
            $isValid = isset($input['deskripsi_kegiatan']) ? is_string($input['deskripsi_kegiatan']) && strlen($input['deskripsi_kegiatan']) <= 5000 : true;
        } else {
            $isValid = !empty($input['deskripsi_kegiatan']) && is_string($input['deskripsi_kegiatan']) && strlen($input['deskripsi_kegiatan']) <= 5000;
        }

        if (!$isValid) {
            $message = $isDraft ? 'Deskripsi kegiatan (opsional untuk draft) maksimal 5000 karakter' : 'Deskripsi kegiatan diperlukan dan maksimal 5000 karakter';
            return [
                'status' => 422,
                'body' => [
                    'success' => false,
                    'message' => $message,
                    'errors' => ['deskripsi_kegiatan' => [$message]]
                ]
            ];
        }

        // Validate file size
        foreach ($uploadedFiles as $file) {
            if ($file->getSize() > 51200 * 1024) {
                return [
                    'status' => 422,
                    'body' => [
                        'success' => false,
                        'message' => 'Ukuran file maksimal 51 MB',
                        'errors' => ['bukti_kegiatan' => ['Ukuran file maksimal 51 MB']]
                    ]
                ];
            }
            $mime = $file->getMimeType();
            if (!in_array($mime, ['image/jpeg', 'image/png', 'application/pdf'])) {
                return [
                    'status' => 422,
                    'body' => [
                        'success' => false,
                        'message' => 'Tipe file harus jpg, jpeg, png, atau pdf',
                        'errors' => ['bukti_kegiatan' => ['Tipe file harus jpg, jpeg, png, atau pdf']]
                    ]
                ];
            }
        }

        // Find logbook
        $logbooks = Logbook::where('id_logbooks', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$logbooks) {
            return [
                'status' => 404,
                'body' => [
                    'success' => false,
                    'message' => 'Logbook tidak ditemukan'
                ]
            ];
        }

        // Check status
        if (!in_array($logbooks->status_verifikasi, ['draft', 'rejected', 'revision_needed'])) {
            return [
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'Logbook dengan status ' . $logbooks->status_verifikasi . ' tidak dapat diubah'
                ]
            ];
        }

        $newStatus = $isDraft ? 'draft' : 'pending';

        $dataToUpdate = [
            'deskripsi_kegiatan' => $input['deskripsi_kegiatan'] ?? $logbooks->deskripsi_kegiatan,
            'status_verifikasi' => $newStatus,
        ];

        if (!$isDraft) {
            $dataToUpdate['feedback'] = null;
            $dataToUpdate['submitted_at'] = Carbon::now();
        }

        // Handle file uploads
        if (!empty($uploadedFiles)) {
            $this->deleteExistingEvidence($logbooks);
            $newPaths = $this->storeEvidenceFiles($uploadedFiles);
            $dataToUpdate['bukti_kegiatan'] = $newPaths;
        }

        // Update via repository
        $this->repository->update($logbooks->id_logbooks, $dataToUpdate);

        $message = $isDraft ? 'Logbook berhasil disimpan sebagai draft' : 'Logbook berhasil diajukan untuk verifikasi';

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'message' => $message,
                'data' => $logbooks->fresh()
            ]
        ];
    }

    /**
     * Store evidence files to storage
     */
    private function storeEvidenceFiles(array $uploadedFiles): array
    {
        $newPaths = [];
        foreach ($uploadedFiles as $file) {
            $filename = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('logbooks', $filename, 'public');
            $newPaths[] = 'storage/' . $path;
        }
        return $newPaths;
    }

    /**
     * Delete existing evidence files
     */
    private function deleteExistingEvidence(Logbook $logbooks): void
    {
        $oldFiles = $logbooks->bukti_kegiatan;
        if ($oldFiles && is_array($oldFiles)) {
            foreach ($oldFiles as $oldFile) {
                $path = str_replace('storage/', 'public/', $oldFile);
                if (Storage::exists($path)) {
                    Storage::delete($path);
                }
            }
        } elseif ($oldFiles && is_string($oldFiles)) {
            $path = str_replace('storage/', 'public/', $oldFiles);
            if (Storage::exists($path)) {
                Storage::delete($path);
            }
        }
    }
}
