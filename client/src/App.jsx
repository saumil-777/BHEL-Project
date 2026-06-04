import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MaterialsPage from './pages/materials/MaterialsPage';
import MaterialDetailPage from './pages/materials/MaterialDetailPage';
import VendorsPage from './pages/vendors/VendorsPage';
import VendorDetailPage from './pages/vendors/VendorDetailPage';
import QualityPage from './pages/quality/QualityPage';
import InventoryPage from './pages/inventory/InventoryPage';
import WarehousePage from './pages/warehouse/WarehousePage';
import QRPage from './pages/qr/QRPage';
import WorkflowPage from './pages/workflow/WorkflowPage';
import MovementsPage from './pages/movements/MovementsPage';
import PurchaseOrdersPage from './pages/purchase/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/purchase/PurchaseOrderDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import SettingsPage from './pages/settings/SettingsPage';
import UsersPage from './pages/settings/UsersPage';
import NotFoundPage from './pages/NotFoundPage';
import CNotesPage from './pages/cnotes/CNotesPage';
import SIVPage from './pages/siv/SIVPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="materials/:id" element={<MaterialDetailPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="vendors/:id" element={<VendorDetailPage />} />
        <Route path="cnotes" element={<CNotesPage />} />
        <Route path="sivs" element={<SIVPage />} />
        <Route path="quality" element={<QualityPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="qr" element={<QRPage />} />
        <Route path="workflows" element={<WorkflowPage />} />
        <Route path="movements" element={<MovementsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/users" element={<ProtectedRoute roles={['super_admin', 'org_admin']}><UsersPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
            },
            success: { iconTheme: { primary: 'hsl(161,80%,44%)', secondary: 'white' } },
            error: { iconTheme: { primary: 'hsl(0,85%,60%)', secondary: 'white' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
