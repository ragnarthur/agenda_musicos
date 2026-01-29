// App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyAuthProvider, useCompanyAuth } from './contexts/CompanyAuthContext';
import Loading from './components/common/Loading';

// Lazy load de páginas para otimizar o bundle inicial
const Landing = lazy(() => import('./pages/Landing'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const StatusPage = lazy(() => import('./components/StatusPage'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EventsList = lazy(() => import('./pages/EventsList'));
const EventForm = lazy(() => import('./pages/EventForm'));
const EventEditForm = lazy(() => import('./pages/EventEditForm'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const EventBoard = lazy(() => import('./pages/EventBoard'));
const Approvals = lazy(() => import('./pages/Approvals'));
const Musicians = lazy(() => import('./pages/Musicians'));
const MusicianProfile = lazy(() => import('./pages/MusicianProfile'));
const LeaderAvailability = lazy(() => import('./pages/LeaderAvailability'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Connections = lazy(() => import('./pages/Connections'));
const RegisterInvite = lazy(() => import('./pages/RegisterInvite'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const MusicianRequest = lazy(() => import('./pages/MusicianRequest'));
const FinancialSettings = lazy(() => import('./pages/FinancialSettings'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));

  // Company pages lazy loading
  const LoginCompany = lazy(() => import('./pages/LoginCompany'));
  const RegisterCompany = lazy(() => import('./pages/RegisterCompany'));
  const CompanyDashboard = lazy(() => import('./pages/company/CompanyDashboard'));
  const MusicianSearch = lazy(() => import('./pages/company/MusicianSearch'));
  const Contacts = lazy(() => import('./pages/company/Contacts'));
  const CompanySettings = lazy(() => import('./pages/company/CompanySettings'));
  const JobPostings = lazy(() => import('./pages/company/JobPostings'));

  // Public pages (city landing and public profiles)
  const CityLanding = lazy(() => import('./pages/CityLanding'));
  const MusicianPublicProfile = lazy(() => import('./pages/MusicianPublicProfile'));

  // Componente de loading para Suspense
  const PageLoader: React.FC = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
      <Loading text="Carregando..." />
    </div>
  );

  // Enhanced Auth Hook for routing
  const useSmartAuth = () => {
    const { isAuthenticated: musicianAuth, user: musicianUser, loading: musicianLoading } = useAuth();
    const { isAuthenticated: companyAuth, organization, loading: companyLoading } = useCompanyAuth();
    
    const getAuthState = () => {
      const loading = musicianLoading || companyLoading;
      
      if (loading) return { loading, isAuthenticated: false, userType: null };
      
      if (musicianAuth) {
        return { 
          loading: false, 
          isAuthenticated: true, 
          userType: 'musician' as const,
          user: musicianUser 
        };
      }
      
      if (companyAuth) {
        return { 
          loading: false, 
          isAuthenticated: true, 
          userType: 'company' as const,
          user: organization 
        };
      }
      
      return { loading: false, isAuthenticated: false, userType: null };
    };
    
    const authState = getAuthState();
    return authState;
  };

// Componente para rotas protegidas (músicos)
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading, userType } = useSmartAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated || userType !== 'musician') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Componente para rotas protegidas de empresas
const CompanyProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading, userType } = useSmartAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated || userType !== 'company') {
    return <Navigate to="/login-empresa" replace />;
  }

  return children;
};

// Componente para redirecionar usuários autenticados da página de login
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading, userType } = useSmartAuth();

  if (loading) {
    return <PageLoader />;
  }

  // Se já estiver autenticado, redireciona para o dashboard correto
  if (isAuthenticated) {
    if (userType === 'company') {
      return <Navigate to="/empresa/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente para rotas administrativas (requer is_staff)
const AdminProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { user } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !user?.user?.is_staff) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente para Landing (redireciona se autenticado)
const LandingRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading, userType } = useSmartAuth();

  if (loading) {
    return <PageLoader />;
  }

  // Se autenticado, redireciona para dashboard correto
  if (isAuthenticated) {
    if (userType === 'company') {
      return <Navigate to="/empresa/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing Page - Nova rota raiz */}
        <Route
          path="/"
          element={
            <LandingRoute>
              <Landing />
            </LandingRoute>
          }
        />

        {/* Rotas Públicas */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        {/* Legacy route - redirects to /solicitar-acesso */}
        <Route
          path="/cadastro"
          element={<Navigate to="/solicitar-acesso" replace />}
        />
        <Route
          path="/cadastro/invite"
          element={
            <PublicRoute>
              <RegisterInvite />
            </PublicRoute>
          }
        />
        <Route
          path="/esqueci-senha"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/redefinir-senha"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        <Route
          path="/solicitar-acesso"
          element={
            <PublicRoute>
              <MusicianRequest />
            </PublicRoute>
          }
        />

        {/* Rotas Públicas de Empresa */}
        <Route
          path="/login-empresa"
          element={
            <PublicRoute>
              <LoginCompany />
            </PublicRoute>
          }
        />
        <Route
          path="/cadastro-empresa"
          element={
            <PublicRoute>
              <RegisterCompany />
            </PublicRoute>
          }
        />

        {/* Public City Landing and Musician Profile */}
        <Route path="/cidades/:slug" element={<CityLanding />} />
        <Route path="/musico/:id" element={<MusicianPublicProfile />} />

        <Route
          path="/eventos/agenda"
          element={
            <ProtectedRoute>
              <EventBoard />
            </ProtectedRoute>
          }
        />

        {/* Dashboard - Nova rota protegida */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Rotas específicas ANTES das rotas dinâmicas */}
        <Route
          path="/musicos/:id"
          element={
            <ProtectedRoute>
              <MusicianProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/musicos"
          element={
            <ProtectedRoute>
              <Musicians />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <Marketplace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/aprovacoes"
          element={
            <ProtectedRoute>
              <Approvals />
            </ProtectedRoute>
          }
        />

        <Route
          path="/disponibilidades"
          element={
            <ProtectedRoute>
              <LeaderAvailability />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos"
          element={
            <ProtectedRoute>
              <EventsList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/conexoes"
          element={
            <ProtectedRoute>
              <Connections />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/notificacoes"
          element={
            <ProtectedRoute>
              <NotificationSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes/financeiro"
          element={
            <ProtectedRoute>
              <FinancialSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos/novo"
          element={
            <ProtectedRoute>
              <EventForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos/:id/editar"
          element={
            <ProtectedRoute>
              <EventEditForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos/:id"
          element={
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          }
        />

        {/* Company Routes */}
        <Route
          path="/empresa/dashboard"
          element={
            <CompanyProtectedRoute>
              <CompanyDashboard />
            </CompanyProtectedRoute>
          }
        />

        <Route
          path="/empresa/musicians"
          element={
            <CompanyProtectedRoute>
              <MusicianSearch />
            </CompanyProtectedRoute>
          }
        />

        <Route
          path="/empresa/contatos"
          element={
            <CompanyProtectedRoute>
              <Contacts />
            </CompanyProtectedRoute>
          }
        />

        <Route
          path="/empresa/vagas"
          element={
            <CompanyProtectedRoute>
              <JobPostings />
            </CompanyProtectedRoute>
          }
        />

        <Route
          path="/empresa/configuracoes"
          element={
            <CompanyProtectedRoute>
              <CompanySettings />
            </CompanyProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/login"
          element={
            <PublicRoute>
              <AdminLogin />
            </PublicRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

        {/* Public Status Page */}
        <Route
          path="/status"
          element={
            <Suspense fallback={<Loading />}>
              <StatusPage />
            </Suspense>
          }
        />

        {/* Rota padrão - redireciona para home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CompanyAuthProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#f9fafb',
                  borderRadius: '0.75rem',
                  padding: '12px 16px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#f9fafb',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#f9fafb',
                  },
                  duration: 5000,
                },
              }}
            />
          </CompanyAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
