// App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Loading from './components/common/Loading';

// Lazy load de páginas para otimizar o bundle inicial
const Landing = lazy(() => import('./pages/Landing'));
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
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
  const Payment = lazy(() => import('./pages/Payment'));
  const Plans = lazy(() => import('./pages/Plans'));
  const PlanSuccess = lazy(() => import('./pages/PlanSuccess'));
  const FinancialSettings = lazy(() => import('./pages/FinancialSettings'));

  const useStripe = import.meta.env.VITE_USE_STRIPE === 'true';
  const allowFakePayment = import.meta.env.VITE_ALLOW_FAKE_PAYMENT === 'true';
  const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));

  // Componente de loading para Suspense
  const PageLoader: React.FC = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
      <Loading text="Carregando..." />
    </div>
  );

// Componente para rotas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Componente para redirecionar usuários autenticados da página de login
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Componente para Landing (redireciona se autenticado)
const LandingRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  // Se autenticado, redireciona para dashboard
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
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
        <Route
          path="/cadastro"
          element={
            <PublicRoute>
              <Register />
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

        <Route path="/verificar-email" element={<VerifyEmail />} />
        {(!useStripe || allowFakePayment) && <Route path="/pagamento" element={<Payment />} />}
        <Route path="/planos" element={<Plans />} />
        <Route path="/planos/sucesso" element={<PlanSuccess />} />
         <Route path="/pagamento/sucesso" element={<Payment />} />

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
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
