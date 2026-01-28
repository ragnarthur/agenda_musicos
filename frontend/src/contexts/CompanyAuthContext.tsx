// contexts/CompanyAuthContext.tsx
// Contexto para gerenciar autenticação e estado de empresas
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { companyService, type Organization } from '../services/publicApi';

interface CompanyAuthContextType {
  organization: Organization | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateOrganization: (data: Partial<Organization>) => Promise<void>;
}

const CompanyAuthContext = createContext<CompanyAuthContextType | null>(null);

interface CompanyAuthProviderProps {
  children: ReactNode;
}

export const CompanyAuthProvider: React.FC<CompanyAuthProviderProps> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se já existe um token no localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('companyToken');
        const organizationData = localStorage.getItem('companyOrganization');

        if (token && organizationData) {
          // Usar dados cached do localStorage primeiro
          const org = JSON.parse(organizationData);
          setOrganization(org);

          // Depois validar com backend
          try {
            const dashboard = await companyService.getDashboard();
            setOrganization(dashboard.organization);
            localStorage.setItem('companyOrganization', JSON.stringify(dashboard.organization));
          } catch (error) {
            console.error('Token inválido:', error);
            logout();
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await companyService.login(email.toLowerCase().trim(), password);
      
      // Armazenar tokens
      localStorage.setItem('companyToken', response.access);
      localStorage.setItem('companyRefresh', response.refresh);
      localStorage.setItem('userType', 'company');
      
      // Armazenar dados da organização
      setOrganization(response.organization as Organization);
      localStorage.setItem('companyOrganization', JSON.stringify(response.organization));

      toast.success(`Bem-vindo(a) à ${response.organization.name}!`);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    // Limpar storage
    localStorage.removeItem('companyToken');
    localStorage.removeItem('companyRefresh');
    localStorage.removeItem('userType');
    localStorage.removeItem('companyOrganization');
    
    // Limpar estado
    setOrganization(null);
    setLoading(false);

    toast.success('Logout realizado com sucesso!');
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('companyRefresh');
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      // Aqui você faria a chamada para renovar o token
      // Por enquanto, vamos apenas manter o token existente
      console.log('Token refresh não implementado ainda');
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      logout();
      throw error;
    }
  };

  const updateOrganization = async (data: Partial<Organization>): Promise<void> => {
    try {
      const updatedOrg = await companyService.updateProfile(data);
      setOrganization(updatedOrg);
      localStorage.setItem('companyOrganization', JSON.stringify(updatedOrg));
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Erro ao atualizar perfil.';
      toast.error(message);
      throw error;
    }
  };

  const value: CompanyAuthContextType = {
    organization,
    loading,
    isAuthenticated: !!organization,
    login,
    logout,
    refreshToken,
    updateOrganization,
  };

  return (
    <CompanyAuthContext.Provider value={value}>
      {children}
    </CompanyAuthContext.Provider>
  );
};

// Hook para usar o contexto
export const useCompanyAuth = (): CompanyAuthContextType => {
  const context = useContext(CompanyAuthContext);
  if (!context) {
    throw new Error('useCompanyAuth deve ser usado dentro de um CompanyAuthProvider');
  }
  return context;
};

// Hook customizado para interceptar requisições da API
export const useCompanyApi = () => {
  const { logout, refreshToken } = useCompanyAuth();

  // Interceptador para requisições que falham com 401
  const handleApiError = async (error: any) => {
    if (error?.response?.status === 401) {
      try {
        await refreshToken();
        // Tentar a requisição novamente aqui se necessário
        return true;
      } catch (refreshError) {
        logout();
        return false;
      }
    }
    return false;
  };

  return { handleApiError };
};

export default CompanyAuthContext;