import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, Download, FileText, ShieldCheck, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const FILE_BASE_URL = API_URL.replace(/\/api\/?$/, '');

const formatLabel = (value) => {
    if (!value) return 'General';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getCaseId = (report) => {
    if (!report?._id) return 'CRMS-PENDING';
    const year = report.createdAt ? new Date(report.createdAt).getFullYear() : new Date().getFullYear();
    return `CRMS-${year}-${report._id.substring(0, 8).toUpperCase()}`;
};

const getStatusProgress = (status) => {
    if (status === 'solved') return 4;
    if (status === 'approved') return 3;
    if (status === 'rejected') return 1;
    return 1;
};

const buildStatusHistory = (report) => {
    if (report?.statusHistory?.length) {
        return [...report.statusHistory].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    const fallback = [{
        status: 'pending',
        note: 'Complaint filed by citizen',
        changedByName: 'Citizen',
        createdAt: report?.createdAt,
    }];

    if (report?.status && report.status !== 'pending') {
        fallback.push({
            status: report.status,
            note: `Case status updated to ${formatLabel(report.status)}`,
            changedByName: 'Admin',
            createdAt: report.updatedAt || report.createdAt,
        });
    }

    return fallback;
};

// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'tween', ease: 'easeOut' } }
};

export default function Dashboard() {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    async function fetchReports() {
        try {
            const token = localStorage.getItem("token");
            if (!token) return; // Prevent fetch if no token

            const res = await fetch(`${API_URL}/reports/myreports`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        }
    }

    async function downloadReceipt(reportId) {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/reports/${reportId}/receipt`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) return;

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `CRMS-${reportId.substring(0, 8).toUpperCase()}-receipt.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Receipt download failed:", error);
        }
    }

    // Helper function to format the system date
    const formatTime = (dateString) => {
        if (!dateString) return "Pending...";
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short', day: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Maps status to our custom design system colors
    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'pending':
                return { color: 'var(--color-warning)', bg: 'rgba(255, 170, 0, 0.1)' };
            case 'approved':
            case 'resolved':
                return { color: 'var(--color-safe)', bg: 'rgba(0, 217, 126, 0.1)' };
            case 'rejected':
            case 'urgent':
                return { color: 'var(--color-danger)', bg: 'rgba(255, 64, 64, 0.1)' };
            default:
                return { color: 'var(--color-primary)', bg: 'rgba(0, 207, 255, 0.1)' };
        }
    };

    const summary = reports.reduce((acc, report) => {
        const status = report.status || 'pending';
        acc.total += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, { total: 0, pending: 0, approved: 0, solved: 0, rejected: 0 });

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ maxWidth: '1400px', margin: '0 auto' }}>

            {/* Header */}
            <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 className="display-font" style={{ fontSize: '32px', margin: '0 0 8px' }}>Your Filed Reports</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Track the status of your civic filings</p>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <SummaryCard icon={<FileText size={18} />} label="Total Reports" value={summary.total} color="var(--color-primary)" />
                <SummaryCard icon={<Clock3 size={18} />} label="Pending" value={summary.pending} color="var(--color-warning)" />
                <SummaryCard icon={<ShieldCheck size={18} />} label="Approved" value={summary.approved} color="var(--color-safe)" />
                <SummaryCard icon={<CheckCircle2 size={18} />} label="Solved" value={summary.solved} color="var(--color-primary)" />
                <SummaryCard icon={<XCircle size={18} />} label="Rejected" value={summary.rejected} color="var(--color-danger)" />
            </motion.div>

            {/* Data Table Card */}
            <motion.div variants={itemVariants} className="institutional-card">
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ padding: '12px 8px', fontWeight: 500 }}>INCIDENT</th>
                            <th style={{ padding: '12px 8px', fontWeight: 500 }}>DATE & TIME</th>
                            <th style={{ padding: '12px 8px', fontWeight: 500 }}>LOCATION</th>
                            <th style={{ padding: '12px 8px', fontWeight: 500 }}>STATUS</th>
                            <th style={{ padding: '12px 8px', fontWeight: 500, textAlign: 'right' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.length > 0 ? (
                            reports.map((report) => {
                                const style = getStatusStyle(report.status);
                                return (
                                    <tr
                                        key={report._id}
                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', cursor: 'pointer' }}
                                        onClick={() => setSelectedReport(report)}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px 8px', fontWeight: 500 }}>{report.title}</td>

                                        {/* NEW: Date Column */}
                                        <td className="mono-font" style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            {formatTime(report.createdAt)}
                                        </td>

                                        <td className="mono-font" style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{report.location}</td>
                                        <td style={{ padding: '16px 8px' }}>
                                            <span style={{
                                                background: style.bg,
                                                color: style.color,
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                                letterSpacing: '0.05em'
                                            }}>
                                                {report.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="mono-font" style={{ padding: '16px 8px', textAlign: 'right', color: 'var(--color-primary)', fontSize: '12px' }}>
                                            VIEW DETAILS →
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No reports found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </motion.div>

            {/* MODAL - Updated to dark aesthetic */}
            {selectedReport && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(10, 15, 30, 0.85)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    zIndex: 100 // Ensure it sits above the sidebar
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="institutional-card"
                        style={{ maxWidth: '820px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <div className="mono-font" style={{ color: 'var(--color-primary)', fontSize: '12px', marginBottom: '6px' }}>{getCaseId(selectedReport)}</div>
                                <h2 className="display-font" style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--text-primary)' }}>
                                    {selectedReport.title}
                                </h2>
                                <p className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                                    {selectedReport.location} | Filed {formatTime(selectedReport.createdAt)}
                                </p>
                            </div>

                            <span style={{
                                background: getStatusStyle(selectedReport.status).bg,
                                color: getStatusStyle(selectedReport.status).color,
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap'
                            }}>
                                {selectedReport.status}
                            </span>
                        </div>

                        <CaseProgress status={selectedReport.status} />

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            <span className="mono-font" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '5px 8px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Category: {formatLabel(selectedReport.category)}
                            </span>
                            <span className="mono-font" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '5px 8px', fontSize: '11px', color: getStatusStyle(selectedReport.severity === 'critical' ? 'urgent' : selectedReport.severity).color, textTransform: 'uppercase' }}>
                                Severity: {formatLabel(selectedReport.severity || 'medium')}
                            </span>
                            <span className="mono-font" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '5px 8px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Evidence: {selectedReport.evidence?.length || 0}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'var(--bg-deep)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                <div className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Complaint Details</div>
                                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                                    {selectedReport.description}
                                </p>
                            </div>

                            <div style={{ background: 'var(--bg-deep)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                <div className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px' }}>Case Snapshot</div>
                                <DetailLine label="Case ID" value={getCaseId(selectedReport)} />
                                <DetailLine label="Category" value={formatLabel(selectedReport.category)} />
                                <DetailLine label="Severity" value={formatLabel(selectedReport.severity || 'medium')} />
                                <DetailLine label="Filed" value={formatTime(selectedReport.createdAt)} />
                                <DetailLine label="Status" value={formatLabel(selectedReport.status)} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '1rem' }}>
                                <div className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    Evidence List
                                </div>
                                {selectedReport.evidence?.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {selectedReport.evidence.map((item) => (
                                            <a
                                                key={item.url}
                                                href={`${FILE_BASE_URL}${item.url}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    border: '1px solid var(--border-subtle)',
                                                    borderRadius: '4px',
                                                    color: 'var(--color-primary)',
                                                    fontSize: '12px',
                                                    padding: '6px 8px',
                                                    textDecoration: 'none',
                                                    maxWidth: '240px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {item.originalName}
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No evidence attached.</p>
                                )}
                            </div>

                            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '1rem' }}>
                                <div className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    Status History
                                </div>
                                <StatusHistory entries={buildStatusHistory(selectedReport)} formatTime={formatTime} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => downloadReceipt(selectedReport._id)}
                                style={{
                                    background: 'var(--color-primary)',
                                    border: '1px solid var(--color-primary)',
                                    color: '#fff',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Download size={16} /> RECEIPT PDF
                            </button>

                            <button
                                onClick={() => setSelectedReport(null)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-primary)',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                CLOSE
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}

function SummaryCard({ icon, label, value, color }) {
    return (
        <div className="institutional-card" style={{ minHeight: '116px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span className="mono-font" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {label}
                </span>
                <span style={{ color, display: 'flex' }}>{icon}</span>
            </div>
            <div className="display-font" style={{ fontSize: '30px', color: 'var(--text-primary)' }}>{value}</div>
        </div>
    );
}

function DetailLine({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</span>
            <span className="mono-font" style={{ color: 'var(--text-primary)', fontSize: '12px', textAlign: 'right' }}>{value}</span>
        </div>
    );
}

function CaseProgress({ status }) {
    const steps = ['Filed', 'Under Review', 'Approved', 'Investigation', 'Solved'];
    const activeIndex = getStatusProgress(status);
    const isRejected = status === 'rejected';

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: '8px' }}>
                {steps.map((step, index) => {
                    const isActive = index <= activeIndex && !isRejected;
                    const isCurrent = index === activeIndex && !isRejected;

                    return (
                        <div key={step} style={{ minWidth: 0 }}>
                            <div style={{
                                height: '6px',
                                borderRadius: '999px',
                                background: isActive ? 'var(--color-primary)' : 'var(--border-subtle)',
                                marginBottom: '8px',
                                opacity: isCurrent ? 1 : 0.75
                            }} />
                            <div style={{
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {step}
                            </div>
                        </div>
                    );
                })}
            </div>
            {isRejected && (
                <div style={{ marginTop: '10px', color: 'var(--color-danger)', fontSize: '12px' }}>
                    This case has been closed as rejected.
                </div>
            )}
        </div>
    );
}

function StatusHistory({ entries, formatTime }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {entries.map((entry, index) => (
                <div key={`${entry.status}-${entry.createdAt}-${index}`} style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '4px' }} />
                        {index < entries.length - 1 && <span style={{ width: '1px', flex: 1, minHeight: '28px', background: 'var(--border-subtle)', marginTop: '4px' }} />}
                    </div>
                    <div>
                        <div className="mono-font" style={{ color: 'var(--text-primary)', fontSize: '12px', textTransform: 'uppercase' }}>
                            {formatLabel(entry.status)}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '3px' }}>
                            {entry.note || 'Status updated'}{entry.changedByName ? ` by ${entry.changedByName}` : ''}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '3px' }}>
                            {formatTime(entry.createdAt)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
