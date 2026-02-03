import { useEffect, useState } from 'react';
import { Calendar, MapPin, MessageSquare } from 'lucide-react';
import { quoteRequestService, type QuoteRequest } from '../services/publicApi';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import Loading from '../components/common/Loading';
import { showToast } from '../utils/toast';

export default function ContractorRequests() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await quoteRequestService.listSent();
        setRequests(data);
      } catch (error) {
        showToast.apiError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <FullscreenBackground>
      <div className="min-h-[100svh]">
        <div className="page-shell max-w-5xl py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Meus pedidos</h1>
              <p className="text-sm text-gray-300">
                Acompanhe os orçamentos enviados para músicos
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loading text="Carregando pedidos..." />
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
              Nenhum pedido enviado ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-300">Músico</p>
                      <h2 className="text-lg font-semibold">{request.musician_name}</h2>
                      <p className="text-sm text-gray-300 mt-1">{request.event_type}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10">
                      {request.status_display}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-300">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(request.event_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {request.location_city} - {request.location_state}
                    </span>
                    {request.venue_name && (
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {request.venue_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FullscreenBackground>
  );
}
