import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import AuthCallback from './pages/auth/Callback'
import RoleSelection from './pages/auth/RoleSelection'
import AdminDashboard from './pages/admin/Dashboard'
import CampaignList from './pages/admin/CampaignList'
import BeneficiaryManagement from './pages/admin/BeneficiaryManagement'
import BeneficiaryDashboard from './pages/beneficiary/Dashboard'
import DonorDashboard from './pages/donor/Dashboard'
import AuditorDashboard from './pages/auditor/Dashboard'
import AuditExplorer from './pages/public/AuditExplorer'
import TransparencyDashboard from './pages/public/TransparencyDashboard'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import BeneficiaryLayout from './layouts/BeneficiaryLayout'
import DonorLayout from './layouts/DonorLayout'
import AuditorLayout from './layouts/AuditorLayout'

// Protected Route Component
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  
  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // If user has no role yet, redirect to role selection
  if (!user?.role) {
    return <Navigate to="/auth/select-role" replace />
  }
  
  // If roles specified, check if user has one of them
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'admin' || user?.role === 'ngo') {
      return <Navigate to="/admin" replace />
    } else if (user?.role === 'beneficiary') {
      return <Navigate to="/beneficiary" replace />
    } else if (user?.role === 'donor') {
      return <Navigate to="/donor" replace />
    } else if (user?.role === 'auditor') {
      return <Navigate to="/auditor" replace />
    }
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

// Role Selection Route - only for authenticated users without a role
function RoleSelectionRoute() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // If user already has a role, redirect to their dashboard
  if (user?.role) {
    if (user.role === 'admin' || user.role === 'ngo') {
      return <Navigate to="/admin" replace />
    } else if (user.role === 'beneficiary') {
      return <Navigate to="/beneficiary" replace />
    } else if (user.role === 'donor') {
      return <Navigate to="/donor" replace />
    } else if (user.role === 'auditor') {
      return <Navigate to="/auditor" replace />
    }
    return <Navigate to="/" replace />
  }
  
  return <RoleSelection />
}

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/select-role" element={<RoleSelectionRoute />} />
        <Route path="/transparency" element={<TransparencyDashboard />} />
        <Route path="/audit" element={<AuditExplorer />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'ngo']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="beneficiaries" element={<BeneficiaryManagement />} />
        </Route>
        
        {/* Beneficiary Routes */}
        <Route path="/beneficiary" element={
          <ProtectedRoute allowedRoles={['beneficiary']}>
            <BeneficiaryLayout />
          </ProtectedRoute>
        }>
          <Route index element={<BeneficiaryDashboard />} />
        </Route>
        
        {/* Donor Routes */}
        <Route path="/donor" element={
          <ProtectedRoute allowedRoles={['donor']}>
            <DonorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DonorDashboard />} />
        </Route>
        
        {/* Auditor Routes */}
        <Route path="/auditor" element={
          <ProtectedRoute allowedRoles={['auditor']}>
            <AuditorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AuditorDashboard />} />
        </Route>
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
