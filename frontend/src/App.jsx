import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ComposePage from './pages/ComposePage.jsx';
import OutboxPage from './pages/OutboxPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import OrganizationsPage from './pages/OrganizationsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  // if (loading) return <div className="loading">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="compose"       element={<ComposePage />} />
        <Route path="outbox"        element={<OutboxPage />} />
        <Route path="inbox"         element={<InboxPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="users"         element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
