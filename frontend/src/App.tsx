// App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyAuthProvider, useCompanyAuth } from './contexts/CompanyAuthContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import Loading from './components/common/Loading';
import ErrorBoundary from './components/ErrorBoundary';
import { ADMIN_CHILD_ROUTES, ADMIN_ROUTES } from './routes/adminRoutes';

// Lazy load de páginas para otimizar o bundle inicial
const Landing = lazy(() => import('./pages/Landing'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminBundle').then(module => ({ default: module.AdminLayout }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminBundle').then(module => ({ default: module.AdminDashboardPage }))
);
const AdminRequests = lazy(() =>
  import('./pages/admin/AdminBundle').then(module => ({ default: module.AdminRequests }))
);
const AdminCities = lazy(() =>
  import('./pages/admin/AdminBundle').then(module => ({ default: module.AdminCities }))
);
const AdminUsers = lazy(() =>
  import('./pages/admin/AdminBundle').then(module => ({ default: module.AdminUsers }))
);
const AdminOrganizations = lazy(() =>
  import('./pages/admin/AdminBundle').then(module => ({ default: module.AdminOrganizations }))
);
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

// Contractor pages lazy loading
const LoginContractor = lazy(() => import('./pages/LoginCompany'));
const RegisterContractor = lazy(() => import('./pages/RegisterCompany'));
const ContractorRequests = lazy(() => import('./pages/ContractorRequests'));

// Public pages (city landing and public profiles)
const CityLanding = lazy(() => import('./pages/CityLanding'));
const MusicianPublicProfile = lazy(() => import('./pages/MusicianPublicProfile'));
const OurMusicians = lazy(() => import('./pages/OurMusicians'));

// Quote detail pages
const MusicianQuoteDetail = lazy(() => import('./pages/MusicianQuoteDetail'));
const ContractorQuoteDetail = lazy(() => import('./pages/ContractorQuoteDetail'));

// Admin pages
const BookingAudit = lazy(() => import('./pages/admin/BookingAudit'));

// Componente de loading para Suspense
const PageLoader: React.FC = () => (
  <div className="min-h-[100svh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
    <Loading text="Carregando..." />
  </div>
);

// Enhanced Auth Hook for routing
const useSmartAuth = () => {
  const { isAuthenticated: musicianAuth, user: musicianUser, loading: musicianLoading } = useAuth();
  const { isAuthenticated: companyAuth, organization, loading: companyLoading } = useCompanyAuth();
  const { isAuthenticated: adminAuth, user: adminUser, loading: adminLoading } = useAdminAuth();

  const getAuthState = () => {
    const loading = musicianLoading || companyLoading || adminLoading;

    if (loading) return { loading, isAuthenticated: false, userType: null };

    if (adminAuth) {
      return {
        loading: false,
        isAuthenticated: true,
        userType: 'admin' as const,
        user: adminUser,
      };
    }

    if (musicianAuth) {
      return {
        loading: false,
        isAuthenticated: true,
        userType: 'musician' as const,
        user: musicianUser,
      };
    }

    if (companyAuth) {
      return {
        loading: false,
        isAuthenticated: true,
        userType: 'contractor' as const,
        user: organization,
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

// Componente para rotas protegidas de contratantes
const ContractorProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading, userType } = useSmartAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated || userType !== 'contractor') {
    return <Navigate to="/contratante/login" replace />;
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
      if (userType === 'admin') {
        return <Navigate to={ADMIN_ROUTES.dashboard} replace />;
      }
      if (userType === 'contractor') {
        return <Navigate to="/contratante/pedidos" replace />;
      }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente para rotas administrativas (requer is_staff)
const AdminProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAdminAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !user?.is_staff) {
    return <Navigate to={ADMIN_ROUTES.login} replace />;
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
      if (userType === 'admin') {
        return <Navigate to={ADMIN_ROUTES.dashboard} replace />;
      }
      if (userType === 'contractor') {
        return <Navigate to="/contratante/pedidos" replace />;
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
        <Route path="/cadastro" element={<Navigate to="/solicitar-acesso" replace />} />
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

        {/* Rotas Públicas de Contratante */}
        <Route
          path="/contratante/login"
          element={
            <PublicRoute>
              <LoginContractor />
            </PublicRoute>
          }
        />
        <Route
          path="/contratante/cadastro"
          element={
            <PublicRoute>
              <RegisterContractor />
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
          path="/musicos/pedidos/:id"
          element={
            <ProtectedRoute>
              <MusicianQuoteDetail />
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

        {/* Public Route - Our Musicians */}
        <Route
          path="/nossos-musicos"
          element={
            <PublicRoute>
              <OurMusicians />
            </PublicRoute>
          }
        />

        {/* Contractor Routes */}
        <Route
          path="/contratante/pedidos/:id"
          element={
            <ContractorProtectedRoute>
              <ContractorQuoteDetail />
            </ContractorProtectedRoute>
          }
        />
        <Route
          path="/contratante/pedidos"
          element={
            <ContractorProtectedRoute>
              <ContractorRequests />
            </ContractorProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path={ADMIN_ROUTES.login}
          element={
            <PublicRoute>
              <AdminLogin />
            </PublicRoute>
          }
        />
        <Route
          path={ADMIN_ROUTES.base}
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to={ADMIN_ROUTES.dashboard} replace />} />
          <Route path={ADMIN_CHILD_ROUTES.dashboard} element={<AdminDashboardPage />} />
          <Route path={ADMIN_CHILD_ROUTES.requests} element={<AdminRequests />} />
          <Route path={ADMIN_CHILD_ROUTES.requestsDetail} element={<AdminRequests />} />
          <Route path={ADMIN_CHILD_ROUTES.bookingAudit} element={<BookingAudit />} />
          <Route path={ADMIN_CHILD_ROUTES.cities} element={<AdminCities />} />
          <Route path={ADMIN_CHILD_ROUTES.citiesDetail} element={<AdminCities />} />
          <Route path={ADMIN_CHILD_ROUTES.users} element={<AdminUsers />} />
          <Route path={ADMIN_CHILD_ROUTES.usersDetail} element={<AdminUsers />} />
          <Route path={ADMIN_CHILD_ROUTES.organizations} element={<AdminOrganizations />} />
          <Route
            path={ADMIN_CHILD_ROUTES.organizationsDetail}
            element={<AdminOrganizations />}
          />
        </Route>

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
            <AdminAuthProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1e293b',
                    color: '#fff',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
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
            </AdminAuthProvider>
          </CompanyAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
