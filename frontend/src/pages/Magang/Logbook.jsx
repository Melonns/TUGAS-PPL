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

    if (mode === 'edit' && data?.id) {
      try {
        const res = await apiClient.get(`/logbook/${data.id}`);
        const d = res?.data?.data ?? res?.data ?? {};
        const outputs = buildPreviewOutputs(normalizeOutputsFromItem(d));
        const normalized = {
          id: d.id_logbook ?? d.id,
          date: d.tanggal,
          taskCategoryId: d.tag_id || d.tagId || d.tag?.id || '',
          taskCategory: d.tag?.nama || d.task_category || d.kategori_task || d.taskCategory || d.category_task || d.category || '',
          summary: d.deskripsi_kegiatan || d.deskripsi || d.activity_description || d.activity || '',
          output: Array.isArray(d.bukti_kegiatan) ? d.bukti_kegiatan.join(',') : (d.bukti_kegiatan || ''),
          outputs,
          status: normalizeStatus(d.status_verifikasi || d.status),
          rawStatus: d.status_verifikasi || d.status || 'draft',
          feedback: d.feedback || ''
        };
        setSelectedLogbook(normalized);
      } catch (err) {
        console.warn('Could not fetch logbook detail, using list data', err);
        setSelectedLogbook(data);
      }
    } else {
      setSelectedLogbook(data);
    }
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

  const handleViewFile = (logbookId, fileUrl, displayName) => {
    const fileName = String(fileUrl).split('/').pop();
    const secureEndpoint = `/logbook/${logbookId}/file/${fileName}`;
    window.open(`/magang/file-viewer?url=${encodeURIComponent(secureEndpoint)}&name=${encodeURIComponent(displayName || fileName)}`, '_blank');
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

      const statusFilter = params.status_verifikasi ?? buildFilterParams(appliedFilter).status_verifikasi ?? '';
      const containsNotYet = String(statusFilter).toLowerCase().includes('not yet');
      const dailyFlag = typeof params.daily !== 'undefined' ? params.daily : (containsNotYet ? 1 : undefined);

      let res;
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

      try {
        res = await apiClient.get(`/logbook/summary/${mahasiswaId}`, { params: commonParams });
      } catch (err) {
        console.error('Failed to fetch logbook summary:', err);
        res = await apiClient.get('/logbook', { params: { id_mahasiswa: mahasiswaId, include_daily_summary: 1, ...commonParams } });
      }

      const raw = res?.data ?? {};
      const payload = raw?.data ?? raw;
      const missing = payload?.daily_summary_missing_days ?? raw?.daily_summary_missing_days ?? payload?.data?.daily_summary_missing_days ?? [];
      setDailySummaryMissingDays(Array.isArray(missing) ? missing : []);
      const period = payload?.attendance_period ?? raw?.attendance_period ?? null;
      setAttendancePeriod(period);

      const isDailyResponse = Boolean(payload?.daily_summary) || Boolean(dailyFlag);
      let summary = payload?.daily_summary ?? payload?.data ?? payload?.items ?? [];
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

      const mapped = (summary || []).map((row, idx) => {
        if (!isDailyResponse) {
          const mappedLog = mapLogbookItem(row || {});
          return {
            ...mappedLog,
            _rowType: 'logbook',
            _hasLogbook: true,
            _logbook: row,
            _flags: { isNotSubmit: false, isNotYet: false }
          };
        }

        const logbook = row?.logbooks || row?.logbook || null;
        const attendance = row?.attendance || row?.daily_summary?.attendance || null;
        const date = row?.tanggal || row?.date || '';
        const isNotSubmit = Boolean(row?.is_not_submit || (row?.daily_summary && row.daily_summary.is_not_submit));
        const isNotYet = Boolean(row?.is_not_yet || (row?.daily_summary && row.daily_summary.is_not_yet));

        const rawStatusValue = logbook?.status_verifikasi ?? logbook?.status
          ?? row?.status_verifikasi ?? row?.status ?? '';

        const statusLabel = isNotSubmit
          ? 'No logbook submitted'
          : (isNotYet ? 'Not Yet' : mapDailyStatus(rawStatusValue));

        const attendanceReason = row?.status || attendance?.status || attendance?.attendance_status || (row?.attendance_reason || row?.daily_summary?.attendance_reason) || '';
        const descKegiatan = (logbook?.deskripsi_kegiatan || logbook?.deskripsi || logbook?.activity_description || logbook?.activity) || (row?.deskripsi_kegiatan || row?.deskripsi || row?.activity_description || row?.activity);
        
        const finalActivitySummary = descKegiatan 
          ? descKegiatan 
          : (isNotSubmit && attendanceReason ? `Submission disabled: ${attendanceReason}` : '-');

        return {
          id: logbook?.logbooks_id ?? logbook?.logbook_id ?? logbook?.id_logbooks ?? logbook?.id_logbook ?? logbook?.id ?? row?.logbooks?.logbooks_id ?? row?.id_logbooks ?? row?.id_logbook ?? row?.id ?? `daily-${date}-${idx}`,
          date,
          taskCategoryId: getTaskCategoryIdFromItem(logbook || row),
          taskCategory: getTaskCategoryFromItem(logbook || row),
          jam_masuk: attendance?.jam_masuk || '-',
          jam_pulang: attendance?.jam_pulang || '-',
          durasi_kerja: attendance?.durasi_kerja || attendance?.work_duration?.formatted || '-',
          summary: finalActivitySummary,
          output: Array.isArray(logbook?.bukti_kegiatan) ? logbook.bukti_kegiatan.join(',') : (logbook?.bukti_kegiatan || row?.bukti_kegiatan || logbook?.output || row?.output || ''),
          outputs: buildPreviewOutputs(normalizeOutputsFromItem(logbook || row)),
          status: statusLabel,
          rawStatus: logbook?.status_verifikasi || logbook?.status || row?.status_verifikasi || row?.status || '',
          feedback: logbook?.feedback || row?.feedback || '',
          dailySummary: row?.daily_summary ?? null,
          _rowType: logbook ? 'logbook' : (row?.logbooks?.logbooks_id || row?.id_logbooks || row?.id_logbook || row?.id ? 'logbook' : 'missing'),
          _hasLogbook: Boolean(logbook || row?.logbooks?.logbooks_id || row?.id_logbooks || row?.id_logbook || row?.id),
          _logbook: logbook || row,
          _flags: { isNotSubmit, isNotYet }
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

    fetchTaskCategories();
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
    try {
      const res = await apiClient.get(`/logbook/${logbookId}`);
      const d = res?.data?.data ?? res?.data ?? null;
      if (d) {
        const mapped = mapLogbookItem(d);
        if (item?.date) mapped.date = item.date;
        if ((!mapped.outputs || mapped.outputs.length === 0) && Array.isArray(initial.outputs) && initial.outputs.length > 0) {
          mapped.outputs = initial.outputs;
        }
        setSelectedDetail(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch logbook detail timestamps', err);
    }
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
    <div className="bg-slate-50 -ml-2 -mr-6 min-h-screen p-6 font-sans text-slate-800 -mt-1">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#27345A] mb-2 -mt-2">Your Daily Activities (Logbook)</h1>
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
    </div>
  );
};

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
