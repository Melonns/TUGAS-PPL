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
        if (s === 'rejected' || s === 'revision_needed') return 'Revision';
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
                const name = item.nama_lengkap || item.intern_name || item.user_name || item.user?.nama_lengkap || item.user?.nama || item.user?.name || '-';
                const approvedAt = item.approved_at || item.verified_at || item.approved_at_mentor || item.verified_at_mentor || item.approvedAt || item.verifiedAt || findTimestampByKeywords(item, ['approve', 'at']) || findTimestampByKeywords(item, ['verify', 'at']) || null;
                const rejectedAt = item.rejected_at || item.rejected_at_mentor || item.rejectedAt || findTimestampByKeywords(item, ['reject', 'at']) || null;
                const submittedAt = item.submitted_at || item.submittedAt || item.created_at || item.createdAt || findTimestampByKeywords(item, ['submit', 'at']) || item.updated_at || null;
                const resubmittedAt = item.resubmitted_at || item.resubmittedAt || findTimestampByKeywords(item, ['resubmit', 'at']) || null;
                return {
                    id: item.id_logbooks ?? item.id_logbook ?? item.id,
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

    const toggleSelectAll = () => {
        const pendingLogs = logs.filter(log => log.status === 'Pending');
        if (selectedIds.length === pendingLogs.length && pendingLogs.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingLogs.map(log => log.id));
        }
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
            const statusValue = confirmAction === 'approve' ? 'verified' : 'revision_needed';
            await apiClient.post(`/mentor/logbook/${selectedLog.id}/verify`, {
                status_verifikasi: statusValue,
                feedback: feedbackInput || ''
            });

            setStatusMessage({
                title: confirmAction === 'approve' ? "Verified" : "Revision",
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
        else if (text === 'Revision') style = "bg-red-50 text-red-600 border-red-200";
        else style = "bg-slate-100 text-slate-600 border-slate-200";

        const sizeClass = small ? 'w-[100px] px-2' : 'min-w-[140px] px-3';

        return (
            <span className={`inline-flex items-center justify-center ${sizeClass} h-[34px] rounded-lg text-xs font-bold border whitespace-nowrap ${style}`}>
                {text}
            </span>
        );
    };

    return (
        <div className="bg-slate-50 w-full h-[calc(100vh-90px)] overflow-hidden p-4 md:p-6 font-sans text-slate-800 flex flex-col">
            {/* HEADER */}
            <div className="mb-6 shrink-0">
                <h1 className={`text-3xl font-bold text-[#27345A] mb-2 -mt-1`}>Logbook Approval</h1>
                <p className="text-slate-500 text-sm">Check and validate your intern logbooks!</p>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                {/* ACTION BAR */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-4 mb-4 shrink-0">
                    <div className="flex gap-3 w-full max-w-2xl">
                        <div className="relative w-full">
                            <input type="text" placeholder="Search by Intern" className="w-full border border-slate-200 rounded-lg py-2.5 px-4 pr-10 text-sm" />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        </div>
                        <button
                            onClick={() => {
                                setFilter(appliedFilter);
                                setShowFilterModal(true);
                            }}
                            className={btnSecondary}>
                            <Filter size={16} /> <span className="hidden md:inline">Filter</span>
                            {isFilterActive && <div className="ml-2 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>}
                        </button>
                    </div>
                    <button
                        onClick={() => setShowBulkConfirmModal(true)}
                        disabled={bulkLoading || selectedIds.length === 0}
                        className={`${btnSuccess} ${selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Check size={16} /> Approve ({selectedIds.length})
                    </button>
                </div>

                {/* TABLE */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="bg-white rounded-lg shadow overflow-y-auto flex-1 min-h-0">
                        <table className="w-full text-sm table-auto">
                            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                <tr className="text-left text-xs text-slate-500 uppercase">
                                    <th className="px-4 py-3 w-12 text-center">
                                        <input
                                            ref={selectAllRef}
                                            type="checkbox"
                                            checked={isAllPendingSelected}
                                            onChange={toggleSelectAllPending}
                                            disabled={pendingIdsOnPage.length === 0}
                                            className="h-4 w-4 rounded border-slate-300 text-[#354C8F]"
                                        />
                                    </th>
                                    <th className="px-4 py-3 w-12 text-center">No</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3 w-1/3">Description</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingLogs ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-400">Loading logbooks...</td>
                                    </tr>
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8}>
                                            <div className="flex items-center justify-center py-12">
                                                <div className="text-center">
                                                    <div className="text-lg font-semibold text-slate-700">No logbook entries found</div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((item, index) => (
                                        <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-center align-top">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    disabled={item.status !== 'Pending'}
                                                    className="h-4 w-4 rounded border-slate-300 text-[#354C8F] disabled:opacity-40"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center align-top text-slate-500 font-medium">{(paginationMeta?.from || 1) + index}</td>
                                            <td className="px-4 py-3 align-top font-medium text-slate-700">{item.name}</td>
                                            <td className="px-4 py-3 align-top whitespace-nowrap">{item.date}</td>
                                            <td className="px-4 py-3 align-top">
                                                <p className="line-clamp-2" title={item.description}>{item.description}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center align-top"><Badge text={item.status} /></td>
                                            <td className="px-4 py-3 text-center align-top">
                                                <button
                                                    onClick={() => handleOpenDetail(item)}
                                                    className={`${actionBtnStyle} bg-[#354C8F] hover:bg-[#2a3c70] shadow-indigo-100`}
                                                    title="View Detail"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    {totalEntries > 0 && (
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
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
            </div>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {/* 1. FILTER MODAL */}
                {showFilterModal && (
                    <ModalOverlay zIndex="z-50" onClose={() => setShowFilterModal(false)}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#27345A]">Filter Logbook</h3>
                            <button onClick={() => setShowFilterModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">Status</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['Verified', 'Pending', 'Revision'].map(status => (
                                        <button key={status} onClick={() => handleStatusToggle(status)}
                                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${filter.status && filter.status.includes(status) ? 'bg-[#354C8F] text-white border-[#354C8F] shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Start Date</label>
                                <div className="relative">
                                    <input type="date" value={filter.startDate} onChange={(e) => handleFilterToggle('startDate', e.target.value)} onClick={(e) => e.target.showPicker && e.target.showPicker()} className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#354C8F]/20 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden" />
                                    <Calendar className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={18} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">End Date</label>
                                <div className="relative">
                                    <input type="date" value={filter.endDate} onChange={(e) => handleFilterToggle('endDate', e.target.value)} onClick={(e) => e.target.showPicker && e.target.showPicker()} className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#354C8F]/20 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden" />
                                    <Calendar className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={18} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-slate-100">
                            <button onClick={resetFilter} className={btnSecondary}>Reset</button>
                            <button onClick={applyFilter} className={btnPrimary}>Apply</button>
                        </div>
                    </ModalOverlay>
                )}

                {/* 2. DETAIL MODAL (Improved) */}
                {showDetailModal && selectedLog && (
                    <ModalOverlay zIndex="z-50" onClose={() => setShowDetailModal(false)} width="max-w-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#27345A]">Logbook Approval</h3>
                            <button onClick={() => setShowDetailModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="h-12 w-12 rounded-full bg-[#354C8F]/10 flex items-center justify-center text-[#354C8F]">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-[#27345A]">{selectedLog.name || '-'}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {selectedLog.date}</span>
                                    </div>
                                </div>
                                <div className="ml-auto">
                                    <Badge text={selectedLog.status} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">Activity Description</label>
                                <div className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-700 leading-relaxed min-h-[80px]">
                                    {selectedLog.description}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">Attached Output</label>
                                {selectedLog.outputs && selectedLog.outputs.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedLog.outputs.map((fileUrl, idx) => {
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
                                                    <div
                                                        className="flex items-center gap-4 overflow-hidden cursor-pointer flex-1"
                                                        onClick={() => handleViewFile(selectedLog.id, fileUrl, cleanName)}
                                                    >
                                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                                                            <div className={`text-[10px] font-extrabold px-2 py-1 rounded ${badgeClasses}`}>
                                                                {badgeLabel}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold text-slate-700 truncate group-hover:text-[#354C8F] transition-colors mb-0.5" title={cleanName}>
                                                                {cleanName}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400 flex items-center gap-1">Click to preview</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDownloadFile(selectedLog.id, fileUrl, cleanName)}
                                                        className="p-2.5 text-slate-400 hover:text-[#354C8F] hover:bg-slate-50 rounded-lg transition-all"
                                                        title="Download"
                                                    >
                                                        <Download size={20} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic">No attachment provided.</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">Feedback</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#354C8F] bg-white transition-colors h-24 resize-none"
                                    placeholder="Provide feedback for the intern (optional)..."
                                    value={feedbackInput}
                                    onChange={(e) => setFeedbackInput(e.target.value)}
                                    disabled={selectedLog.status !== 'Pending'}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 gap-3 p-4 bg-white rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase">Evidence Timeline</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">{selectedLog.resubmittedAt ? 'Resubmitted' : 'Submitted'}</span>
                                    <span className="text-slate-700 font-medium">
                                        {formatTimestamp(selectedLog.resubmittedAt || selectedLog.submittedAt) || '-'}
                                    </span>
                                </div>
                                {selectedLog.status === 'Verified' && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Approved (Mentor)</span>
                                        <span className="text-slate-700 font-medium">{formatTimestamp(selectedLog.approvedAt) || '-'}</span>
                                    </div>
                                )}
                                {selectedLog.status === 'Revision' && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Revision (Mentor)</span>
                                        <span className="text-slate-700 font-medium">{formatTimestamp(selectedLog.rejectedAt) || '-'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3 justify-end">
                            {selectedLog.status === 'Pending' ? (
                                <>
                                    <button onClick={() => handleActionInit('reject')} className={`${btnReject} w-36`}>Reject</button>
                                    <button onClick={() => handleActionInit('approve')} className={`${btnSuccess} w-36`}>Approve</button>
                                </>
                            ) : (
                                <div className="w-full flex items-center justify-between">
                                    <div className="text-sm text-slate-500 font-medium">Status: <span className="font-bold text-[#354C8F]">{selectedLog.status}</span></div>
                                    <button onClick={() => setShowDetailModal(false)} className={btnSecondary + " w-32"}>Close</button>
                                </div>
                            )}
                        </div>
                    </ModalOverlay>
                )}

                {/* 3. CONFIRM MODAL */}
                {showConfirmModal && (
                    <ModalOverlay zIndex="z-[60]" onClose={() => setShowConfirmModal(false)} width="max-w-sm" compact>
                        <div className="text-center p-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAction === 'reject' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                                {confirmAction === 'reject' ? <AlertCircle className="text-red-500" size={32} strokeWidth={2} /> : <AlertCircle className="text-yellow-500" size={32} strokeWidth={2} />}
                            </div>
                            <h3 className="text-xl font-bold text-[#27345A] mb-2">
                                {confirmAction === 'approve' ? 'Approve Logbook?' : 'Reject Logbook?'}
                            </h3>
                            <p className="text-slate-500 text-sm mb-6">Your action cannot be changed. Do you wish to continue?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirmModal(false)} className={`${btnSecondary} w-full justify-center`}>Cancel</button>
                                <button onClick={executeAction} className={`w-full py-3 px-6 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center ${confirmAction === 'reject' ? 'bg-[#EF4444] text-white shadow-red-200 hover:bg-red-600' : 'bg-[#22C55E] text-white shadow-green-200 hover:bg-green-600'}`}>
                                    {confirmAction === 'approve' ? 'Approve' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </ModalOverlay>
                )}

                {/* BULK CONFIRM MODAL */}
                {showBulkConfirmModal && (
                    <ModalOverlay zIndex="z-[60]" onClose={() => setShowBulkConfirmModal(false)} width="max-w-sm" compact>
                        <div className="text-center p-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-yellow-50">
                                <AlertCircle className="text-yellow-500" size={32} strokeWidth={2} />
                            </div>
                            <h3 className="text-xl font-bold text-[#27345A] mb-2">Approve Selected?</h3>
                            <p className="text-slate-500 text-sm mb-6">Approve all selected pending logbooks on this page?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowBulkConfirmModal(false)} className={`${btnSecondary} w-full justify-center`}>Cancel</button>
                                <button onClick={executeBulkApprove} className={`${btnSuccess} w-full justify-center`}>
                                    {bulkLoading ? 'Approving...' : 'Approve All'}
                                </button>
                            </div>
                        </div>
                    </ModalOverlay>
                )}

                {/* 4. STATUS MODAL */}
                {showStatusModal && (
                    <ModalOverlay zIndex="z-[60]" onClose={() => setShowStatusModal(false)} width="max-w-sm" compact>
                        <div className="text-center p-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${statusType === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                                {statusType === 'success' ? <Check className="text-green-500" size={32} strokeWidth={3} /> : <X className="text-red-500" size={32} strokeWidth={3} />}
                            </div>
                            <h3 className="text-xl font-bold text-[#27345A] mb-2">{statusMessage.title}</h3>
                            <p className="text-slate-500 text-sm mb-6">{statusMessage.desc}</p>
                            <button onClick={() => setShowStatusModal(false)} className={`${btnSuccess} w-full justify-center`}>OK</button>
                        </div>
                    </ModalOverlay>
                )}
            </AnimatePresence>
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
