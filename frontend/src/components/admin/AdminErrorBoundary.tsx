import React from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';

interface AdminErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AdminErrorBoundary extends React.Component<React.PropsWithChildren, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Admin UI error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="bg-slate-900/90 backdrop-blur rounded-xl shadow p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Algo deu errado</h2>
        <p className="text-slate-300 mb-6">
          Tente recarregar a pagina ou voltar para o dashboard.
        </p>
        {this.state.error?.message && (
          <p className="text-xs text-slate-400 mb-6">{this.state.error.message}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={this.handleReload}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Recarregar
          </button>
          <Link
            to={ADMIN_ROUTES.dashboard}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-white/10 text-slate-200 hover:bg-white/10"
          >
            Ir para o dashboard
          </Link>
        </div>
      </div>
    );
  }
}

export default AdminErrorBoundary;
