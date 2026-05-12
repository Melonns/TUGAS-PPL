<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Logbook;
use App\Models\User;
use App\Services\LogbookStoreService;
use App\Services\LogbookUpdateService;
use App\Services\LogbookVerifyService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class LogbookController extends Controller
{
    /**
     * Build mentor intern detail path using mahasiswa ID expected by FE route.
     */
    private function buildMentorInternDetailPath(User $user): string
    {
        return "/mentor/interns/{$user->user_id}";
    }

    /**
     * Extract uploaded evidence files from multipart request in a robust way.
     * Supports keys: bukti_kegiatan, bukti_kegiatan[], and nested arrays.
     */
    private function extractEvidenceFiles(Request $request): array
    {
        $files = [];

        $pushUploadedFiles = function ($value) use (&$files, &$pushUploadedFiles) {
            if ($value instanceof \Illuminate\Http\UploadedFile) {
                $files[] = $value;
                return;
            }

            if (is_array($value)) {
                foreach ($value as $nested) {
                    $pushUploadedFiles($nested);
                }
            }
        };

        $allFiles = $request->allFiles();
        $pushUploadedFiles($allFiles['bukti_kegiatan'] ?? null);
        $pushUploadedFiles($allFiles['bukti_kegiatan[]'] ?? null);
        $pushUploadedFiles($request->file('bukti_kegiatan'));
        $pushUploadedFiles($request->file('bukti_kegiatan.*'));
        $pushUploadedFiles($request->file('bukti_kegiatan[]'));

        $unique = [];
        $seenObjectIds = [];
        foreach ($files as $file) {
            $objectId = spl_object_id($file);
            if (isset($seenObjectIds[$objectId])) {
                continue;
            }
            $seenObjectIds[$objectId] = true;
            $unique[] = $file;
        }

        return $unique;
    }

    /**
     * List logbooks untuk intern yang login
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Logbook::forUser($user)
            ->orderBy('tanggal', 'desc');

        if ($request->has('status_verifikasi')) {
            $parsed = $this->normalizeStatusFilters($request->status_verifikasi);
            $statuses = $parsed['statuses'] ?? [];
            if (!empty($statuses)) {
                $query->whereIn('status_verifikasi', $statuses);
            }
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = $this->parseDateParam($request->start_date);
            $end = $this->parseDateParam($request->end_date);
            if ($start && $end) {
                $query->whereBetween('tanggal', [$start, $end]);
            }
        }

        if ($request->has('bulan') && $request->has('tahun')) {
            $query->whereMonth('tanggal', $request->bulan)
                  ->whereYear('tanggal', $request->tahun);
        }

        if ($request->has('q')) {
            $q = $request->q;
            $query->where('deskripsi_kegiatan', 'like', "%{$q}%");
        }

        $logbooks = $query->paginate($request->per_page ?? 10);

        return response()->json([
            'success' => true,
            'data' => $logbooks
        ]);
    }

    /**
     * Normalize status filters coming from UI (CSV or array) and map friendly labels
     * Returns array: ['statuses' => [...], 'include_not_yet' => bool]
     */
    private function normalizeStatusFilters($input)
    {
        $raw = is_array($input) ? $input : array_filter(array_map('trim', explode(',', $input)));
        $mapped = [];
        $includeNotYet = false;

        foreach ($raw as $r) {
            $lower = strtolower(trim($r));

                    // 'tag_id' => array_key_exists('tag_id', $input) ? ($input['tag_id'] ?: null) : $logbooks->tag_id,
            if (in_array($lower, ['approved', 'verified'])) {
                $mapped[] = 'verified';
                continue;
            }
            if (in_array($lower, ['pending'])) {
                $mapped[] = 'pending';
                continue;
            }
            if (in_array($lower, ['draft'])) {
                $mapped[] = 'draft';
                continue;
            }
            if (in_array($lower, ['revision', 'revision_needed', 'revision needed'])) {
                $mapped[] = 'revision_needed';
                continue;
            }
            if (in_array($lower, ['rejected'])) {
                $mapped[] = 'rejected';
                continue;
            }
            if (in_array($lower, ['not yet', 'not_yet', 'notyet', 'not-yet'])) {
                $includeNotYet = true;
                continue;
            }

            $mapped[] = $r;
        }

        $mapped = array_values(array_unique($mapped));

        return ['statuses' => $mapped, 'include_not_yet' => $includeNotYet];
    }

    /**
     * Parse date param from UI accepting mm/dd/YYYY or ISO-like formats.
     * Returns Y-m-d string or null on failure.
     */
    private function parseDateParam($val)
    {
        if (empty($val)) return null;
        try {
            if (strpos($val, '/') !== false) {
                $dt = Carbon::createFromFormat('m/d/Y', $val);
            } else {
                $dt = Carbon::parse($val);
            }
            return $dt->toDateString();
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Create logbooks entry (Intern)
     * Rich text / textarea untuk deskripsi kegiatan harian
     */
    public function store(Request $request)
    {
        $result = app(LogbookStoreService::class)->store(
            $request->user(),
            $request->all(),
            $this->extractEvidenceFiles($request)
        );

        return response()->json($result['body'], $result['status']);
    }



    /**
     * Detail logbooks
     */
    public function show($id)
    {
        $logbooks = Logbook::with(['user', 'verifier', 'tag'])->find($id);

        if (!$logbooks) {
            return response()->json([
                'success' => false,
                'message' => 'Logbook tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $logbooks
        ]);
    }

    /**
     * Update logbooks (hanya jika status draft, pending, atau rejected)
     * Supports is_draft parameter to save as draft or submit for review
     */
    public function update(Request $request, $id)
    {
        $result = app(LogbookUpdateService::class)->update(
            $request->user(),
            intval($id),
            $request->all(),
            $this->extractEvidenceFiles($request)
        );

        return response()->json($result['body'], $result['status']);
    }
    }

    /**
     * Delete logbooks (hanya jika status draft atau pending)
     */
    public function destroy($id)
    {
        $user = request()->user();
        $logbooks = Logbook::where('id_logbooks', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$logbooks) {
            return response()->json([
                'success' => false,
                'message' => 'Logbook tidak ditemukan'
            ], 404);
        }

        if (!in_array($logbooks->status_verifikasi, ['draft', 'rejected', 'revision_needed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Logbook dengan status ' . $logbooks->status_verifikasi . ' tidak dapat dihapus'
            ], 400);
        }

        $files = $logbooks->bukti_kegiatan;
        if ($files && is_array($files)) {
            foreach ($files as $file) {
                 $path = str_replace('storage/', '', $file);
                 \Illuminate\Support\Facades\Storage::disk('public')->delete($path);
            }
        }

        $logbooks->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logbook berhasil dihapus'
        ]);
    }

    public function listForMentor(Request $request)
    {
        $user = $request->user();
        $internIds = $user->interns()->pluck('users.user_id')->toArray();

        $query = Logbook::with(['user'])
            ->whereIn('user_id', $internIds)
            ->orderBy('tanggal', 'desc');

        if ($request->has('status_verifikasi')) {
            $parsed = $this->normalizeStatusFilters($request->status_verifikasi);
            $statusesForQuery = $parsed['statuses'];
            $includeNotYet = $parsed['include_not_yet'] ?? false;

            if ($includeNotYet) {
                if (!$request->has('user_id')) {
                    return response()->json(['success' => false, 'message' => 'Parameter user_id required when filtering by Not Yet'], 400);
                }
                $wanted = intval($request->user_id);
                if (!in_array($wanted, $internIds)) {
                    return response()->json(['success' => false, 'message' => 'You do not have access to this intern'], 403);
                }

                $daily = $this->buildDailySummary($request, $wanted);
                return response()->json(['success' => true, 'data' => $daily]);
            }

            if (!empty($statusesForQuery)) {
                $query->whereIn('status_verifikasi', $statusesForQuery);
            }
        }

        if ($request->filled('q')) {
            $q = $request->search;
            $query->where(function ($qq) use ($q) {
                $qq->where('deskripsi_kegiatan', 'like', "%{$q}%")
                   ->orWhereHas('user', function ($u) use ($q) {
                       $u->where('nama', 'like', "%{$q}%");
                   });
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

            if ($request->filled('start_date') && $request->filled('end_date')) {
                $start = $this->parseDateParam($request->start_date);
                $end = $this->parseDateParam($request->end_date);
                if ($start && $end) {
                    $query->whereBetween('tanggal', [$start, $end]);
                }
            }

        $logbooks = $query->paginate($request->per_page ?? 10);

        return response()->json([
            'success' => true,
            'data' => $logbooks
        ]);
    }

    public function listByIntern(Request $request, $userId)
    {
        $user = $request->user();

        $target = User::find($userId);
        if (!$target || !$target->isIntern()) {
            return response()->json(['success' => false, 'message' => 'Intern tidak ditemukan'], 404);
        }

        $activeRole = $request->query('active_role');
        $isMentorContext = ($activeRole === 'mentor') || ($request->segment(2) === 'mentor' && $user->isMentor());

        if (!$user->isAdmin() || $isMentorContext) {
            if (!$user->isMentor()) {
                return response()->json(['success' => false, 'message' => 'Akses ditolak'], 403);
            }

            $internIds = $user->interns()->pluck('users.user_id')->toArray();
            if (!in_array(intval($userId), $internIds)) {
                return response()->json(['success' => false, 'message' => 'Anda tidak berhak melihat logbooks intern ini'], 403);
            }
        }

        $query = Logbook::with(['user']);
        $query->where('user_id', $userId);
        $query->orderBy('tanggal', 'desc');

        if ($request->has('status_verifikasi')) {
            $parsed = $this->normalizeStatusFilters($request->status_verifikasi);
            $statuses = $parsed['statuses'] ?? [];
            if (!empty($statuses)) {
                $query->whereIn('status_verifikasi', $statuses);
            }
        }

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where('deskripsi_kegiatan', 'like', "%{$q}%");
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = $this->parseDateParam($request->start_date);
            $end = $this->parseDateParam($request->end_date);
            if ($start && $end) {
                $query->whereBetween('tanggal', [$start, $end]);
            }
        }

        if ($request->has('bulan') && $request->has('tahun')) {
            $query->whereMonth('tanggal', $request->bulan)
                  ->whereYear('tanggal', $request->tahun);
        }

        $logbooks = $query->paginate($request->per_page ?? 10);

        return response()->json([
            'success' => true,
            'data' => $logbooks
        ]);
    }

    public function verify(Request $request, $id)
    {
        $validated = $request->validate([
            'status_verifikasi' => 'required|in:verified,revision_needed',
            'feedback' => 'nullable|string|max:500'
        ]);

        $result = app(LogbookVerifyService::class)->verify(
            $request->user(),
            intval($id),
            $validated['status_verifikasi'],
            $validated['feedback'] ?? null
        );

        return response()->json($result['body'], $result['status']);
    }

    public function progressForMentor(Request $request)
    {
        $user = $request->user();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = Carbon::parse($request->start_date)->startOfDay();
            $end = Carbon::parse($request->end_date)->endOfDay();
        } elseif ($request->filled('month') && $request->filled('year')) {
            $start = Carbon::create(intval($request->year), intval($request->month), 1)->startOfMonth();
            $end = Carbon::create(intval($request->year), intval($request->month), 1)->endOfMonth();
        } else {
            $end = Carbon::now()->endOfDay();
            $start = Carbon::now()->subDays(30)->startOfDay();
        }

        $activeRole = $request->query('active_role');
        $isMentorContext = ($activeRole === 'mentor') || ($request->segment(2) === 'mentor' && $user->isMentor());

        if ($user->isAdmin() && !$isMentorContext) {
            $internIds = $request->filled('user_id') ? [$request->user_id] : \App\Models\User::where('role', 'intern')->pluck('user_id')->toArray();
        } else {
            $internIds = $user->interns()->pluck('users.user_id')->toArray();
            if ($request->filled('user_id')) {
                $wanted = intval($request->user_id);
                $internIds = in_array($wanted, $internIds) ? [$wanted] : [];
            }
        }

        if (empty($internIds)) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $rows = \DB::table('logbooks')
            ->select('user_id', \DB::raw('COUNT(*) as total'),
                \DB::raw("SUM(CASE WHEN status_verifikasi = 'verified' THEN 1 ELSE 0 END) as verified"),
                \DB::raw("SUM(CASE WHEN status_verifikasi = 'pending' THEN 1 ELSE 0 END) as pending"),
                \DB::raw("SUM(CASE WHEN status_verifikasi = 'revision_needed' THEN 1 ELSE 0 END) as revision_needed"),
                \DB::raw('MAX(tanggal) as last_submission')
            )
            ->whereIn('user_id', $internIds)
            ->whereBetween('tanggal', [$start->toDateString(), $end->toDateString()])
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $users = \App\Models\User::whereIn('user_id', $internIds)
            ->get(['user_id', 'nama'])
            ->keyBy('user_id');

        $liburDates = \App\Models\Libur::pluck('tanggal')->map(function($d) {
            return ($d instanceof \Carbon\Carbon) ? $d->toDateString() : (string)$d;
        })->toArray();
        $liburSet = array_flip($liburDates);

        $result = [];
        foreach ($internIds as $uid) {
            $userObj = $users->get($uid);
            $agg = $rows->has($uid) ? $rows->get($uid) : (object)['total' => 0, 'verified' => 0, 'pending' => 0, 'revision_needed' => 0, 'last_submission' => null];

            $periodStart = $start->copy();
            $periodEnd = $end->copy();
            if ($userObj && $userObj->mulai_magang) {
                $mm = Carbon::parse($userObj->mulai_magang)->startOfDay();
                if ($mm->gt($periodStart)) $periodStart = $mm;
            }
            if ($userObj && $userObj->akhir_magang) {
                $am = Carbon::parse($userObj->akhir_magang)->endOfDay();
                if ($am->lt($periodEnd)) $periodEnd = $am;
            }

            $expected = 0;
            if ($periodStart->lte($periodEnd)) {
                $days = $periodStart->diffInDays($periodEnd) + 1;
                $fullWeeks = floor($days / 7);
                $expected = $fullWeeks * 5;

                $remainingDays = $days % 7;
                if ($remainingDays > 0) {
                    $startDay = $periodStart->dayOfWeek;
                    for ($i = 0; $i < $remainingDays; $i++) {
                        $currentDay = ($startDay + $i) % 7;
                        if ($currentDay != 0 && $currentDay != 6) {
                            $expected++;
                        }
                    }
                }

                foreach ($liburSet as $hDate => $_) {
                    try {
                        $h = \Carbon\Carbon::parse($hDate);
                        if ($h->betweenIncluded($periodStart, $periodEnd) && !$h->isWeekend()) {
                            $expected--;
                        }
                    } catch (\Throwable $e) {}
                }
            }

            $percent = $expected > 0 ? round(($agg->total / $expected) * 100, 1) : null;

            $result[] = [
                'user_id' => $uid,
                'id_mahasiswa' => $userObj?->mahasiswa?->id_mahasiswa ?? null,
                'nama' => $userObj ? $userObj->nama : null,
                'total_entries' => intval($agg->total),
                'verified' => intval($agg->verified),
                'pending' => intval($agg->pending),
                'revision_needed' => intval($agg->revision_needed),
                'last_submission' => $agg->last_submission,
                'expected_workdays' => $expected,
                'percent_submitted' => $percent,
            ];
        }

        if ($request->filled('sort_by') && $request->sort_by === 'percent_asc') {
            usort($result, fn($a,$b)=>($a['percent_submitted'] ?? 0) <=> ($b['percent_submitted'] ?? 0));
        }

        return response()->json(['success' => true, 'data' => $result]);
    }

    public function listAll(Request $request)
    {
        $query = Logbook::with(['user', 'verifier'])
            ->orderBy('tanggal', 'desc');

        if ($request->has('status_verifikasi')) {
            $statuses = is_array($request->status_verifikasi) ? $request->status_verifikasi : explode(',', $request->status_verifikasi);
            $query->whereIn('status_verifikasi', $statuses);
        }

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($qq) use ($q) {
                $qq->where('deskripsi_kegiatan', 'like', "%{$q}%")
                   ->orWhereHas('user', function ($u) use ($q) {
                       $u->where('nama', 'like', "%{$q}%");
                   });
            });
        }

        if ($request->has('user_id')) {
            $mahasiswa = \App\Models\TblMahasiswa::where('user_id', $request->user_id)->first();
            if ($mahasiswa) {
                $query->where('id_mahasiswa', $mahasiswa->id_mahasiswa);
            } elseif (\App\Models\TblMahasiswa::where('id_mahasiswa', $request->user_id)->exists()) {
                $query->where('id_mahasiswa', $request->user_id);
            } else {
                $query->where('user_id', $request->user_id);
            }
        }

        if ($request->has('id_site')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('id_site', $request->id_site);
            });
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('tanggal', [$request->start_date, $request->end_date]);
        }

        $logbooks = $query->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $logbooks
        ]);
    }

    public function getFile(Request $request, $id, $filename)
    {
        $logbooks = Logbook::find($id);

        if (!$logbooks) {
            return response()->json(['message' => 'Logbook tidak ditemukan'], 404);
        }

        $user = $request->user();

        $isOwner = $logbooks->user_id === $user->user_id;
        $isAdmin = $user->isAdmin();
        $isMentor = false;
        
        if ($user->isMentor()) {
            $isMentor = \DB::table('intern_mentors')
                ->where('mentor_id', $user->user_id)
                ->where('intern_id', $logbooks->user_id)
                ->where('is_active', true)
                ->exists();
        }

        if (!$isOwner && !$isAdmin && !$isMentor) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $files = $logbooks->bukti_kegiatan;
        $isValidFile = false;
        $targetPath = '';

        $decodedFilename = urldecode($filename);

        if (is_array($files)) {
            foreach ($files as $path) {
                if (basename($path) === $decodedFilename) {
                    $isValidFile = true;
                    $targetPath = $path;
                    break;
                }
            }
        }

        if (!$isValidFile) {
            return response()->json(['message' => 'File tidak ditemukan di logbooks ini'], 404);
        }

        $relativePath = str_replace('storage/', '', $targetPath);

        if (!\Illuminate\Support\Facades\Storage::disk('public')->exists($relativePath)) {
            return response()->json(['message' => 'File fisik tidak ditemukan'], 404);
        }

        if ($request->query('download')) {
            return \Illuminate\Support\Facades\Storage::disk('public')->download($relativePath);
        }

        $file = \Illuminate\Support\Facades\Storage::disk('public')->get($relativePath);
        $mimeType = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($relativePath);
        return response($file)->header('Content-Type', $mimeType);
    }
}
