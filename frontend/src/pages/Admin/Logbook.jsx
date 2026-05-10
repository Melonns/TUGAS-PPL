import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  X,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Clock,
  MessageSquare,
  User,
  Paperclip,
  ChevronDown,
  Download
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { motion, AnimatePresence } from 'framer-motion';

const colors = {
  primary: "#354C8F",
  textDark: "#203266",
  bgLight: "#F8F9FD"
};

const btnBase = "py-3 px-4 md:px-6 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = `${btnBase} bg-[#354C8F] hover:bg-[#2a3c70] text-white shadow-md shadow-indigo-200`;
const btnSecondary = `${btnBase} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`;

const LogbookMonitoring = () => {
  const [logs, setLogs] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [serverMeta, setServerMeta] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const initialFilter = {
    university: "",
    division: "",
    office: "",
    startDate: "",
    endDate: "",
    status: []
  };
  const [filter, setFilter] = useState(initialFilter);
  const [appliedFilter, setAppliedFilter] = useState(initialFilter);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [sites, setSites] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const isFilterActive = appliedFilter.university !== "" || appliedFilter.division !== "" || appliedFilter.office !== "" || appliedFilter.startDate !== "" || appliedFilter.endDate !== "" || appliedFilter.status.length > 0;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalEntries = serverMeta?.total ?? logs.length;
  const totalPages = serverMeta?.last_page ?? Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
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

  const handlePageChange = async (page) => {
    if (page < 1) return;
    const pageTotal = serverMeta?.last_page ?? totalPages;
    if (page > pageTotal) return;
    setCurrentPage(page);
    await fetchLogbooks({ page, ...buildFilterParams(appliedFilter) });
  };

  const buildFilterParams = (source) => {
    const params = {};
    if (source.startDate) params.start_date = source.startDate;
    if (source.endDate) params.end_date = source.endDate;
    if (source.status && source.status.length > 0) {
      params.status_verifikasi = source.status.map(s => s.toLowerCase()).join(',');
    }
    if (source.university) params.universitas = source.university;
    if (source.division) params.division = source.division;
    if (source.office) params.office = source.office;
    return params;
  };

  const buildPreviewOutputs = (outputs) => {
    const base = apiClient.defaults.baseURL || '';
    const baseNoApi = base.replace(/\/api\/?$/i, '');
    return (outputs || []).map(f => {
      if (!f) return f;
      if (String(f).startsWith('http') || String(f).startsWith('data:')) return f;
      const cleaned = String(f).replace(/^\/api\//i, '/').replace(/^api\//i, '');
      const root = baseNoApi.replace(/\/$/, '');
      return `${root}/${cleaned.replace(/^\//, '')}`;
    });
  };

  const mapLogbookItem = (item) => {
    const rawStatus = item.status_verifikasi ?? item.status ?? 'draft';
    const status = rawStatus && String(rawStatus).toLowerCase() === 'verified' ? 'Verified' : (rawStatus && String(rawStatus).toLowerCase() === 'pending' ? 'Pending' : (rawStatus && String(rawStatus).toLowerCase() === 'rejected' ? 'Rejected' : 'Draft'));
    const outputs = buildPreviewOutputs(Array.isArray(item.bukti_kegiatan) ? item.bukti_kegiatan : (item.bukti_kegiatan ? [item.bukti_kegiatan] : []));
    const dj = Number(item.durasi_jam ?? 0) || 0;
    const dm = Number(item.durasi_menit ?? 0) || 0;
    const buildDuration = () => {
      if (dj === 0 && dm === 0) return '0 Hours';
      if (dj === 0) return `${dm} Minutes`;
      if (dm === 0) return `${dj} Hours`;
      return `${dj} Hours ${dm} Minutes`;
    };

    return {
      id: item.id_logbook ?? item.id,
      name: item.nama_lengkap || item.intern_name || item.user_name || item.user?.nama_lengkap || item.user?.name || item.verifier?.nama_lengkap || '-',
      date: item.tanggal,
      description: item.deskripsi_kegiatan || item.deskripsi || item.activity_description || item.activity || '',
      duration: buildDuration(),
      durasi_jam: dj,
      durasi_menit: dm,
      division: item.divisi || item.division || item.verifier?.division || '',
      mentor: item.mentor_name || item.nama_mentor || item.mentor || item.verifier?.nama_lengkap || '-',
      status,
      rawStatus: rawStatus,
      feedback: item.feedback || '',
      outputs,
      attachment: outputs?.[0] ?? null,
      approvedAt: item.approved_at || item.verified_at || null,
      rejectedAt: item.rejected_at || null,
      submittedAt: item.submitted_at || item.created_at || null
    };
  };

  const fetchLogbooks = async (params = {}) => {
    setLoadingList(true);
    try {
      const res = await apiClient.get('/admin/logbook', { params: { per_page: itemsPerPage, ...params } });
      const raw = res?.data ?? {};
      const container = raw?.data ?? raw;
      const items = Array.isArray(container)
        ? container
        : (Array.isArray(container?.data) ? container.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []));

      const mapped = (items || []).map(item => mapLogbookItem(item));

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
    } catch (err) {
      console.error('Error fetching admin logbooks:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchLogbooks(buildFilterParams(appliedFilter));
  }, []);

  const fetchSites = async () => {
    setLoadingSites(true);
    try {
      const res = await apiClient.get('/admin/sites');
      const data = res?.data?.data ?? res?.data ?? [];
      const opts = Array.isArray(data) ? data.map(s => ({ value: s.nama_site ?? s.name ?? s.site_name ?? s.id, label: s.nama_site ?? s.name ?? s.site_name ?? String(s.id) })) : [];
      setSites([{ value: '', label: 'All Offices' }, ...opts]);
    } catch (err) {
      console.warn('Could not fetch sites for Office dropdown:', err);
      setSites([{ value: '', label: 'All Offices' }]);
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchUniversities = async () => {
    setLoadingUniversities(true);
    try {
      const res = await apiClient.get('/mentor/universitas');
      const data = res?.data?.data ?? res?.data ?? [];
      const opts = Array.isArray(data) ? data.map(u => {
        const v = (u && (u.nama_universitas || u.nama || u.universitas || u.name))
          ? (u.nama_universitas || u.nama || u.universitas || u.name)
          : u;
        return { value: v, label: v };
      }) : [];
      setUniversities([{ value: '', label: 'All Institutions' }, ...opts]);
    } catch (err) {
      console.warn('Could not fetch universities for dropdown:', err);
      setUniversities([{ value: '', label: 'All Institutions' }]);
    } finally {
      setLoadingUniversities(false);
    }
  };

  const fetchDivisions = async () => {
    setLoadingDivisions(true);
    try {
      const res = await apiClient.get('/available-divisions');
      const data = res?.data?.data ?? res?.data ?? [];
      const opts = Array.isArray(data) ? data.map(d => ({ value: d, label: d })) : [];
      setDivisions([{ value: '', label: 'All Divisions' }, ...opts]);
    } catch (err) {
      console.warn('Could not fetch divisions for dropdown (available-divisions):', err);
      setDivisions([{ value: '', label: 'All Divisions' }]);
    } finally {
      setLoadingDivisions(false);
    }
  };

  useEffect(() => {
    fetchSites();
    fetchUniversities();
    fetchDivisions();
  }, []);

  const handleViewDetail = async (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleViewFile = (logbookId, fileUrl, cleanName) => {
    const rawName = String(fileUrl).split('/').pop();
    const displayName = cleanName || rawName;
    const secureUrl = `/logbook/${logbookId}/file/${encodeURIComponent(rawName)}`;
    const viewerUrl = `/admin/file-viewer?url=${encodeURIComponent(secureUrl)}&name=${encodeURIComponent(displayName)}`;
    window.open(viewerUrl, '_blank');
  };

  const handleDownloadFile = async (logbookId, fileUrl, cleanName) => {
    try {
      const rawName = String(fileUrl).split('/').pop();
      const downloadName = cleanName || rawName;
      const secureUrl = `/logbook/${logbookId}/file/${encodeURIComponent(rawName)}?download=1`;
      const res = await apiClient.get(secureUrl, { responseType: 'blob' });

      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleStatusToggle = (status) => {
    setFilter(prev => {
      const current = prev.status;
      const updated = current.includes(status) ? current.filter(s => s !== status) : [...current, status];
      return { ...prev, status: updated };
    });
  };

  const resetFilter = async () => {
    setFilter(initialFilter);
    setAppliedFilter(initialFilter);
    setCurrentPage(1);
    await fetchLogbooks(buildFilterParams(initialFilter));
  };

  const applyFilter = async () => {
    setAppliedFilter(filter);
    setShowFilterModal(false);
    setCurrentPage(1);
    await fetchLogbooks(buildFilterParams(filter));
  };

  const handleDropdownSelect = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: prev[key] === value ? "" : value }));
    setOpenDropdown(null);
  };

  const renderDropdown = (label, key, options, placeholder) => {
    const currentValue = filter[key];
    const resolveLabel = (val) => {
      const found = options.find(opt => (opt.value ?? opt) === val);
      return found ? (found.label ?? found.value ?? found) : placeholder;
    };

    return null;
  };

  const Badge = ({ text }) => {
    let style = "";
    if (text === 'Verified' || text === 'Approved') style = "bg-green-50 text-green-600 border-green-200";
    else if (text === 'Pending') style = "bg-[#FFF8E1] text-[#F59E0B] border-[#FFE0B2]";
    else if (text === 'Rejected') style = "bg-red-50 text-red-600 border-red-200";
    else style = "bg-slate-100 text-slate-500 border-slate-200";

    return (
      <span className={`inline-flex items-center justify-center min-w-[140px] h-[34px] px-3 rounded-lg text-xs font-bold border whitespace-nowrap ${style}`}>
        {text}
      </span>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-800 -mt-8">
      <div className="mb-8 mt-4 md:mt-0">
        <h1 className={`text-2xl md:text-3xl font-bold text-[${colors.textDark}] mb-1 md:mb-2`}>Logbook Monitoring</h1>
        <p className="text-slate-500 text-xs md:text-sm">Overview of intern daily activities and mentor validation status.</p>
      </div>
    </div>
  );
};

const ModalOverlay = ({ children, onClose, width = "max-w-md", zIndex = "z-50" }) => (
  <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/40 backdrop-blur-sm p-4`}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white w-[95%] md:w-full ${width} rounded-2xl shadow-2xl p-6 relative`}
    >
      {children}
    </motion.div>
  </div>
);

export default LogbookMonitoring;
