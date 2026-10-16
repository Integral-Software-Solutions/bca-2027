import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout & Pages
import Layout from './components/Layout';
import Auth from './Auth';
import Dashboard from './pages/Dashboard';
import ReportForm from './ReportForm';
import AdminPanel from './AdminPanel';

function App() {
  const [user, setUser] = useState(null);

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  // If the user is not logged in, show the Auth screen.
  // We wrap it in Router and Toaster so toast notifications still work during login.
  if (!user) {
    return (
      <Router>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#152236',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.07)',
              fontFamily: 'DM Sans'
            }
          }}
        />
        <Auth setUser={setUser} />
      </Router>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <Router>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#152236',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.07)',
            fontFamily: 'DM Sans'
          }
        }}
      />
      <Routes>
        {/* Wrap all authenticated routes inside the Layout (Sidebar + Topbar) */}
        {/* Passing setUser to Layout so you can trigger logout from the header */}
        <Route element={<Layout user={user} setUser={setUser} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report" element={<ReportForm />} />

          {/* Admin Protected Route */}
          {isAdmin ? (
            <Route path="/admin" element={<AdminPanel />} />
          ) : (
            <Route path="/admin" element={<Navigate to="/" replace />} />
          )}

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;