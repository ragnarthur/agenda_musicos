// utils/toast.ts
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Extrai mensagem de erro de uma resposta da API
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;

    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    // Tenta extrair primeiro erro de validação
    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      const firstValue = data[firstKey];
      if (Array.isArray(firstValue) && firstValue.length > 0) {
        return `${firstKey}: ${firstValue[0]}`;
      }
      if (typeof firstValue === 'string') {
        return firstValue;
      }
    }

    if (error.response?.status === 401) return 'Sessão expirada. Faça login novamente.';
    if (error.response?.status === 403) return 'Você não tem permissão para esta ação.';
    if (error.response?.status === 404) return 'Recurso não encontrado.';
    if (error.response?.status === 500) return 'Erro interno do servidor.';
    if (error.message) return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado.';
};

/**
 * Toast helpers com mensagens padronizadas
 */
export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  loading: (message: string) => toast.loading(message),

  // Helpers para ações comuns
  eventCreated: () => toast.success('Evento criado com sucesso!'),
  eventUpdated: () => toast.success('Evento atualizado com sucesso!'),
  eventDeleted: () => toast.success('Evento excluído com sucesso!'),
  eventApproved: () => toast.success('Evento confirmado!'),
  eventRejected: () => toast.success('Convite recusado.'),
  eventCancelled: () => toast.success('Evento cancelado.'),

  availabilityUpdated: () => toast.success('Disponibilidade atualizada!'),
  availabilityCreated: () => toast.success('Disponibilidade cadastrada!'),
  availabilityDeleted: () => toast.success('Disponibilidade removida!'),

  ratingsSubmitted: () => toast.success('Avaliações enviadas com sucesso!'),

  connectionCreated: () => toast.success('Conexão adicionada!'),
  connectionRemoved: () => toast.success('Conexão removida.'),

  gigCreated: () => toast.success('Vaga publicada com sucesso!'),
  applicationSent: () => toast.success('Candidatura enviada!'),

  // Erro genérico com extração automática
  apiError: (error: unknown) => toast.error(getErrorMessage(error)),

  // Promise toast para operações assíncronas
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error?: string;
    }
  ) => toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error || 'Ocorreu um erro.',
  }),
};

export default toast;
