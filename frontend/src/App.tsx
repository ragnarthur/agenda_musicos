// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventsList from './pages/EventsList';
import EventForm from './pages/EventForm';
import EventEditForm from './pages/EventEditForm';
import EventDetail from './pages/EventDetail';
import EventBoard from './pages/EventBoard';
import Approvals from './pages/Approvals';
import Musicians from './pages/Musicians';
import LeaderAvailability from './pages/LeaderAvailability';
import Loading from './components/common/Loading';

// Componente para rotas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Carregando..." />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Componente para redirecionar usuários autenticados da página de login
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Carregando..." />
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  return (
    <Routes>
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
        path="/eventos/agenda"
        element={
          <ProtectedRoute>
            <EventBoard />
          </ProtectedRoute>
        }
      />

      {/* Rotas Protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Rotas específicas ANTES das rotas dinâmicas */}
      <Route
        path="/musicos"
        element={
          <ProtectedRoute>
            <Musicians />
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
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
