// contexts/CompanyAuthContext.tsx
// Contexto para gerenciar autenticação e estado de contratantes
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { contractorService, type ContractorProfile } from '../services/publicApi';
import {
  clearStoredAccessToken,
  clearStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from '../utils/tokenStorage';

interface CompanyAuthContextType {
  organization: ContractorProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (payload: { organization: ContractorProfile; access?: string; refresh?: string }) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateOrganization: (data: Partial<ContractorProfile>) => Promise<void>;
}

const CompanyAuthContext = createContext<CompanyAuthContextType | null>(null);

// Chave para marcar sessão ativa no sessionStorage
// sessionStorage é limpo ao fechar o navegador, garantindo novo login
const SESSION_KEY = 'gigflow_contractor_session';

interface CompanyAuthProviderProps {
  children: ReactNode;
}

export const CompanyAuthProvider: React.FC<CompanyAuthProviderProps> = ({ children }) => {
  const [organization, setOrganization] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef<() => void>(() => {});

  // Verificar se já existe uma sessão ativa
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Verifica se há uma sessão ativa nesta janela do navegador
        const hasActiveSession = sessionStorage.getItem(SESSION_KEY);
        const organizationData = sessionStorage.getItem('contractorProfile');

        if (!hasActiveSession) {
          // Navegador foi fechado e reaberto - força novo login
          if (isMounted) {
            setOrganization(null);
            clearStoredAccessToken();
            clearStoredRefreshToken();
            setLoading(false);
          }
          return;
        }

        if (organizationData && isMounted) {
          // Usar dados cached do sessionStorage primeiro
          const org = JSON.parse(organizationData);
          setOrganization(org);

          // Depois validar com backend
          try {
            const dashboard = await contractorService.getDashboard();
            if (isMounted) {
              setOrganization(dashboard.contractor);
              sessionStorage.setItem('contractorProfile', JSON.stringify(dashboard.contractor));
            }
          } catch (error) {
            if (!isMounted) return;
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status !== 401) {
              console.error('Erro ao validar sessão:', error);
            }
            logoutRef.current();
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Erro ao inicializar auth:', error);
        logoutRef.current();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await contractorService.login(email.toLowerCase().trim(), password);

      // Marcar sessão como ativa
      sessionStorage.setItem(SESSION_KEY, 'true');
      setStoredAccessToken(response.access);
      setStoredRefreshToken(response.refresh);

      // Armazenar dados da organização (tokens ficam em cookies httpOnly)
      setOrganization(response.contractor as ContractorProfile);
      sessionStorage.setItem('contractorProfile', JSON.stringify(response.contractor));

      toast.success(`Bem-vindo(a), ${response.contractor.name}!`);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const setSession = useCallback(
    (payload: { organization: ContractorProfile; access?: string; refresh?: string }) => {
      // Marcar sessão como ativa
      sessionStorage.setItem(SESSION_KEY, 'true');
      setStoredAccessToken(payload.access);
      setStoredRefreshToken(payload.refresh);

      // Armazenar dados da organização
      setOrganization(payload.organization);
      sessionStorage.setItem('contractorProfile', JSON.stringify(payload.organization));
    },
    []
  );

  const logout = useCallback((): void => {
    // Revogar token do Google se existir
    const contractorEmail = organization?.email;
    if (contractorEmail && window.google?.accounts?.id) {
      window.google.accounts.id.revoke(contractorEmail, done => {
        if (done.error) {
          console.warn('Erro ao revogar Google token:', done.error);
        } else {
          console.log('Google session revoked');
        }
      });
    }

    // Limpar sessionStorage
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('contractorProfile');
    clearStoredAccessToken();
    clearStoredRefreshToken();

    // Limpar estado
    setOrganization(null);
    setLoading(false);

    toast.success('Logout realizado com sucesso!');
  }, [organization]);

  logoutRef.current = logout;

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      // Tokens agora são gerenciados por cookies httpOnly no backend
      // Este método pode ser usado para validar a sessão se necessário
      const dashboard = await contractorService.getDashboard();
      setOrganization(dashboard.contractor);
      sessionStorage.setItem('contractorProfile', JSON.stringify(dashboard.contractor));
    } catch (error) {
      console.error('Erro ao renovar sessão:', error);
      logout();
      throw error;
    }
  }, [logout]);

  const updateOrganization = useCallback(async (data: Partial<ContractorProfile>): Promise<void> => {
    try {
      const updatedOrg = await contractorService.updateProfile(data);
      setOrganization(updatedOrg);
      sessionStorage.setItem('contractorProfile', JSON.stringify(updatedOrg));
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao atualizar perfil.';
      toast.error(message);
      throw error;
    }
  }, []);

  const value = useMemo<CompanyAuthContextType>(
    () => ({
      organization,
      loading,
      isAuthenticated: !!organization,
      login,
      setSession,
      logout,
      refreshToken,
      updateOrganization,
    }),
    [organization, loading, login, setSession, logout, refreshToken, updateOrganization]
  );

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

export default CompanyAuthContext;
