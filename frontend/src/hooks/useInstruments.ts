// hooks/useInstruments.ts
import { useEffect, useState } from 'react';
import { instrumentsService, type Instrument } from '../services/instrumentsApi';
import { showToast } from '../utils/toast';

// Fallback para lista hardcoded (se API falhar)
const FALLBACK_INSTRUMENTS: Instrument[] = [
  { id: 1, name: 'vocal', display_name: 'Vocal', type: 'predefined', usage_count: 0 },
  { id: 2, name: 'guitarra', display_name: 'Guitarra', type: 'predefined', usage_count: 0 },
  { id: 3, name: 'violao', display_name: 'Violão', type: 'predefined', usage_count: 0 },
  { id: 4, name: 'baixo', display_name: 'Baixo', type: 'predefined', usage_count: 0 },
  { id: 5, name: 'bateria', display_name: 'Bateria', type: 'predefined', usage_count: 0 },
  { id: 6, name: 'teclado', display_name: 'Teclado', type: 'predefined', usage_count: 0 },
  { id: 7, name: 'piano', display_name: 'Piano', type: 'predefined', usage_count: 0 },
  { id: 8, name: 'sintetizador', display_name: 'Sintetizador', type: 'predefined', usage_count: 0 },
  { id: 9, name: 'percussao', display_name: 'Percussão', type: 'predefined', usage_count: 0 },
  { id: 10, name: 'cajon', display_name: 'Cajón', type: 'predefined', usage_count: 0 },
  { id: 11, name: 'violino', display_name: 'Violino', type: 'predefined', usage_count: 0 },
  { id: 12, name: 'viola', display_name: 'Viola', type: 'predefined', usage_count: 0 },
  { id: 13, name: 'violoncelo', display_name: 'Violoncelo', type: 'predefined', usage_count: 0 },
  {
    id: 14,
    name: 'contrabaixo acustico',
    display_name: 'Contrabaixo acústico',
    type: 'predefined',
    usage_count: 0,
  },
  { id: 15, name: 'saxofone', display_name: 'Saxofone', type: 'predefined', usage_count: 0 },
  { id: 16, name: 'trompete', display_name: 'Trompete', type: 'predefined', usage_count: 0 },
  { id: 17, name: 'trombone', display_name: 'Trombone', type: 'predefined', usage_count: 0 },
  { id: 18, name: 'flauta', display_name: 'Flauta', type: 'predefined', usage_count: 0 },
  { id: 19, name: 'clarinete', display_name: 'Clarinete', type: 'predefined', usage_count: 0 },
  { id: 20, name: 'gaita', display_name: 'Gaita', type: 'predefined', usage_count: 0 },
  { id: 21, name: 'ukulele', display_name: 'Ukulele', type: 'predefined', usage_count: 0 },
  { id: 22, name: 'banjo', display_name: 'Banjo', type: 'predefined', usage_count: 0 },
  { id: 23, name: 'bandolim', display_name: 'Bandolim', type: 'predefined', usage_count: 0 },
  { id: 24, name: 'dj', display_name: 'DJ', type: 'predefined', usage_count: 0 },
  { id: 25, name: 'produtora', display_name: 'Produtor(a)', type: 'predefined', usage_count: 0 },
];

export const useInstruments = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstruments();
  }, []);

  const loadInstruments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await instrumentsService.list();
      setInstruments(data);
    } catch (err) {
      console.error('Erro ao carregar instrumentos:', err);
      setError('Erro ao carregar instrumentos');
      // Fallback para lista hardcoded se API falhar
      setInstruments(FALLBACK_INSTRUMENTS);
    } finally {
      setLoading(false);
    }
  };

  const createCustomInstrument = async (displayName: string): Promise<Instrument | null> => {
    try {
      const newInstrument = await instrumentsService.createCustom(displayName);

      // Adiciona à lista local
      setInstruments(prev => [...prev, newInstrument]);

      showToast.success(`Instrumento "${newInstrument.display_name}" adicionado!`);
      return newInstrument;
    } catch (err: any) {
      const message =
        err?.response?.data?.display_name?.[0] ||
        err?.response?.data?.detail ||
        'Erro ao criar instrumento';
      showToast.error(message);
      return null;
    }
  };

  const searchInstruments = async (query: string): Promise<Instrument[]> => {
    try {
      return await instrumentsService.search(query);
    } catch (err) {
      console.error('Erro ao buscar instrumentos:', err);
      return [];
    }
  };

  return {
    instruments,
    loading,
    error,
    createCustomInstrument,
    searchInstruments,
    refreshInstruments: loadInstruments,
  };
};
