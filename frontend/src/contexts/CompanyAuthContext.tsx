// contexts/CompanyAuthContext.tsx
// Contexto para gerenciar autenticação e estado de empresas
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { companyService, type Organization } from '../services/publicApi';
import {
  clearStoredAccessToken,
  clearStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from '../utils/tokenStorage';

interface CompanyAuthContextType {
  organization: Organization | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (payload: { organization: Organization; access?: string; refresh?: string }) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateOrganization: (data: Partial<Organization>) => Promise<void>;
}

const CompanyAuthContext = createContext<CompanyAuthContextType | null>(null);

// Chave para marcar sessão ativa no sessionStorage
// sessionStorage é limpo ao fechar o navegador, garantindo novo login
const SESSION_KEY = 'gigflow_company_session';

interface CompanyAuthProviderProps {
  children: ReactNode;
}

export const CompanyAuthProvider: React.FC<CompanyAuthProviderProps> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef<() => void>(() => {});

  // Verificar se já existe uma sessão ativa
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Verifica se há uma sessão ativa nesta janela do navegador
        const hasActiveSession = sessionStorage.getItem(SESSION_KEY);
        const organizationData = sessionStorage.getItem('companyOrganization');

        if (!hasActiveSession) {
          // Navegador foi fechado e reaberto - força novo login
          setOrganization(null);
          clearStoredAccessToken();
          clearStoredRefreshToken();
          setLoading(false);
          return;
        }

        if (organizationData) {
          // Usar dados cached do sessionStorage primeiro
          const org = JSON.parse(organizationData);
          setOrganization(org);

          // Depois validar com backend
          try {
            const dashboard = await companyService.getDashboard();
            setOrganization(dashboard.organization);
            sessionStorage.setItem('companyOrganization', JSON.stringify(dashboard.organization));
          } catch (error) {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status !== 401) {
              console.error('Erro ao validar sessão:', error);
            }
            logoutRef.current();
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
        logoutRef.current();
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

      // Marcar sessão como ativa
      sessionStorage.setItem(SESSION_KEY, 'true');
      setStoredAccessToken(response.access);
      setStoredRefreshToken(response.refresh);

      // Armazenar dados da organização (tokens ficam em cookies httpOnly)
      setOrganization(response.organization as Organization);
      sessionStorage.setItem('companyOrganization', JSON.stringify(response.organization));

      toast.success(`Bem-vindo(a) à ${response.organization.name}!`);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setSession = (payload: {
    organization: Organization;
    access?: string;
    refresh?: string;
  }) => {
    // Marcar sessão como ativa
    sessionStorage.setItem(SESSION_KEY, 'true');
    setStoredAccessToken(payload.access);
    setStoredRefreshToken(payload.refresh);

    // Armazenar dados da organização
    setOrganization(payload.organization);
    sessionStorage.setItem('companyOrganization', JSON.stringify(payload.organization));
  };

  const logout = (): void => {
    // Revogar token do Google se existir
    const organizationEmail = organization?.contact_email;
    if (organizationEmail && window.google?.accounts?.id) {
      window.google.accounts.id.revoke(organizationEmail, done => {
        if (done.error) {
          console.warn('Erro ao revogar Google token:', done.error);
        } else {
          console.log('Google session revoked');
        }
      });
    }

    // Limpar sessionStorage
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('companyOrganization');
    clearStoredAccessToken();
    clearStoredRefreshToken();

    // Limpar estado
    setOrganization(null);
    setLoading(false);

    toast.success('Logout realizado com sucesso!');
  };

  logoutRef.current = logout;

  const refreshToken = async (): Promise<void> => {
    try {
      // Tokens agora são gerenciados por cookies httpOnly no backend
      // Este método pode ser usado para validar a sessão se necessário
      const dashboard = await companyService.getDashboard();
      setOrganization(dashboard.organization);
      sessionStorage.setItem('companyOrganization', JSON.stringify(dashboard.organization));
    } catch (error) {
      console.error('Erro ao renovar sessão:', error);
      logout();
      throw error;
    }
  };

  const updateOrganization = async (data: Partial<Organization>): Promise<void> => {
    try {
      const updatedOrg = await companyService.updateProfile(data);
      setOrganization(updatedOrg);
      sessionStorage.setItem('companyOrganization', JSON.stringify(updatedOrg));
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao atualizar perfil.';
      toast.error(message);
      throw error;
    }
  };

  const value: CompanyAuthContextType = {
    organization,
    loading,
    isAuthenticated: !!organization,
    login,
    setSession,
    logout,
    refreshToken,
    updateOrganization,
  };

  return <CompanyAuthContext.Provider value={value}>{children}</CompanyAuthContext.Provider>;
};

// Hook para usar o contexto
// eslint-disable-next-line react-refresh/only-export-components
export const useCompanyAuth = (): CompanyAuthContextType => {
  const context = useContext(CompanyAuthContext);
  if (!context) {
    throw new Error('useCompanyAuth deve ser usado dentro de um CompanyAuthProvider');
  }
  return context;
};

// Hook customizado para interceptar requisições da API
// eslint-disable-next-line react-refresh/only-export-components
export const useCompanyApi = () => {
  const { logout, refreshToken } = useCompanyAuth();

  // Interceptador para requisições que falham com 401
  const handleApiError = async (error: unknown) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      try {
        await refreshToken();
        // Tentar a requisição novamente aqui se necessário
        return true;
      } catch {
        logout();
        return false;
      }
    }
    return false;
  };

  return { handleApiError };
};

export default CompanyAuthContext;
