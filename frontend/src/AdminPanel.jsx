import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Check, X, ShieldCheck, Sun, Moon, Download, Files, AlertTriangle, Clock3, CheckCircle2, MapPin, UserRoundPlus } from 'lucide-react'; // <-- NEW: Imported Sun and Moon
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import toast from 'react-hot-toast';
import CrimeHeatmap from './components/maps/CrimeHeatmap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const FILE_BASE_URL = API_URL.replace(/\/api\/?$/, '');

const formatLabel = (value) => {
  if (!value) return 'General';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const chartColors = {
  pending: '#ffaa00',
  approved: '#00d97e',
  solved: '#00cfff',
  rejected: '#ff4040',
  low: '#00d97e',
  medium: '#00cfff',
  high: '#ffaa00',
  critical: '#ff4040',
  category: ['#00cfff', '#00d97e', '#ffaa00', '#ff4040', '#8b5cf6', '#14b8a6', '#f97316'],
};

const emptyCounts = (keys) => keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentModal, setAssignmentModal] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    name: '',
    badgeId: '',
    policeStation: '',
    contactNumber: '',
  });
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [heatmapFilters, setHeatmapFilters] = useState({
    category: 'all',
    severity: 'all',
    status: 'all',
  });

  // --- NEW: Theme State & Effect ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    // Apply the theme to the HTML document body
    document.documentElement.setAttribute('data-theme', theme);
    // Save to local storage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  // ---------------------------------

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/reports`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setReports(data);
      } else {
        toast.error("Failed to load reports");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Server connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/reports/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      let responseData;
      try {
        responseData = await res.json();
      } catch (e) {
        responseData = { message: "Server returned non-JSON format" };
      }

      if (res.ok) {
        toast.success(`Report marked as ${newStatus}`);
        setReports(reports.map(report =>
          report._id === id ? { ...report, status: newStatus, updatedAt: new Date().toISOString() } : report
        ));
      } else {
        toast.error(responseData.message || `Failed to update`);
      }
    } catch (error) {
      toast.error("Network error. Check console.");
    }
  };

  const handleReceiptDownload = async (id) => {
    try {
      const res = await fetch(`${API_URL}/reports/${id}/receipt`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        toast.error("Failed to download receipt");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CRMS-${id.substring(0, 8).toUpperCase()}-receipt.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Receipt download failed");
    }
  };

  const openAssignmentModal = (report) => {
    setAssignmentModal(report);
    setAssignmentForm({
      name: report.assignedOfficer?.name || '',
      badgeId: report.assignedOfficer?.badgeId || '',
      policeStation: report.assignedOfficer?.policeStation || '',
      contactNumber: report.assignedOfficer?.contactNumber || '',
    });
  };

  const handleAssignmentChange = (event) => {
    setAssignmentForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleAssignmentSubmit = async (event) => {
    event.preventDefault();
    if (!assignmentModal) return;

    setAssignmentSaving(true);
    try {
      const res = await fetch(`${API_URL}/reports/${assignmentModal._id || assignmentModal.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(assignmentForm)
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || 'Assignment failed');
        return;
      }

      setReports((currentReports) => currentReports.map((report) =>
        report._id === data._id ? data : report
      ));
      toast.success('Officer assigned successfully');
      setAssignmentModal(null);
    } catch (error) {
      toast.error('Network error while assigning officer');
    } finally {
      setAssignmentSaving(false);
    }
  };

  const filteredReports = reports.filter(report => {
    if (report.status === 'solved') {
      const lastUpdated = new Date(report.updatedAt || report.createdAt || Date.now());
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (lastUpdated < thirtyDaysAgo) return false;
    }
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesTitle = report.title?.toLowerCase().includes(lowerSearch);
      const matchesId = report._id?.toLowerCase().includes(lowerSearch);
      if (!matchesTitle && !matchesId) return false;
    }
    return true;
  });

  const heatmapReports = reports.filter((report) => {
    if (heatmapFilters.category !== 'all' && report.category !== heatmapFilters.category) return false;
    if (heatmapFilters.severity !== 'all' && report.severity !== heatmapFilters.severity) return false;
    if (heatmapFilters.status !== 'all' && report.status !== heatmapFilters.status) return false;
    return true;
  });

  const statusCounts = reports.reduce((acc, report) => {
    const status = report.status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, emptyCounts(['pending', 'approved', 'solved', 'rejected']));

  const severityCounts = reports.reduce((acc, report) => {
    const severity = report.severity || 'medium';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, emptyCounts(['low', 'medium', 'high', 'critical']));

  const categoryCounts = reports.reduce((acc, report) => {
    const category = report.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: formatLabel(name),
    key: name,
    value,
  }));

  const severityData = Object.entries(severityCounts).map(([name, value]) => ({
    name: formatLabel(name),
    key: name,
    value,
  }));

  const categoryData = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name: formatLabel(name), value }))
    .sort((a, b) => b.value - a.value);

  const sevenDayTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      reports: reports.filter((report) => report.createdAt?.slice(0, 10) === key).length,
    };
  });

  const totalEvidence = reports.reduce((sum, report) => sum + (report.evidence?.length || 0), 0);
  const urgentCases = (severityCounts.high || 0) + (severityCounts.critical || 0);
  const closureRate = reports.length ? Math.round(((statusCounts.solved || 0) / reports.length) * 100) : 0;
  const pendingRate = reports.length ? Math.round(((statusCounts.pending || 0) / reports.length) * 100) : 0;
  const coordinateCoverage = reports.length
    ? Math.round((reports.filter((report) => typeof report.coordinates?.lat === 'number' && typeof report.coordinates?.lng === 'number').length / reports.length) * 100)
    : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 className="display-font" style={{ fontSize: '24px', color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Police Command Center
          </h1>
          <p className="mono-font" style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Active Incident Database
          </p>
        </div>

        {/* Toolbar: Search, Filters, & Theme Toggle */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>

          {/* NEW: Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search ID or Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '10px 12px 10px 36px',
                borderRadius: '6px',
                fontSize: '13px',
                width: '240px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Filter size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '10px 32px',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="solved">Solved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <MetricCard
          icon={<Files size={18} />}
          label="Total Cases"
          value={reports.length}
          helper={`${filteredReports.length} visible after filters`}
          color="var(--color-primary)"
        />
        <MetricCard
          icon={<Clock3 size={18} />}
          label="Pending"
          value={statusCounts.pending || 0}
          helper={`${pendingRate}% of all cases`}
          color="var(--color-warning)"
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="High Priority"
          value={urgentCases}
          helper="High and critical severity"
          color="var(--color-danger)"
        />
        <MetricCard
          icon={<CheckCircle2 size={18} />}
          label="Closure Rate"
          value={`${closureRate}%`}
          helper={`${statusCounts.solved || 0} solved cases`}
          color="var(--color-success)"
        />
      </div>

      <AnalyticsPanel
        title="Crime Location Heatmap"
        subtitle={`${heatmapReports.length} mapped case${heatmapReports.length === 1 ? '' : 's'} shown across India. ${coordinateCoverage}% have precise pins; older records use Indian hotspot demo positions.`}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--color-primary)', display: 'flex' }}><MapPin size={18} /></span>
          <HeatmapSelect
            label="Category"
            value={heatmapFilters.category}
            onChange={(category) => setHeatmapFilters((current) => ({ ...current, category }))}
            options={[
              ['all', 'All Categories'],
              ['theft', 'Theft'],
              ['cybercrime', 'Cybercrime'],
              ['fraud', 'Fraud'],
              ['harassment', 'Harassment'],
              ['assault', 'Assault'],
              ['missing_person', 'Missing Person'],
              ['other', 'Other'],
            ]}
          />
          <HeatmapSelect
            label="Severity"
            value={heatmapFilters.severity}
            onChange={(severity) => setHeatmapFilters((current) => ({ ...current, severity }))}
            options={[
              ['all', 'All Severities'],
              ['low', 'Low'],
              ['medium', 'Medium'],
              ['high', 'High'],
              ['critical', 'Critical'],
            ]}
          />
          <HeatmapSelect
            label="Status"
            value={heatmapFilters.status}
            onChange={(status) => setHeatmapFilters((current) => ({ ...current, status }))}
            options={[
              ['all', 'All Statuses'],
              ['pending', 'Pending'],
              ['approved', 'Approved'],
              ['solved', 'Solved'],
              ['rejected', 'Rejected'],
            ]}
          />
        </div>
        <CrimeHeatmap reports={heatmapReports} />
      </AnalyticsPanel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <AnalyticsPanel title="7-Day Filing Trend" subtitle="New reports received per day">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sevenDayTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Bar dataKey="reports" radius={[4, 4, 0, 0]} fill={chartColors.solved} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Status Mix" subtitle="Current case distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                {statusData.map((entry) => (
                  <Cell key={entry.key} fill={chartColors[entry.key] || chartColors.solved} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <LegendList data={statusData} colorFor={(item) => chartColors[item.key] || chartColors.solved} />
        </AnalyticsPanel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <AnalyticsPanel title="Cases by Category" subtitle="Most reported incident types">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 24, left: 22, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-subtle)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={96} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors.category[index % chartColors.category.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>

        <AnalyticsPanel title="Severity Load" subtitle={`${totalEvidence} evidence file${totalEvidence === 1 ? '' : 's'} attached overall`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={severityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {severityData.map((entry) => (
                  <Cell key={entry.key} fill={chartColors[entry.key] || chartColors.medium} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsPanel>
      </div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="mono-font" style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.05em' }}>CASE ID</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>FILED ON</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>TITLE / DETAILS</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>CATEGORY</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>SEVERITY</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>OFFICER</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>STATUS</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading intelligence data...</td></tr>
              ) : filteredReports.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active reports match your criteria.</td></tr>
              ) : (
                filteredReports.map((report, index) => (
                  <motion.tr
                    key={report._id || index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="mono-font" style={{ padding: '16px', color: 'var(--text-primary)' }}>
                      {(report._id || report.id || 'XXXXXX').substring(0, 8)}
                    </td>

                    <td className="mono-font" style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {report.createdAt ? new Date(report.createdAt).toLocaleString('en-US', {
                        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : 'N/A'}
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{report.title || 'Untitled Report'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {report.description || 'No description provided.'}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {formatLabel(report.category)}
                      {report.evidence?.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <a
                            href={`${FILE_BASE_URL}${report.evidence[0].url}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--color-primary)', fontSize: '12px', textDecoration: 'none' }}
                          >
                            Evidence ({report.evidence.length})
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <SeverityBadge severity={report.severity} />
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {report.assignedOfficer?.name ? (
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{report.assignedOfficer.name}</div>
                          <div className="mono-font" style={{ fontSize: '11px', marginTop: '4px' }}>{report.assignedOfficer.badgeId}</div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>{report.assignedOfficer.policeStation}</div>
                        </div>
                      ) : (
                        <span className="mono-font" style={{ fontSize: '11px' }}>UNASSIGNED</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <StatusBadge status={report.status} />
                    </td>
                    <td style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <ActionButton
                        icon={<UserRoundPlus size={14} />}
                        label={report.assignedOfficer?.name ? 'Edit Assignment' : 'Assign Officer'}
                        color="var(--color-warning)"
                        onClick={() => openAssignmentModal(report)}
                      />
                      <ActionButton
                        icon={<Download size={14} />}
                        label="Receipt"
                        color="var(--color-primary)"
                        onClick={() => handleReceiptDownload(report._id || report.id)}
                      />
                      {report.status !== 'approved' && report.status !== 'solved' && (
                        <ActionButton
                          icon={<Check size={14} />}
                          label="Approve"
                          color="var(--color-success)"
                          onClick={() => handleStatusChange(report._id || report.id, 'approved')}
                        />
                      )}
                      {report.status === 'approved' && (
                        <ActionButton
                          icon={<ShieldCheck size={14} />}
                          label="Solve"
                          color="var(--color-primary)"
                          onClick={() => handleStatusChange(report._id || report.id, 'solved')}
                        />
                      )}
                      {report.status !== 'rejected' && report.status !== 'solved' && (
                        <ActionButton
                          icon={<X size={14} />}
                          label="Reject"
                          color="var(--color-danger)"
                          onClick={() => handleStatusChange(report._id || report.id, 'rejected')}
                        />
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      {assignmentModal && (
        <AssignmentModal
          report={assignmentModal}
          form={assignmentForm}
          saving={assignmentSaving}
          onChange={handleAssignmentChange}
          onSubmit={handleAssignmentSubmit}
          onClose={() => setAssignmentModal(null)}
        />
      )}
    </div>
  );
}

// --- Helper Components ---

function MetricCard({ icon, label, value, helper, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '1rem',
        minHeight: '132px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <span className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div>
        <div className="display-font" style={{ fontSize: '30px', color: 'var(--text-primary)', marginBottom: '4px' }}>{value}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{helper}</div>
      </div>
    </motion.div>
  );
}

function AnalyticsPanel({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '1rem',
        minHeight: '310px',
        overflow: 'hidden'
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h2 className="display-font" style={{ fontSize: '16px', color: 'var(--text-primary)', margin: '0 0 4px' }}>{title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const name = label || item.name;

  return (
    <div style={{
      background: 'var(--bg-main)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '6px',
      color: 'var(--text-primary)',
      padding: '8px 10px',
      fontSize: '12px'
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{name}</div>
      <strong>{item.value}</strong>
    </div>
  );
}

function LegendList({ data, colorFor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '-6px' }}>
      {data.map((item) => (
        <div key={item.key || item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: colorFor(item), flex: '0 0 auto' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}: {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function HeatmapSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
      <span className="mono-font" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
          padding: '8px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          outline: 'none'
        }}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function AssignmentModal({ report, form, saving, onChange, onSubmit, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 10, 20, 0.78)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 200
    }}>
      <motion.form
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '1.5rem'
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 className="display-font" style={{ color: 'var(--text-primary)', fontSize: '22px', margin: '0 0 6px' }}>Assign Case Officer</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            {(report._id || report.id || 'XXXXXXXX').substring(0, 8)} / {report.title || 'Untitled Report'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
          <AssignmentInput label="Officer Name" name="name" value={form.name} onChange={onChange} placeholder="e.g., Inspector Raj Sharma" />
          <AssignmentInput label="Badge ID" name="badgeId" value={form.badgeId} onChange={onChange} placeholder="e.g., MH-PS-2041" />
          <AssignmentInput label="Police Station" name="policeStation" value={form.policeStation} onChange={onChange} placeholder="e.g., Andheri Police Station" />
          <AssignmentInput label="Contact Number" name="contactNumber" value={form.contactNumber} onChange={onChange} placeholder="e.g., +91 98765 43210" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              padding: '10px 14px',
              fontSize: '13px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              borderRadius: '6px',
              color: '#fff',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              opacity: saving ? 0.65 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function AssignmentInput({ label, name, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        required
        placeholder={placeholder}
        style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
          borderRadius: '6px',
          padding: '11px 12px',
          fontSize: '13px',
          outline: 'none'
        }}
      />
    </label>
  );
}

function StatusBadge({ status }) {
  let config = { bg: 'rgba(255, 170, 0, 0.1)', color: 'var(--color-warning)', text: 'PENDING' };

  if (status === 'approved') config = { bg: 'rgba(0, 217, 126, 0.1)', color: 'var(--color-success)', text: 'APPROVED' };
  if (status === 'rejected') config = { bg: 'rgba(255, 64, 64, 0.1)', color: 'var(--color-danger)', text: 'REJECTED' };
  if (status === 'solved') config = { bg: 'rgba(0, 207, 255, 0.1)', color: 'var(--color-primary)', text: 'SOLVED' };

  return (
    <span className="mono-font" style={{
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}`,
      opacity: 0.9,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.05em'
    }}>
      {config.text}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const normalized = severity || 'medium';
  let config = { bg: 'rgba(0, 207, 255, 0.1)', color: 'var(--color-primary)', text: 'MEDIUM' };

  if (normalized === 'low') config = { bg: 'rgba(0, 217, 126, 0.1)', color: 'var(--color-success)', text: 'LOW' };
  if (normalized === 'high') config = { bg: 'rgba(255, 170, 0, 0.1)', color: 'var(--color-warning)', text: 'HIGH' };
  if (normalized === 'critical') config = { bg: 'rgba(255, 64, 64, 0.1)', color: 'var(--color-danger)', text: 'CRITICAL' };

  return (
    <span className="mono-font" style={{
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}`,
      opacity: 0.9,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.05em'
    }}>
      {config.text}
    </span>
  );
}

function ActionButton({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        background: 'transparent',
        border: `1px solid var(--border-subtle)`,
        color: color,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        // Fallback for hover state
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
    </button>
  );
}
