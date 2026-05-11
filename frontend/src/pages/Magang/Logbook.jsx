import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  X,
  UploadCloud,
  FileText,
  Calendar,
  Check,
  AlertCircle,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import imageCompression from "browser-image-compression";
import apiClient from "../../api/axiosConfig";

// --- STYLE CONSTANTS ---
const btnPrimary = "bg-[#354C8F] hover:bg-[#2a3c70] text-white py-2.5 px-5 rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2";
const btnSecondary = "bg-white border border-slate-300 text-slate-700 py-2.5 px-5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2";
const btnSecondaryClass = "bg-white border border-slate-300 text-slate-700 py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95";
const btnConfirmClass = "bg-[#22C55E] hover:bg-[#16A34A] text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-md shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"; 
const btnDanger = "bg-[#EF4444] hover:bg-[#DC2626] text-white py-2.5 px-5 rounded-xl font-bold text-sm shadow-md shadow-red-200 transition-all active:scale-95";
const iconActionBase = "inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors active:scale-95 shadow-sm text-white disabled:opacity-70 disabled:cursor-not-allowed";
const iconActionView = `${iconActionBase} bg-[#354C8F] hover:bg-[#2a3c70] shadow-indigo-100`;
const iconActionEdit = `${iconActionBase} bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100`;
const iconActionFeedback = `${iconActionBase} bg-amber-500 hover:bg-amber-600 shadow-amber-100`;
const iconActionDelete = `${iconActionBase} bg-red-500 hover:bg-red-600 shadow-red-100`;
const iconActionAddOutline = "inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors active:scale-95";
const DEBUG_INSERT_DUMMY_NOT_YET = false;

const DailyActivitiesPage = () => {
  const [logbooks, setLogbooks] = useState([]);
  const [attendancePeriod, setAttendancePeriod] = useState(null);
  const [dailySummaryMissingDays, setDailySummaryMissingDays] = useState([]);
  const [taskCategories, setTaskCategories] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ open: false, percent: 0, indeterminate: true });
  const formRef = useRef(null);
  const uploadMetaRef = useRef(null);
  const isInitialMountRef = useRef(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [selectedLogbook, setSelectedLogbook] = useState(null);
  const [formMode, setFormMode] = useState("add");
  const [statusModal, setStatusModal] = useState({ open: false, type: "success", title: "", desc: "" });
  const [serverMeta, setServerMeta] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState({ status: [], startDate: "", endDate: "" });
  const [appliedFilter, setAppliedFilter] = useState({ status: [], startDate: "", endDate: "" });
  const isFilterActive = Boolean(filter.status.length > 0 || filter.startDate || filter.endDate);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const pageSize = serverMeta?.per_page ?? itemsPerPage;
  const totalEntries = serverMeta?.total ?? logbooks.length;
  const totalPages = serverMeta?.last_page ?? Math.max(1, Math.ceil(totalEntries / pageSize));
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = serverMeta ? logbooks : logbooks.slice(indexOfFirstItem, indexOfLastItem);
  const paginationMeta = serverMeta ? {
    current_page: serverMeta.current_page ?? currentPage,
    last_page: serverMeta.last_page ?? totalPages,
    from: serverMeta.from ?? (totalEntries === 0 ? 0 : indexOfFirstItem + 1),
    to: serverMeta.to ?? Math.min(indexOfLastItem, totalEntries),
    total: serverMeta.total ?? totalEntries,
  } : {
    current_page: currentPage,
    last_page: totalPages,
    from: totalEntries === 0 ? 0 : indexOfFirstItem + 1,
    to: Math.min(indexOfLastItem, totalEntries),
    total: totalEntries,
  };

  const formatDateForApi = (value) => {
    if (!value) return value;
    const raw = String(value);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, yyyy, mm, dd] = match;
      return `${mm}/${dd}/${yyyy}`;
    }
    return raw;
  };

  const buildFilterParams = (source) => {
    const params = {};
    if (source.startDate) params.start_date = formatDateForApi(source.startDate);
    if (source.endDate) params.end_date = formatDateForApi(source.endDate);
    if (source.status && source.status.length > 0) {
      params.status_verifikasi = source.status.map(s => String(s || '').trim()).join(',');
    }
    return params;
  };

  const fetchTaskCategories = async () => {
    try {
      const res = await apiClient.get('/tags', { params: { per_page: 1000 } });
      const payload = res?.data?.data;
      const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      const mapped = rows.map((row) => ({
        id: row?.id,
        name: row?.nama,
        color: row?.warna,
      })).filter((row) => row.id && row.name);
      setTaskCategories(mapped);
    } catch (err) {
      console.warn('Failed to fetch task categories:', err);
      setTaskCategories([]);
    }
  };

  const getStoredMahasiswaId = () => {
    try {
      const rawUser = localStorage.getItem('user');
      const rawProfile = localStorage.getItem('user_profile');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const profile = rawProfile ? JSON.parse(rawProfile) : null;
      return profile?.id_mahasiswa || user?.id_mahasiswa || user?.user_id || user?.id || user?.user?.id || profile?.user_id || profile?.id || profile?.user?.id || null;
    } catch (err) {
      return null;
    }
  };

  const mapDailyStatus = (rawStatus) => {
    const s = String(rawStatus || '').toLowerCase();
    if (s === 'approved' || s === 'verified') return 'Approved';
    if (s === 'pending') return 'Pending';
    if (s.includes('revision')) return 'Revision';
    return 'Draft';
  };

  const formatWorkHours = (timeStr) => {
    if (!timeStr || timeStr === '-') return { hours: 0, minutes: 0 };
    const parts = String(timeStr).split(':');
    if (parts.length !== 2) return { hours: 0, minutes: 0 };
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return { hours: 0, minutes: 0 };
    return { hours, minutes };
  };

  const handlePageChange = (page) => {
    if (page < 1) return;
    const maxPage = (typeof paginationMeta !== 'undefined' && paginationMeta?.last_page) ? paginationMeta.last_page : totalPages;
    if (page > maxPage) return;
    setCurrentPage(page);
    fetchLogbooks({ page, per_page: itemsPerPage, user_id: getStoredMahasiswaId(), ...buildFilterParams(appliedFilter) });
  };

  const handleOpenForm = async (mode, data = null) => {
    setFormMode(mode);
    const statusKey = String(data?.rawStatus || data?.status || '').toLowerCase();
    if (mode === 'edit' && (statusKey === 'verified' || statusKey === 'pending')) {
      showStatus('error', 'Cannot Edit', 'Only draft or revision logbooks can be edited.');
      return;
    }

    setSelectedLogbook(data);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (data) => {
    const statusKey = String(data?.rawStatus || data?.status || '').toLowerCase();
    if (!['draft'].includes(statusKey)) {
      showStatus('error', 'Cannot Delete', 'Only draft logbooks can be deleted.');
      return;
    }
    setSelectedLogbook(data);
    setIsDeleteOpen(true);
  };

  const showStatus = (type, title, desc) => {
    setStatusModal({ open: true, type, title, desc });
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLogbook) return;
    try {
      setIsDeleteOpen(false);
      const deleteId = selectedLogbook.id ?? selectedLogbook.id_logbook;
      await apiClient.delete(`/logbook/${deleteId}`);
      await fetchLogbooks({ page: 1, per_page: itemsPerPage, daily: 1, user_id: getStoredMahasiswaId(), ...buildFilterParams(appliedFilter) });
      setCurrentPage(1);
      showStatus("success", "Deleted", "Submission removed successfully.");
    } catch (err) {
      console.error('Error deleting logbook:', err);
      const serverData = err.response?.data;
      const message = serverData?.message || 'Could not delete submission.';
      showStatus('error', 'Error', message);
    } finally {
      setSelectedLogbook(null);
    }
  };

  const handleFormAction = async (action, payload, files = []) => {
    const startedAt = Date.now();
    const uploadAnimRef = { current: null };

    const animateToPercent = (target, speed = 60) => {
      if (uploadAnimRef.current) clearInterval(uploadAnimRef.current);
      setUploadProgress((p) => ({ ...p, indeterminate: false }));
      uploadAnimRef.current = setInterval(() => {
        setUploadProgress((p) => {
          if (!p?.open) return p;
          const curr = typeof p.percent === 'number' ? p.percent : 0;
          if (curr >= target) {
            clearInterval(uploadAnimRef.current);
            uploadAnimRef.current = null;
            return { ...p, percent: target, indeterminate: false };
          }
          const diff = target - curr;
          const step = Math.max(1, Math.ceil(diff / 6));
          return { ...p, percent: Math.min(100, curr + step), indeterminate: false };
        });
      }, speed);
    };

    const startFakeProgress = () => {
      setUploadProgress({ open: true, percent: 3, indeterminate: false });
      animateToPercent(85, 80);
    };

    const stopFakeProgress = () => {
      if (uploadAnimRef.current) {
        clearInterval(uploadAnimRef.current);
        uploadAnimRef.current = null;
      }
    };

    setUploadProgress({ open: true, percent: 0, indeterminate: false });
    startFakeProgress();

    const isDraft = action === 'draft';
    const form = new FormData();
    form.append('tanggal', payload?.date);
    form.append('deskripsi_kegiatan', payload?.summary || '');
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'taskCategoryId')) {
      form.append('tag_id', payload?.taskCategoryId ? String(payload.taskCategoryId) : '');
    }
    form.append('durasi_jam', '0');
    form.append('durasi_menit', '0');
    form.append('is_draft', isDraft ? '1' : '0');

    const fileList = files || [];
    if (fileList.length > 0) {
      fileList.forEach(f => {
        if (f instanceof File) {
          form.append('bukti_kegiatan[]', f, f.name);
        }
      });
      try {
        const filesForUpload = fileList.filter(f => f instanceof File);
        if (filesForUpload.length > 0) {
          const sizes = filesForUpload.map(f => ({ name: f.name, size: f.size || 0 }));
          const total = sizes.reduce((s, it) => s + (it.size || 0), 0) || 0;
          uploadMetaRef.current = { sizes, total };
          if (formRef?.current?.setFilesUploading) formRef.current.setFilesUploading();
        }
      } catch (e) { }
    } else if (payload?.id && payload?.existingOutputs) {
      const existingList = Array.isArray(payload.existingOutputs)
        ? payload.existingOutputs
        : String(payload.existingOutputs).split(',').map(s => s.trim()).filter(Boolean);
      const existingUrls = buildPreviewOutputs(existingList);

      if (existingUrls.length > 0) {
        try {
          await Promise.all(existingUrls.map(async (url) => {
            const res = await apiClient.get(url, { responseType: "blob" });
            const fileName = String(url).split("?")[0].split("/").pop() || "bukti-kegiatan";
            const file = new File([res.data], fileName, { type: res.data.type || "application/octet-stream" });
            form.append('bukti_kegiatan[]', file, file.name);
          }));
        } catch (err) {
          console.warn("Failed to reattach existing evidence files:", err);
        }
      }
    }

    try {
      if (payload?.id) {
        await apiClient.post(`/logbook/${payload.id}`, form, {
          onUploadProgress: (evt) => {
            const total = typeof evt?.total === 'number' ? evt.total : 0;
            const loaded = typeof evt?.loaded === 'number' ? evt.loaded : 0;
            if (!total) {
              setUploadProgress((p) => ({ ...p, indeterminate: true }));
              return;
            }
            stopFakeProgress();
            const next = Math.max(0, Math.min(100, Math.round((loaded * 100) / total)));
            animateToPercent(next, 40);
            try {
              const meta = uploadMetaRef.current;
              if (meta && meta.total > 0 && formRef?.current?.updateFileProgress) {
                const totalSize = meta.total;
                const progressUpdates = meta.sizes.map(s => {
                  const size = s.size || 0;
                  const loadedForFile = Math.min(size, Math.round((loaded * size) / totalSize));
                  const pct = size > 0 ? Math.max(0, Math.min(100, Math.round((loadedForFile * 100) / size))) : 0;
                  return { name: s.name, percent: pct };
                });
                formRef.current.updateFileProgress(progressUpdates);
              }
            } catch (e) { }
          }
        });
        showStatus('success', 'Updated', isDraft ? 'Draft saved.' : 'Logbook submitted for review.');
      } else {
        await apiClient.post('/logbook', form, {
          onUploadProgress: (evt) => {
            const total = typeof evt?.total === 'number' ? evt.total : 0;
            const loaded = typeof evt?.loaded === 'number' ? evt.loaded : 0;
            if (!total) {
              setUploadProgress((p) => ({ ...p, indeterminate: true }));
              return;
            }
            stopFakeProgress();
            const next = Math.max(0, Math.min(100, Math.round((loaded * 100) / total)));
            animateToPercent(next, 40);
            try {
              const meta = uploadMetaRef.current;
              if (meta && meta.total > 0 && formRef?.current?.updateFileProgress) {
                const totalSize = meta.total;
                const progressUpdates = meta.sizes.map(s => {
                  const size = s.size || 0;
                  const loadedForFile = Math.min(size, Math.round((loaded * size) / totalSize));
                  const pct = size > 0 ? Math.max(0, Math.min(100, Math.round((loadedForFile * 100) / size))) : 0;
                  return { name: s.name, percent: pct };
                });
                formRef.current.updateFileProgress(progressUpdates);
              }
            } catch (e) { }
          }
        });
        showStatus('success', 'Created', isDraft ? 'Draft saved.' : 'Logbook submitted for review.');
      }
      stopFakeProgress();
      setUploadProgress({ open: true, percent: 100, indeterminate: false });
      const elapsed = Date.now() - startedAt;
      const minVisible = 1000;
      const waitMs = Math.max(250, minVisible - elapsed);
      setTimeout(() => setUploadProgress({ open: false, percent: 0, indeterminate: true }), waitMs);

      setIsFormOpen(false);
      setCurrentPage(1);
      await fetchLogbooks({ page: 1, per_page: itemsPerPage, daily: 1, user_id: getStoredMahasiswaId(), ...buildFilterParams(appliedFilter) });
    } catch (err) {
      console.error('Error saving logbook:', err);
      stopFakeProgress();
      setUploadProgress({ open: false, percent: 0, indeterminate: true });
      const serverData = err.response?.data;
      const validationErrors = serverData?.errors;
      if (validationErrors?.tanggal) {
        showStatus('error', 'Invalid Date', validationErrors.tanggal.join(' '));
      } else if (validationErrors?.bukti_kegiatan) {
        showStatus('error', 'File Error', validationErrors.bukti_kegiatan.join(' '));
      } else if (serverData?.message) {
        showStatus('error', 'Error', serverData.message);
      } else {
        showStatus('error', 'Error', 'Failed to save logbook.');
      }
    }
  };

  const handleFeedbackClick = (data) => {
    setSelectedLogbook(data);
    setIsFeedbackOpen(true);
  };

  const resetFilter = async () => {
    const cleared = { status: [], startDate: "", endDate: "" };
    setFilter(cleared);
    setAppliedFilter(cleared);
    setCurrentPage(1);
    setIsFilterOpen(false);
    await fetchLogbooks({ page: 1, per_page: itemsPerPage, daily: 1, user_id: getStoredMahasiswaId(), ...buildFilterParams(cleared) });
  };

  const handleViewFile = async (logbookId, fileUrl, displayName) => {
    try {
      const fileName = String(fileUrl).split('/').pop();
      const res = await apiClient.get(`/logbook/${logbookId}/file/${fileName}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.data.type }));
      window.open(url, '_blank');
    } catch (error) {
      console.error("Failed to view file", error);
      alert("Gagal membuka file. Pastikan file ada di server.");
    }
  };

  const handleDownloadFile = async (logbookId, fileUrl, displayName) => {
    try {
      const fileName = String(fileUrl).split('/').pop();
      const res = await apiClient.get(`/logbook/${logbookId}/file/${fileName}?download=1`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = displayName || fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading file:", err);
      showStatus("error", "Error", "Failed to download file.");
    }
  };

  const parseOutputValues = (rawValue) => {
    if (!rawValue) return [];

    const toValue = (entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') return entry.trim();
      if (typeof entry === 'object') {
        return (
          entry.url ||
          entry.path ||
          entry.file_url ||
          entry.fileUrl ||
          entry.file ||
          entry.location ||
          null
        );
      }
      return null;
    };

    if (Array.isArray(rawValue)) {
      return rawValue
        .map(toValue)
        .filter(Boolean)
        .map((v) => String(v).trim())
        .filter(Boolean);
    }

    const rawText = String(rawValue).trim();
    if (!rawText) return [];

    if ((rawText.startsWith('[') && rawText.endsWith(']')) || (rawText.startsWith('{') && rawText.endsWith('}'))) {
      try {
        const parsed = JSON.parse(rawText);
        return parseOutputValues(parsed);
      } catch (e) {
      }
    }

    if (rawText.includes(',')) {
      return rawText
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }

    return [rawText];
  };

  const normalizeStatus = (rawStatus) => {
    const s = String(rawStatus || '').toLowerCase();
    if (s === 'approved' || s === 'verified') return 'Approved';
    if (s === 'pending') return 'Pending';
    if (s.includes('revision')) return 'Revision';
    if (s === 'not_yet' || s === 'not yet' || (s.includes('not') && s.includes('yet'))) return 'Not Yet';
    return 'Draft';
  };

  const findTimestampByKeywords = (obj, keywords = []) => {
    if (!obj || !keywords.length) return null;
    const keys = Object.keys(obj);
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (keywords.every(k => lower.includes(k))) return obj[key];
    }
    return null;
  };

  const formatTimestamp = (value) => {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(value);
    }
  };

  const normalizeOutputsFromItem = (item) => {
    if (!item) return [];

    const candidates = [
      item.bukti_kegiatan,
      item.outputs,
      item.output,
      item.files,
      item.attachments,
      item.logbooks?.bukti_kegiatan,
      item.logbook?.bukti_kegiatan,
    ];

    const merged = candidates.flatMap((candidate) => parseOutputValues(candidate));
    return [...new Set(merged.filter(Boolean))];
  };

  const getTaskCategoryFromItem = (item) => {
    if (!item) return '';
    const directName = item.tag?.nama || item.task_category || item.kategori_task || item.taskCategory || item.category_task || item.category || '';
    if (directName) return directName;
    const categoryId = item.tag_id || item.tagId || item.tag?.id;
    if (!categoryId) return '';
    const fromMaster = taskCategories.find((cat) => String(cat.id) === String(categoryId));
    return fromMaster?.name || '';
  };

  const getTaskCategoryIdFromItem = (item) => {
    if (!item) return '';
    return item.tag_id || item.tagId || item.tag?.id || '';
  };

  const mapLogbookItem = (item) => {
    const rawStatus = item.status_verifikasi ?? item.status ?? 'draft';
    const status = normalizeStatus(rawStatus);
    const outputs = buildPreviewOutputs(normalizeOutputsFromItem(item));
    const approvedAt = item.approved_at || item.verified_at || item.approved_at_mentor || item.verified_at_mentor || item.approvedAt || item.verifiedAt || findTimestampByKeywords(item, ['approve', 'at']) || findTimestampByKeywords(item, ['verify', 'at']) || null;
    const revisionRequestedAt = item.rejected_at || item.rejected_at_mentor || item.rejectedAt || findTimestampByKeywords(item, ['revision', 'at']) || ((String(rawStatus || '').toLowerCase().includes('revision')) ? (item.status_updated_at || item.statusUpdatedAt || item.updated_at || item.updatedAt || null) : null);
    const submittedAt = item.submitted_at || item.submittedAt || item.created_at || item.createdAt || findTimestampByKeywords(item, ['submit', 'at']) || item.updated_at || null;
    const resubmittedAt = item.resubmitted_at || item.resubmittedAt || findTimestampByKeywords(item, ['resubmit', 'at']) || null;

    return {
      id: item.id_logbooks ?? item.id_logbook ?? item.logbook_id ?? item.id,
      date: item.tanggal,
      taskCategoryId: getTaskCategoryIdFromItem(item),
      taskCategory: getTaskCategoryFromItem(item),
      summary: item.deskripsi_kegiatan || item.deskripsi || item.activity_description || item.activity || '',
      output: Array.isArray(item.bukti_kegiatan) ? item.bukti_kegiatan.join(',') : (item.bukti_kegiatan || item.output || ''),
      outputs,
      status,
      rawStatus,
      feedback: item.feedback || '',
      approvedAt,
      revisionRequestedAt,
      submittedAt,
      resubmittedAt
    };
  };

  const buildPreviewOutputs = (outputs) => {
    const base = apiClient.defaults.baseURL || '';
    const baseNoApi = base.replace(/\/api\/?$/i, '');
    return (outputs || []).map(f => {
      if (!f) return f;
      if (String(f).startsWith('http') || String(f).startsWith('data:')) return f;
      const cleaned = String(f)
        .replace(/^\/api\//i, '/')
        .replace(/^api\//i, '');
      const root = baseNoApi.replace(/\/$/, '');
      return `${root}/${cleaned.replace(/^\//, '')}`;
    });
  };

  const fetchLogbooks = async (params = {}) => {
    setLoadingList(true);
    try {
      const mahasiswaId = params.mahasiswa_id || params.id_mahasiswa || params.user_id || getStoredMahasiswaId();
      if (!mahasiswaId) {
        showStatus('error', 'Missing User', 'User ID not found. Please re-login and try again.');
        setServerMeta(null);
        setLogbooks([]);
        return [];
      }

      const { daily, ...filteredParams } = params;
      const commonParams = {
        page: params.page ?? currentPage,
        per_page: params.per_page ?? itemsPerPage,
        start_date: params.start_date ?? formatDateForApi(appliedFilter.startDate) ?? undefined,
        end_date: params.end_date ?? formatDateForApi(appliedFilter.endDate) ?? undefined,
        q: params.q ?? (searchTerm.trim() || undefined),
        id_mahasiswa: mahasiswaId,
        ...filteredParams
      };

      const res = await apiClient.get('/logbook', { params: commonParams });

      const raw = res?.data ?? {};
      const payload = raw?.data ?? raw;
      setDailySummaryMissingDays([]);
      setAttendancePeriod(null);

      let summary = payload?.data ?? payload?.items ?? [];
      if (summary && Array.isArray(summary?.data)) summary = summary.data;
      if (!Array.isArray(summary) && Array.isArray(payload?.data?.data)) summary = payload.data.data;

      const metaSource = payload?.meta ?? payload?.pagination ?? (payload?.current_page ? payload : null);
      if (metaSource) {
        const meta = {
          current_page: metaSource.current_page ?? metaSource.currentPage ?? 1,
          last_page: metaSource.last_page ?? metaSource.lastPage ?? metaSource.total_pages ?? 1,
          per_page: metaSource.per_page ?? metaSource.perPage ?? itemsPerPage,
          from: metaSource.from ?? undefined,
          to: metaSource.to ?? undefined,
          total: metaSource.total ?? metaSource.total_items ?? (Array.isArray(summary) ? summary.length : 0)
        };
        setServerMeta(meta);
      } else {
        setServerMeta(null);
      }

      const mapped = (Array.isArray(summary) ? summary : []).map((row) => {
        const mappedLog = mapLogbookItem(row || {});
        return {
          ...mappedLog,
          _rowType: 'logbook',
          _hasLogbook: true,
          _logbook: row,
          _flags: { isNotSubmit: false, isNotYet: false }
        };
      });

      if (DEBUG_INSERT_DUMMY_NOT_YET) {
        const today = new Date().toISOString().split('T')[0];
        const dummy = {
          id: 'debug-notyet-1',
          date: today,
          summary: 'No submission yet (dummy)',
          output: '',
          outputs: [],
          status: 'Not Yet',
          rawStatus: 'not_yet',
          feedback: '',
          _rowType: 'missing',
          _hasLogbook: false,
          _logbook: null,
          _flags: { isNotSubmit: false, isNotYet: true }
        };
        mapped.unshift(dummy);
      }

      setLogbooks(mapped);
      return mapped;
    } catch (err) {
      console.error('Error fetching logbooks:', err);
      showStatus('error', 'Error', 'Failed to load logbooks.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isInitialMountRef.current) return;
    isInitialMountRef.current = false;

    fetchLogbooks({ page: 1, per_page: itemsPerPage, user_id: getStoredMahasiswaId(), ...buildFilterParams(appliedFilter) });
  }, []);

  useEffect(() => {
    if (isInitialMountRef.current) return;

    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchLogbooks({ page: 1, per_page: itemsPerPage, user_id: getStoredMahasiswaId(), ...buildFilterParams(appliedFilter) });
    }, searchTerm.trim() ? 400 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, appliedFilter, itemsPerPage]);

  const handleOpenDetail = async (item) => {
    const source = item?._logbook || item;
    const logbookId = source?.logbook_id || source?.id_logbook || source?.id || item?.id;
    if (!logbookId) {
      showStatus('error', 'No Logbook', 'No logbook submitted for this date.');
      return;
    }
    const initial = mapLogbookItem(source);
    if (item?.date) initial.date = item.date;
    setSelectedDetail(initial);
    setIsDetailOpen(true);
  };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    let styles = "bg-slate-100 text-slate-500 border-slate-200";
    let label = status;
    if (s.includes('approved') || s.includes('verified')) {
      styles = "bg-green-50 text-green-600 border-green-200";
      label = "Approved";
    } else if (s.includes('pending')) {
      styles = "bg-yellow-100 text-yellow-600 border-yellow-200";
      label = "Pending";
    } else if (s.includes('revision')) {
      styles = "bg-red-50 text-red-600 border-red-200";
      label = "Revision";
    } else if (s.includes('not yet')) {
      styles = "bg-slate-100 text-slate-600 border-slate-200";
      label = "Not Yet";
    } else if (s.includes('no logbook') || s.includes('not submitted') || s.includes('absent')) {
      styles = "bg-red-50 text-red-600 border-red-200";
      label = "No Logbook";
    } else if (s.includes('rejected')) {
      styles = "bg-red-50 text-red-500 border-red-200";
      label = "Rejected";
    } else if (s.includes('draft')) {
      styles = "bg-indigo-50 text-indigo-600 border-indigo-200";
      label = "Draft";
    }
    return (
      <span className={`inline-flex items-center justify-center min-w-[140px] h-[34px] px-3 rounded-lg text-[13px] font-bold border whitespace-nowrap shadow-sm ${styles}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="bg-slate-50 w-full h-[calc(100vh-90px)] overflow-hidden p-4 md:p-6 font-sans text-slate-800 flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-[#27345A] mb-2 -mt-1">Your Daily Activities (Logbook)</h1>
        <p className="text-slate-500 text-sm">Monitor the status of your activities and submit your progress here.</p>
        {attendancePeriod?.start && attendancePeriod?.end && (
          <p className="text-slate-500 text-sm mt-1">
            Period: <span className="font-semibold text-slate-700">{attendancePeriod.start}</span> to <span className="font-semibold text-slate-700">{attendancePeriod.end}</span>
          </p>
        )}
        {dailySummaryMissingDays && dailySummaryMissingDays.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="text-xs text-rose-600 font-semibold">Missing logbook days: {dailySummaryMissingDays.length}</div>
            <button onClick={() => { }} className="text-xs bg-white border border-rose-100 text-rose-600 px-2 py-1 rounded-lg shadow-sm">Remind</button>
          </div>
        )}
      </div>

      <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-2xl">
          <div className="relative w-full">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search activities, description, or date..."
              className="w-full border border-slate-200 rounded-lg py-2.5 px-4 pr-10 text-sm"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button onClick={() => setIsFilterOpen(true)} className={btnSecondary}><Filter className="w-4 h-4" /> Filter</button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => handleOpenForm('add')} className={btnPrimary}><Plus className="w-4 h-4" /> Add Logbook</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {loadingList ? (
        <div className="flex h-full items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-slate-500" /> Loading logbooks...
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {(!logbooks || logbooks.length === 0) ? (
            <div className="flex h-full items-center justify-center flex-1">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 md:p-8 shadow text-center">
              <div className="text-lg font-semibold text-slate-700">No logbook entries found</div>
              <p className="text-sm text-slate-500 mt-2">You don't have any submissions yet.</p>
            </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-sm table-auto">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                  <tr className="text-left text-xs text-slate-500 uppercase">
                    <th className="px-4 py-3 w-12 text-center">No.</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 align-top text-center text-slate-500 font-medium">
                        {(paginationMeta?.from || 1) + index}
                      </td>
                      <td className="px-4 py-3 align-top w-40 text-slate-700">{item.date || '-'}</td>
                      <td className="px-4 py-3 align-top text-slate-700">{item.summary || '-'}</td>
                      <td className="px-4 py-3 align-top"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 align-top w-44">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleOpenDetail(item)} className={iconActionView}><Eye className="w-4 h-4" /></button>
                          {(() => {
                            const normalizedStatus = String(item.status || '').toLowerCase();
                            const canModify = ['draft', 'revision'].includes(normalizedStatus);

                            return canModify ? (
                              <>
                                <button type="button" onClick={() => handleOpenForm('edit', item)} className={iconActionEdit}><Edit className="w-4 h-4" /></button>
                                <button type="button" onClick={() => handleDeleteClick(item)} className={iconActionDelete}><Trash2 className="w-4 h-4" /></button>
                              </>
                            ) : null;
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {logbooks.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing {paginationMeta.from} to {paginationMeta.to} of {paginationMeta.total} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-[#27345A]">
                  {currentPage} / {paginationMeta.last_page}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= paginationMeta.last_page}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <LogbookFormModal
            ref={formRef}
            mode={formMode}
            initialData={selectedLogbook}
            taskCategories={taskCategories}
            onClose={() => setIsFormOpen(false)}
            onAction={handleFormAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailOpen && selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="text-xl font-bold text-[#27345A]">Logbook Detail</h3>
                <button type="button" onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Date</p>
                      <p className="text-lg font-bold text-slate-800">{selectedDetail.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
                      <StatusBadge status={selectedDetail.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">Activity Description</p>
                      <p className="text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">{selectedDetail.summary}</p>
                    </div>
                    {selectedDetail.feedback && (
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Feedback</p>
                        <p className="text-sm text-slate-600 leading-relaxed bg-yellow-50 p-3 rounded-lg border border-yellow-100">{selectedDetail.feedback}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-3">Output/Evidence Files</p>
                    {selectedDetail.outputs && selectedDetail.outputs.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDetail.outputs.map((fileUrl, idx) => {
                          const rawName = String(fileUrl).split('/').pop();
                          const cleanName = rawName.replace(/^([\da-fA-F]+_){1,2}/, '');
                          const ext = cleanName.split('.').pop().toLowerCase();
                          const extLabel = ext.toUpperCase();
                          const isPdf = ext === 'pdf';
                          const isImage = ['png', 'jpg', 'jpeg'].includes(ext);
                          const badgeLabel = isPdf ? 'PDF' : (isImage ? 'IMG' : extLabel || 'FILE');
                          const badgeClasses = isPdf ? 'bg-red-500 text-white' : isImage ? 'bg-blue-500 text-white' : 'bg-slate-300 text-slate-700';

                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl group hover:border-[#354C8F] hover:shadow-md transition-all">
                              <div className="flex items-center gap-4 overflow-hidden cursor-pointer flex-1" onClick={() => handleViewFile(selectedDetail.id, fileUrl, cleanName)}>
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                                  <div className={`text-[10px] font-extrabold px-2 py-1 rounded ${badgeClasses}`}>
                                    {badgeLabel}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-700 truncate group-hover:text-[#354C8F] transition-colors mb-0.5" title={cleanName}>
                                    {cleanName}
                                  </p>
                                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                    Click to preview
                                  </p>
                                </div>
                              </div>
                              <button type="button" onClick={() => handleDownloadFile(selectedDetail.id, fileUrl, cleanName)} className="p-2.5 text-slate-400 hover:text-[#354C8F] hover:bg-slate-50 rounded-lg transition-all" title="Download">
                                <Download size={20} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm">No output files.</div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-4 bg-white rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">Evidence Timeline</p>
                    {(() => {
                      const entries = [
                        { label: "Submitted", value: selectedDetail.submittedAt },
                        { label: "Revision Requested (Mentor)", value: selectedDetail.revisionRequestedAt },
                        { label: "Resubmitted", value: selectedDetail.resubmittedAt },
                        { label: "Approved (Mentor)", value: selectedDetail.approvedAt }
                      ].filter(entry => entry.value);
                      if (!entries.length) {
                        return <div className="text-slate-400 text-sm">No timeline available.</div>;
                      }
                      return entries.map((entry) => (
                        <div key={entry.label} className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{entry.label}</span>
                          <span className="text-slate-700 font-medium">{formatTimestamp(entry.value) || '-'}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10">
                <button type="button" onClick={() => setIsDetailOpen(false)} className={btnSecondaryClass}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteOpen && selectedLogbook && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="text-red-500" size={40} strokeWidth={2.5} /></div>
              <h3 className="text-xl font-bold text-[#27345A] mb-2">Delete this Submission?</h3>
              <p className="text-slate-500 text-sm mb-8">The submission will be permanently deleted. Continue?</p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteOpen(false)} className={`${btnSecondary} w-full justify-center`}>Cancel</button>
                <button onClick={handleDeleteConfirm} className={`${btnDanger} w-full justify-center`}>Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {statusModal.open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center relative">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${statusModal.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
                {statusModal.type === "success" ? <Check className="text-green-500" size={40} strokeWidth={3} /> : <AlertCircle className="text-red-500" size={40} strokeWidth={3} />}
              </div>
              <h3 className="text-xl font-bold text-[#27345A] mb-2">{statusModal.title}</h3>
              <p className="text-slate-500 text-sm mb-8">{statusModal.desc}</p>
              <button onClick={() => setStatusModal(prev => ({ ...prev, open: false }))} className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 ${statusModal.type === "success" ? "bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-green-200" : "bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-red-200"}`}>OK</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
};

const btnPrimaryClass = btnPrimary;

const CustomDropdown = ({ value, onChange, options, placeholder = "Select an option", label, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl border border-slate-200 text-sm text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#354C8F]/20 cursor-pointer transition-all text-left flex justify-between items-center ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
      >
        <span className="flex items-center gap-2">
          {selectedOption && selectedOption.color && (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedOption.color }}></div>
          )}
          <span className={selectedOption ? "text-slate-700 font-semibold" : "text-slate-400"}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </span>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""} ${compact ? 'ml-2' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`absolute ${compact ? 'bottom-full mb-1' : 'top-full mt-2'} left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto min-w-max`}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">No options available</div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(String(option.id));
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-100 transition-colors flex items-center justify-between ${
                  String(option.id) === String(value) ? "bg-[#354C8F]/10 text-[#354C8F] font-semibold" : "text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  {option.color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: option.color }}></div>}
                  {option.name}
                </span>
                {String(option.id) === String(value) && <Check size={16} />}
              </button>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
};

const LogbookFormModal = React.forwardRef(({ mode, initialData, taskCategories = [], onClose, onAction }, ref) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || "",
    taskCategoryId: initialData?.taskCategoryId ? String(initialData.taskCategoryId) : "",
    description: initialData?.summary || "",
  });

  React.useImperativeHandle(ref, () => ({
    setFilesUploading: () => {
      setFiles((prev) => prev.map((f) => f.fileObj ? { ...f, status: 'uploading', progress: 3 } : f));
    },
    updateFileProgress: (updates) => {
      setFiles((prev) => prev.map((f) => {
        if (!f.fileObj) return f;
        const upd = updates.find(u => u.name === f.name);
        if (!upd) return f;
        const p = Math.max(0, Math.min(100, upd.percent || 0));
        return { ...f, progress: p, status: p >= 100 ? 'completed' : 'uploading' };
      }));
    }
  }));

  const [dateError, setDateError] = useState("");

  const isValidLogbookDate = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFuture = date > new Date();
    return !isWeekend && !isFuture;
  };

  const getTodayStr = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const parseExistingFiles = (outputOrList) => {
    if (!outputOrList) return [];
    const list = Array.isArray(outputOrList)
      ? outputOrList
      : String(outputOrList).split(",").map((nameRaw) => nameRaw.trim()).filter(Boolean);
    return list.map((item, idx) => {
      const raw = String(item);
      const name = raw.split("/").pop();
      const ext = (name.split('.').pop() || '').toLowerCase();
      const imageExts = ['jpg', 'jpeg', 'png'];
      let type = 'application/octet-stream';
      if (imageExts.includes(ext)) type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      else if (ext === 'pdf') type = 'application/pdf';
      return { id: `existing-${idx}-${name}`, name, sizeFormatted: "Completed", progress: 100, status: "completed", type, url: raw };
    });
  };

  const [files, setFiles] = useState(() => parseExistingFiles(initialData?.outputs || initialData?.output));
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmDraftState, setConfirmDraftState] = useState(null);
  const [fileErrorModal, setFileErrorModal] = useState({ open: false, message: "" });
  const [fileError, setFileError] = useState("");

  const validExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isDraftFormValid = () => {
    const hasAnyInput = Boolean(formData.date || formData.description.trim() || files.length > 0);
    if (!hasAnyInput) {
      setFileErrorModal({ open: true, message: "To save as draft, please fill at least one field." });
      return false;
    }
    if (formData.date && !isValidLogbookDate(formData.date)) {
      setFileErrorModal({ open: true, message: dateError || "Please select a valid date (weekdays only, not in the future)." });
      return false;
    }
    return true;
  };

  const isSubmitFormValid = () => {
    if (!formData.date) return setFileErrorModal({ open: true, message: "Please select a date." }), false;
    if (!isValidLogbookDate(formData.date)) return setFileErrorModal({ open: true, message: dateError || "Please select a valid date (weekdays only, not in the future)." }), false;
    if (!formData.description.trim()) return setFileErrorModal({ open: true, message: "Activity description is required." }), false;
    if (files.length === 0) return setFileErrorModal({ open: true, message: "Please upload at least one photo (JPEG/PNG) as evidence." }), false;
    const hasImage = files.some(f => (f.type && String(f.type).startsWith('image/')) || /\.(jpe?g|png)$/i.test(String(f.name)));
    if (!hasImage) return setFileErrorModal({ open: true, message: "At least one photo (JPEG/PNG) is required as evidence." }), false;
    return true;
  };

  const handleAction = async (actionType) => {
    if (actionType === "draft" && !isDraftFormValid()) return;
    if (actionType === "submit" && !isSubmitFormValid()) return;

    const filesToUpload = files.filter(f => f.fileObj).map(f => f.fileObj);
    const payload = {
      id: initialData?.id,
      date: formData.date || initialData?.date,
      summary: formData.description || "",
      durasi_jam: 0,
      durasi_menit: 0,
      output: files.length ? files.map((f) => f.name).join(", ") : initialData?.output || "attachment",
      existingOutputs: initialData?.outputs || initialData?.output,
      feedback: initialData?.feedback || ""
    };
    const actionToSend = actionType === "submit" && mode === "edit" ? "resubmit" : actionType;

    if (actionToSend === "submit" || actionToSend === "resubmit") {
      setConfirmState({ action: actionToSend, payload, files: filesToUpload });
      return;
    }

    if (actionType === "draft") {
      setConfirmDraftState({ action: "draft", payload, files: filesToUpload });
      return;
    }

    if (onAction) onAction(actionToSend, payload, filesToUpload);
    onClose();
  };

  const handleFileChange = async (e) => {
    setFileError("");
    const selectedFiles = Array.from(e.target.files || []);
    const validMimeTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "application/x-pdf", "application/acrobat", "application/octet-stream"];
    const maxSize = 5 * 1024 * 1024;

    if (selectedFiles.length === 0) return;

    setFiles((prev) => [...prev, ...selectedFiles.map(f => ({ id: Date.now() + Math.random(), name: f.name, size: f.size, type: f.type, status: 'processing', progress: 0 }))]);

    const compressionPromises = selectedFiles.map(async (file) => {
      const fileExt = "." + String(file.name).split('.').pop().toLowerCase();
      const isValidType = validExtensions.includes(fileExt) || validMimeTypes.includes(file.type) || ((file.type === "" || file.type === "application/octet-stream") && validExtensions.includes(fileExt));
      if (!isValidType) throw new Error(`invalid:${file.name}`);
      if (file.size > maxSize) throw new Error(`toolarge:${file.name}`);

      let finalFile = file;
      if (file.type && file.type.startsWith('image/')) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        try {
          const compressed = await imageCompression(file, options);
          finalFile = new File([compressed], file.name, { type: file.type, lastModified: Date.now() });
        } catch (err) {
          finalFile = file;
        }
      }

      return {
        id: Date.now() + Math.random(),
        fileObj: finalFile,
        name: finalFile.name,
        size: finalFile.size,
        type: finalFile.type,
        sizeFormatted: formatBytes(finalFile.size),
        progress: 100,
        status: 'completed'
      };
    });

    try {
      const settled = await Promise.allSettled(compressionPromises);
      const successful = settled.filter(s => s.status === 'fulfilled').map(s => s.value);
      const failed = settled.filter(s => s.status === 'rejected');
      if (failed.length) {
        const reason = failed[0].reason ? String(failed[0].reason) : 'Error processing files.';
        if (reason.startsWith('invalid:')) setFileError('Some files are invalid (only JPG/PNG/PDF allowed).');
        else if (reason.startsWith('toolarge:')) setFileError('Some files exceed the 5MB size limit.');
        else setFileError('Error processing files.');
      }

      setFiles((prev) => {
        const filtered = prev.filter(p => p.status !== 'processing');
        return [...filtered, ...successful];
      });
    } catch (err) {
      console.warn('Unexpected error during file processing:', err);
      setFileError('Error processing files.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    handleFileChange({ target: { files: dropped } });
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-[#27345A]">{mode === "add" ? "Add Logbook Form" : "Edit Logbook Form"}</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="date"
                  value={formData.date}
                  max={getTodayStr()}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    setFormData({ ...formData, date: selectedDate });
                    if (selectedDate) {
                      const date = new Date(selectedDate + "T00:00:00");
                      const dayOfWeek = date.getDay();
                      if (dayOfWeek === 0 || dayOfWeek === 6) {
                        setDateError("Cannot select weekends (Saturday/Sunday)");
                      } else if (date > new Date()) {
                        setDateError("Cannot select future dates");
                      } else {
                        setDateError("");
                      }
                    } else {
                      setDateError("");
                    }
                  }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#354C8F]/20 cursor-pointer"
                />
              </div>
              {dateError && <p className="text-xs text-red-500 mt-2">{dateError}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Activity Description <span className="text-red-500">*</span></label>
              <textarea rows="4" required placeholder="Describe your activity details here" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-4 rounded-xl border border-slate-200 text-sm bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#354C8F]/20 resize-none transition-all"></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Output or Result <span className="text-red-500">*</span></label>
              <p className="text-xs text-slate-500 mb-3 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                <span className="font-semibold text-blue-700">Required: upload at least one photo (selfie) taken during the work as evidence. Only JPEG/PNG accepted for evidence photos.</span>
              </p>
              <div
                onClick={() => fileInputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? "border-[#354C8F] bg-blue-50" : "border-slate-300 hover:bg-slate-50"}`}
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <UploadCloud className="text-[#354C8F]" size={24} />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">Choose a file or drag & drop it here</p>
                <p className="text-xs text-slate-400 mb-4">JPEG, PNG, PDF formats, up to 5MB</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all">Browse Files</button>
                <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </div>
              {fileError && (
                <div className="flex items-center gap-2 text-red-500 text-sm mt-3 bg-red-50 p-2 rounded-lg border border-red-100 animate-pulse">
                  <AlertCircle size={16} />
                  <span>{fileError}</span>
                </div>
              )}
              {files.length > 0 && (
                <div className="mt-4 space-y-3">
                  {files.map((f) => (
                    <div key={f.id} className="bg-[#EFF4FF] rounded-xl p-3 flex items-center gap-3 border border-slate-100 relative overflow-hidden">
                      {f.status === "uploading" && (
                        <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${f.progress}%` }}></div>
                      )}
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                        {(() => {
                          const name = String(f.name || '');
                          const ext = (name.split('.').pop() || '').toLowerCase();
                          const isPdf = ext === 'pdf';
                          const isImage = ['png', 'jpg', 'jpeg'].includes(ext);
                          const badgeLabel = isPdf ? 'PDF' : (isImage ? 'IMG' : (ext.toUpperCase() || 'FILE'));
                          const badgeClasses = isPdf ? 'bg-red-500 text-white' : isImage ? 'bg-blue-500 text-white' : 'bg-slate-300 text-slate-700';
                          return <div className={`text-[10px] font-extrabold px-2 py-1 rounded ${badgeClasses}`}>{badgeLabel}</div>;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{f.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{f.sizeFormatted || f.size}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          {f.status === "uploading" ? (
                            <span className="text-blue-600 font-medium flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading {Math.min(f.progress, 100)}%</span>
                          ) : f.status === 'completed' ? (
                            <span className="text-emerald-600 font-medium flex items-center gap-1"><Check size={10} /> Completed</span>
                          ) : (
                            <span className="text-green-600 font-medium flex items-center gap-1"><Check size={10} /> Completed</span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeFile(f.id)} className="p-2 text-slate-400 hover:text-red-500"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-2xl">
          <button type="button" onClick={() => handleAction("draft")} className={btnSecondary}>Save As Draft</button>
          <button
            type="button"
            onClick={() => handleAction("submit")}
            disabled={!formData.date || !formData.description.trim() || files.some(f => f.status === "uploading") || !files.some(f => (f.type && String(f.type).startsWith('image/')) || /\.(jpe?g|png)$/i.test(String(f.name)))}
            className={btnPrimaryClass}
          >
            {mode === 'add' || initialData?.rawStatus === 'draft' || String(initialData?.status).toLowerCase() === 'draft' ? 'Submit' : 'Re-Submit'}
          </button>
        </div>

        <AnimatePresence>
          {confirmState && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative">
                <button onClick={() => setConfirmState(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center"><AlertCircle className="text-amber-500" size={40} strokeWidth={2.5} /></div>
                <h3 className="text-xl font-bold text-[#27345A] mb-2">Submit Confirmation</h3>
                <p className="text-sm text-slate-600 mb-6">After submitting, this logbook cannot be edited or deleted. Proceed?</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmState(null)} className={`${btnSecondary} w-full justify-center`}>Cancel</button>
                  <button
                    onClick={() => {
                      if (confirmState) {
                        setFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading', progress: 3 })));
                        setTimeout(() => {
                          if (onAction) onAction(confirmState.action, confirmState.payload, confirmState.files || []);
                        }, 60);
                      }
                      setConfirmState(null);
                      onClose();
                    }}
                    className={`${btnConfirmClass} w-full justify-center`}
                  >
                    Yes, Submit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmDraftState && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative">
                <button onClick={() => setConfirmDraftState(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center"><Save className="text-blue-500" size={40} strokeWidth={2.5} /></div>
                <h3 className="text-xl font-bold text-[#27345A] mb-2">Save as Draft?</h3>
                <p className="text-sm text-slate-600 mb-6">Your logbook will be saved as draft and can be edited later. Continue?</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDraftState(null)} className={`${btnSecondary} w-full justify-center`}>Cancel</button>
                  <button
                    onClick={() => {
                      if (onAction && confirmDraftState) onAction(confirmDraftState.action, confirmDraftState.payload, confirmDraftState.files || []);
                      setConfirmDraftState(null);
                      onClose();
                    }}
                    className={`${btnPrimary} w-full justify-center`}
                  >
                    Yes, Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {fileErrorModal.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setFileErrorModal({ open: false, message: "" })}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl relative"
              >
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle className="text-red-500" size={40} strokeWidth={2.5} /></div>
                <h3 className="text-xl font-bold text-[#27345A] mb-2">Invalid File</h3>
                <p className="text-slate-500 text-sm mb-6">{fileErrorModal.message}</p>
                <button onClick={() => setFileErrorModal({ open: false, message: "" })} className={`${btnPrimaryClass} w-full`}>OK</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

const ModalOverlay = ({ children, onClose, width = "max-w-md", zIndex = "z-50", compact = false }) => (
  <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/40 backdrop-blur-sm p-4`}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white w-[95%] md:w-full ${width} rounded-2xl shadow-2xl ${compact ? 'p-4' : 'p-6'} relative`}
    >
      {children}
    </motion.div>
  </div>
);

export default DailyActivitiesPage;
