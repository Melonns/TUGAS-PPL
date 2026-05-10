import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Filter,
    Eye,
    Check,
    X,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    FileText,
    Download,
    MessageSquare,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/axiosConfig';

const colors = {
    primary: "#354C8F",
    textDark: "#203266",
    bgLight: "#F8F9FD"
};

const btnBase = "py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = `${btnBase} bg-[#354C8F] hover:bg-[#2a3c70] text-white shadow-md shadow-indigo-200`;
const btnSecondary = `${btnBase} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`;
const btnSuccess = `${btnBase} bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-md shadow-green-200`;
const btnReject = `${btnBase} bg-white border border-red-500 text-red-600 hover:bg-red-50`;
const actionBtnStyle = "inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors active:scale-95 shadow-sm text-white";

const LogbookApproval = () => {
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [serverMeta, setServerMeta] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [feedbackInput, setFeedbackInput] = useState("");
    const [confirmAction, setConfirmAction] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const selectAllRef = useRef(null);
    const [statusType, setStatusType] = useState('success');
    const [statusMessage, setStatusMessage] = useState({ title: "", desc: "" });
    const initialFilter = { status: [], startDate: "", endDate: "" };
    const [filter, setFilter] = useState(initialFilter);
    const [appliedFilter, setAppliedFilter] = useState(initialFilter);
    const isFilterActive = (appliedFilter.status && appliedFilter.status.length > 0) || appliedFilter.startDate !== "" || appliedFilter.endDate !== "";
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const pageSize = serverMeta?.per_page ?? itemsPerPage;
    const totalEntries = serverMeta?.total ?? logs.length;
    const totalPages = serverMeta?.last_page ?? Math.max(1, Math.ceil(totalEntries / pageSize));
    const indexOfLastItem = currentPage * pageSize;
    const indexOfFirstItem = indexOfLastItem - pageSize;
    const currentItems = serverMeta ? logs : logs.slice(indexOfFirstItem, indexOfLastItem);

    const paginationMeta = serverMeta ? {
        current_page: serverMeta.current_page ?? currentPage,
        last_page: serverMeta.last_page ?? totalPages,
        from: serverMeta.from ?? (totalEntries === 0 ? 0 : indexOfFirstItem + 1),
        to: serverMeta.to ?? Math.min(indexOfLastItem, totalEntries),
        total: serverMeta.total ?? totalEntries
    } : {
        current_page: currentPage,
        last_page: totalPages,
        from: totalEntries === 0 ? 0 : indexOfFirstItem + 1,
        to: Math.min(indexOfLastItem, totalEntries),
        total: totalEntries
    };

    const buildDurationTextFromParts = (hours, minutes) => {
        const h = Number(hours) || 0;
        const m = Number(minutes) || 0;
        if (h === 0 && m === 0) return "0 Hours";
        if (m === 0) return `${h} Hours`;
        if (h === 0) return `${m} Minutes`;
        return `${h} Hours ${m} Minutes`;
    };

    const normalizeStatus = (rawStatus) => {
        const s = String(rawStatus || '').toLowerCase();
        if (s === 'verified') return 'Verified';
        if (s === 'pending') return 'Pending';
        if (s === 'rejected') return 'Rejected';
        return 'Pending';
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
        if (Array.isArray(item.bukti_kegiatan)) return item.bukti_kegiatan;
        if (item.bukti_kegiatan && typeof item.bukti_kegiatan === 'string') return [item.bukti_kegiatan];
        if (item.output && typeof item.output === 'string') {
            return item.output.split(',').map(s => s.trim()).filter(Boolean);
        }
        return [];
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

    const buildFilterParams = (source) => {
        const params = {};
        if (source.startDate && source.endDate) {
            params.start_date = source.startDate;
            params.end_date = source.endDate;
        }
        if (source.status && source.status.length > 0) {
            params.status_verifikasi = source.status.map(s => s.toLowerCase()).join(',');
        }
        return params;
    };

    const fetchLogs = async (params = {}) => {
        setLoadingLogs(true);
        try {
            const res = await apiClient.get('/mentor/logbook', { params: { per_page: itemsPerPage, ...params } });
            const raw = res?.data ?? {};
            const container = raw?.data ?? raw;
            const items = Array.isArray(container)
                ? container
                : (Array.isArray(container?.data) ? container.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []));

            const mapped = (items || []).map(item => {
                const rawStatus = item.status_verifikasi ?? item.status ?? 'pending';
                const status = normalizeStatus(rawStatus);
                const outputs = buildPreviewOutputs(normalizeOutputsFromItem(item));
                const dj = Number(item.durasi_jam ?? 0) || 0;
                const dm = Number(item.durasi_menit ?? 0) || 0;
                const durationText = buildDurationTextFromParts(dj, dm);
                const name = item.nama_lengkap || item.intern_name || item.user_name || item.user?.nama_lengkap || item.user?.name || '-';
                const approvedAt = item.approved_at || item.verified_at || item.approved_at_mentor || item.verified_at_mentor || item.approvedAt || item.verifiedAt || findTimestampByKeywords(item, ['approve', 'at']) || findTimestampByKeywords(item, ['verify', 'at']) || null;
                const rejectedAt = item.rejected_at || item.rejected_at_mentor || item.rejectedAt || findTimestampByKeywords(item, ['reject', 'at']) || null;
                const submittedAt = item.submitted_at || item.submittedAt || item.created_at || item.createdAt || findTimestampByKeywords(item, ['submit', 'at']) || item.updated_at || null;
                const resubmittedAt = item.resubmitted_at || item.resubmittedAt || findTimestampByKeywords(item, ['resubmit', 'at']) || null;
                return {
                    id: item.id_logbook ?? item.id,
                    name,
                    date: item.tanggal,
                    description: item.deskripsi_kegiatan || item.deskripsi || item.activity_description || item.activity || '',
                    duration: durationText,
                    status,
                    rawStatus,
                    feedback: item.feedback || '',
                    outputs,
                    attachment: outputs?.[0] || null,
                    approvedAt,
                    rejectedAt,
                    submittedAt,
                    resubmittedAt
                };
            });

            const metaSource = (container && typeof container.per_page !== 'undefined')
                ? container
                : (raw && typeof raw.per_page !== 'undefined' ? raw : null);

            if (metaSource) {
                setServerMeta({
                    current_page: Number(metaSource.current_page ?? 1),
                    last_page: Number(metaSource.last_page ?? Math.max(1, Math.ceil((metaSource.total ?? mapped.length) / (metaSource.per_page ?? itemsPerPage)))),
                    total: Number(metaSource.total ?? mapped.length),
                    per_page: Number(metaSource.per_page ?? itemsPerPage),
                    from: metaSource.from ?? 0,
                    to: metaSource.to ?? mapped.length
                });
                setCurrentPage(Number(metaSource.current_page ?? 1));
            } else {
                setServerMeta(null);
            }

            setLogs(mapped);
            setSelectedIds([]);
        } catch (err) {
            console.error('Error fetching mentor logbooks:', err);
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleViewFile = (logbookId, fileUrl, cleanName) => {
        const rawName = String(fileUrl).split('/').pop();
        const displayName = cleanName || rawName;
        const secureUrl = `/logbook/${logbookId}/file/${encodeURIComponent(rawName)}`;
        const viewerUrl = `/mentor/file-viewer?url=${encodeURIComponent(secureUrl)}&name=${encodeURIComponent(displayName)}`;
        window.open(viewerUrl, '_blank');
    };

    const handleDownloadFile = async (logbookId, fileUrl, cleanName) => {
        try {
            const rawName = String(fileUrl).split('/').pop();
            const downloadName = cleanName || rawName;
            const secureUrl = `/logbook/${logbookId}/file/${encodeURIComponent(rawName)}?download=1`;
            const res = await apiClient.get(secureUrl, { responseType: "blob" });

            const blobUrl = URL.createObjectURL(res.data);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Error downloading file:", err);
        }
    };

    useEffect(() => {
        fetchLogs(buildFilterParams(appliedFilter));
    }, []);

    const pendingIdsOnPage = currentItems
        .filter(item => item.status === 'Pending')
        .map(item => item.id)
        .filter(Boolean);

    const isAllPendingSelected = pendingIdsOnPage.length > 0 && pendingIdsOnPage.every(id => selectedIds.includes(id));
    const isSomePendingSelected = pendingIdsOnPage.some(id => selectedIds.includes(id)) && !isAllPendingSelected;

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = isSomePendingSelected;
        }
    }, [isSomePendingSelected]);

    const handlePageChange = async (page) => {
        if (page < 1) return;
        const pageTotal = serverMeta?.last_page ?? totalPages;
        if (page > pageTotal) return;
        if (serverMeta) {
            setCurrentPage(page);
            await fetchLogs({ page, ...buildFilterParams(appliedFilter) });
        } else {
            setCurrentPage(page);
        }
    };

    const handleOpenDetail = (item) => {
        setSelectedLog(item);
        setFeedbackInput(item.feedback || "");
        setShowDetailModal(true);
    };

    const handleActionInit = (action) => {
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        setShowConfirmModal(false);
        try {
            const statusValue = confirmAction === 'approve' ? 'verified' : 'rejected';
            await apiClient.post(`/mentor/logbook/${selectedLog.id}/verify`, {
                status_verifikasi: statusValue,
                feedback: feedbackInput || ''
            });

            setStatusMessage({
                title: confirmAction === 'approve' ? "Verified" : "Rejected",
                desc: `The logbook entry has been ${confirmAction}d successfully.`
            });
            setStatusType('success');
            setShowStatusModal(true);
            setShowDetailModal(false);
            await fetchLogs({ page: currentPage, ...buildFilterParams(appliedFilter) });
        } catch (err) {
            console.error('Error verifying logbook:', err);
            setStatusMessage({
                title: 'Error',
                desc: 'Failed to update logbook status.'
            });
            setStatusType('error');
            setShowStatusModal(true);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAllPending = () => {
        setSelectedIds(prev => {
            if (isAllPendingSelected) {
                return prev.filter(id => !pendingIdsOnPage.includes(id));
            }
            const combined = new Set([...prev, ...pendingIdsOnPage]);
            return Array.from(combined);
        });
    };

    const executeBulkApprove = async () => {
        setShowBulkConfirmModal(false);
        if (pendingIdsOnPage.length === 0 || selectedIds.length === 0) return;
        const idsToApprove = selectedIds.filter(id => pendingIdsOnPage.includes(id));
        if (idsToApprove.length === 0) return;
        setBulkLoading(true);
        try {
            const tasks = idsToApprove.map(id => apiClient.post(`/mentor/logbook/${id}/verify`, {
                status_verifikasi: 'verified',
                feedback: ''
            }));
            await Promise.all(tasks);
            setStatusMessage({
                title: 'Verified',
                desc: `${idsToApprove.length} logbook(s) verified successfully.`
            });
            setStatusType('success');
            setShowStatusModal(true);
            await fetchLogs({ page: currentPage, ...buildFilterParams(appliedFilter) });
        } catch (err) {
            console.error('Error bulk verifying logbooks:', err);
            setStatusMessage({
                title: 'Error',
                desc: 'Failed to verify selected logbooks.'
            });
            setStatusType('error');
            setShowStatusModal(true);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleFilterToggle = (key, value) => {
        setFilter(prev => ({ ...prev, [key]: value }));
    };

    const handleStatusToggle = (statusValue) => {
        setFilter(prev => {
            const current = prev.status || [];
            const updated = current.includes(statusValue) ? current.filter(s => s !== statusValue) : [...current, statusValue];
            return { ...prev, status: updated };
        });
    };

    const resetFilter = () => {
        setFilter(initialFilter);
        setAppliedFilter(initialFilter);
        setSelectedIds([]);
    };

    const applyFilter = () => {
        setAppliedFilter(filter);
        setShowFilterModal(false);
        fetchLogs({ page: 1, ...buildFilterParams(filter) });
        setCurrentPage(1);
        setSelectedIds([]);
    };

    const Badge = ({ text, small = false }) => {
        let style = "";
        if (text === 'Verified') style = "bg-green-100 text-green-700 border-green-200";
        else if (text === 'Pending') style = "bg-[#FFF8E1] text-[#F59E0B] border-[#FFE0B2]";
        else if (text === 'Rejected') style = "bg-red-50 text-red-600 border-red-200";
        else style = "bg-slate-100 text-slate-600 border-slate-200";

        const sizeClass = small ? 'w-[100px] px-2' : 'min-w-[140px] px-3';

        return (
            <span className={`inline-flex items-center justify-center ${sizeClass} h-[34px] rounded-lg text-xs font-bold border whitespace-nowrap ${style}`}>
                {text}
            </span>
        );
    };

    return (
        <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-800 -mt-8">
            <div className="mb-8 mt-4 md:mt-0">
                <h1 className={`text-2xl md:text-3xl font-bold text-[${colors.textDark}] mb-1 md:mb-2`}>Logbook Approval</h1>
                <p className="text-slate-500 text-xs md:text-sm">Check and validate your intern logbooks!</p>
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

export default LogbookApproval;
