import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, Settings, Bell, LogOut, Sun, Moon } from 'lucide-react';

export default function Layout({ user, setUser }) {
    const location = useLocation();

    // --- GLOBAL THEME LOGIC ---
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };
    // --------------------------

    const handleLogout = () => {
        // Clear local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Update state to force the app to return to Aut h.jsx
        setUser(null);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
            {/* Sidebar: Fixed 240px */}
            <aside style={{
                width: '240px',
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                backgroundColor: 'var(--bg-card)', // FIXED: Uses variable for light mode
                borderRight: '1px solid var(--border-subtle)',
                boxShadow: '4px 0 15px rgba(0,0,0,0.05)', // Softened shadow
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                transition: 'background-color 0.3s'
            }}>
                <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h1 className="display-font" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                        <Shield size={24} color="var(--color-primary)" />
                        CRMS_SYS
                    </h1>
                </div>

                <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/" currentPath={location.pathname} />
                    <NavItem icon={<FileText size={18} />} label="File Report" to="/report" currentPath={location.pathname} />

                    {/* Only show Admin Panel if user is an admin */}
                    {user?.role === 'admin' && (
                        <NavItem icon={<Settings size={18} />} label="Admin Panel" to="/admin" currentPath={location.pathname} />
                    )}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Sticky Top Navbar */}
                <header style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--bg-card)', // FIXED: Now responds to light mode
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '1rem 2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 40,
                    transition: 'background-color 0.3s'
                }}>
                    <div className="mono-font" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                        System / <span style={{ color: 'var(--color-primary)' }}>Dashboard</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>

                        {/* --- THEME TOGGLE BUTTON --- */}
                        <button
                            onClick={toggleTheme}
                            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '36px',
                                height: '36px',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--text-primary)';
                                e.currentTarget.style.borderColor = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            }}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <button style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}>
                            <Bell size={20} />
                        </button>

                        {/* User Info & Logout Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
                            <span className="mono-font" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {user?.email || "Citizen User"}
                            </span>

                            <button
                                onClick={handleLogout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(255, 64, 64, 0.1)',
                                    border: '1px solid rgba(255, 64, 64, 0.2)',
                                    color: 'var(--color-danger)',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 64, 64, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 64, 64, 0.1)'}
                            >
                                <LogOut size={14} />
                                LOGOUT
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content injected via Outlet */}
                <div style={{ padding: '2rem' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, to, currentPath }) {
    const active = currentPath === to;

    return (
        <Link to={to} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            textDecoration: 'none',
            color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
            background: active ? 'rgba(0, 207, 255, 0.1)' : 'transparent',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s'
        }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
            {icon}
            {label}
        </Link>
    );
}