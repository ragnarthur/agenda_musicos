import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Lock, Loader2 } from 'lucide-react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import { publicMusicianService, type MusicianContact } from '../../services/publicApi';
import { showToast } from '../../utils/toast';

interface ContactButtonProps {
  musicianId: number;
  musicianName: string;
  className?: string;
}

const ContactButton: React.FC<ContactButtonProps> = ({
  musicianId,
  musicianName,
  className = '',
}) => {
  const { isAuthenticated } = useCompanyAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState<MusicianContact | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!isAuthenticated) {
      // Salva onde estava para voltar depois do login
      sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
      navigate('/contratante/login');
      return;
    }

    setLoading(true);
    try {
      const data = await publicMusicianService.getContact(musicianId);
      setContact(data);
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
      showToast.error('Erro ao carregar informações de contato');
    } finally {
      setLoading(false);
    }
  };

  // Se já tem o contato, mostra os botões de WhatsApp/Telefone
  if (contact) {
    const hasWhatsApp = contact.whatsapp && contact.whatsapp.trim();
    const hasPhone = contact.phone && contact.phone.trim();

    // Se não tem nenhum contato disponível
    if (!hasWhatsApp && !hasPhone) {
      return (
        <div className={`text-gray-400 text-sm ${className}`}>
          {musicianName} ainda não cadastrou informações de contato.
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {hasWhatsApp && (
          <a
            href={`https://wa.me/55${contact.whatsapp!.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </a>
        )}
        {hasPhone && !hasWhatsApp && (
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Phone className="h-5 w-5" />
            {contact.phone}
          </a>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-wait ${className}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {!isAuthenticated && <Lock className="h-4 w-4" />}
          <MessageCircle className="h-5 w-5" />
        </>
      )}
      {loading ? 'Carregando...' : 'Ver Contato'}
    </button>
  );
};

export default ContactButton;
