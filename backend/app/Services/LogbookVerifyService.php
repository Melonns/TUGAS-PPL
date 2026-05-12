<?php

namespace App\Services;

use App\Models\Logbook;
use App\Models\User;
use App\Repositories\LogbookRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class LogbookVerifyService
{
    public function __construct(
        private LogbookRepositoryInterface $repository,
    ) {}

    /**
     * Verify logbook (set to verified or revision_needed)
     * Returns ['status' => int, 'body' => array]
     */
    public function verify(User $verifier, int $id, string $statusVerifikasi, ?string $feedback = null): array
    {
        // Validation
        if (!in_array($statusVerifikasi, ['verified', 'revision_needed'])) {
            return [
                'status' => 422,
                'body' => [
                    'success' => false,
                    'message' => 'Status verifikasi harus verified atau revision_needed',
                    'errors' => ['status_verifikasi' => ['Status verifikasi harus verified atau revision_needed']]
                ]
            ];
        }

        if (!empty($feedback) && strlen($feedback) > 500) {
            return [
                'status' => 422,
                'body' => [
                    'success' => false,
                    'message' => 'Feedback maksimal 500 karakter',
                    'errors' => ['feedback' => ['Feedback maksimal 500 karakter']]
                ]
            ];
        }

        // Find logbook
        $logbooks = Logbook::with('user')->find($id);

        if (!$logbooks) {
            return [
                'status' => 404,
                'body' => [
                    'success' => false,
                    'message' => 'Logbook tidak ditemukan'
                ]
            ];
        }

        // Check authorization
        $isBimbingan = DB::table('intern_mentors')
            ->where('mentor_id', $verifier->user_id)
            ->where('intern_id', $logbooks->user_id)
            ->where('is_active', true)
            ->exists();

        if (!$verifier->isAdmin() && !$isBimbingan) {
            return [
                'status' => 403,
                'body' => [
                    'success' => false,
                    'message' => 'Anda tidak berhak memverifikasi logbooks ini'
                ]
            ];
        }

        // Update data
        $updateData = [
            'status_verifikasi' => $statusVerifikasi,
            'verified_by' => $verifier->user_id,
            'feedback' => $feedback,
            'verified_at' => Carbon::now(),
        ];

        if ($statusVerifikasi === 'revision_needed') {
            $updateData['revision_at'] = Carbon::now();
            $updateData['revision_by'] = $verifier->user_id;
        }

        $this->repository->update($id, $updateData);

        $statusMessage = $statusVerifikasi === 'verified' 
            ? 'Logbook berhasil diverifikasi' 
            : 'Logbook perlu revisi';

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'message' => $statusMessage,
                'data' => $logbooks->fresh(['user', 'verifier'])
            ]
        ];
    }
}
