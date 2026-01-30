// utils/formatting.ts
/**
 * Funções utilitárias de formatação compartilhadas entre componentes.
 */

import type { Musician, Availability } from '../types';

/**
 * Extrai o nome de exibição de um músico.
 * Tenta usar full_name, depois user.full_name, depois first_name + last_name, e por fim username.
 */
export function getMusicianDisplayName(musician: Musician | null | undefined): string {
  if (!musician) return 'Desconhecido';

  const name =
    musician.full_name ||
    musician.user?.full_name ||
    `${musician.user?.first_name || ''} ${musician.user?.last_name || ''}`.trim() ||
    musician.user?.username ||
    'Músico';

  return name;
}

/**
 * Formata o label do músico com nome e instrumento.
 */
export function formatMusicianLabel(musician: Musician): string {
  const name = getMusicianDisplayName(musician);
  const instrument = formatInstrumentLabel(musician.instrument);

  return instrument ? `${name} (${instrument})` : name;
}

/**
 * Converte string de horário "HH:MM" para minutos totais.
 */
export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte minutos totais para string "HH:MM".
 */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formata uma data para exibição no formato brasileiro.
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata uma data completa com dia da semana.
 */
export function formatDateFull(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formatter cacheado para evitar recriar Intl.NumberFormat toda hora.
 */
const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Parse seguro para valores monetários vindos como number/string.
 * Aceita:
 * - "6000000.00"
 * - "6.000.000,00"
 * - "R$ 6.000.000,00"
 * - 6000000
 */
function parseCurrencyToNumber(value: number | string): number {
  if (typeof value === 'number') return value;

  const raw = value.trim();
  if (!raw) return NaN;

  // remove tudo que não for dígito, vírgula, ponto, sinal
  const cleaned = raw.replace(/[^\d,.-]/g, '');

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  // Se tem vírgula e ponto, assume pt-BR (ponto milhar, vírgula decimal)
  if (hasComma && hasDot) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return Number.parseFloat(normalized);
  }

  // Se só tem vírgula, assume vírgula decimal
  if (hasComma && !hasDot) {
    const normalized = cleaned.replace(',', '.');
    return Number.parseFloat(normalized);
  }

  // Caso padrão: "6000000.00" (decimal com ponto) ou inteiro
  return Number.parseFloat(cleaned);
}

/**
 * Formata um valor monetário para Real brasileiro.
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';

  const numValue = parseCurrencyToNumber(value);
  if (!Number.isFinite(numValue)) return '-';

  return BRL_FORMATTER.format(numValue);
}

/**
 * Formata duração entre dois horários.
 */
export function formatDuration(startTime: string, endTime: string): string {
  const startMinutes = timeStringToMinutes(startTime);
  let endMinutes = timeStringToMinutes(endTime);

  // Se end < start, assume que cruza meia-noite
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
}

/**
 * Labels de status de evento.
 */
export const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposto',
  approved: 'Confirmado',
  rejected: 'Rejeitado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

/**
 * Labels de instrumentos.
 */
export const INSTRUMENT_LABELS: Record<string, string> = {
  vocal: 'Vocal',
  guitar: 'Guitarra',
  acoustic_guitar: 'Violão',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  piano: 'Piano',
  synth: 'Sintetizador',
  percussion: 'Percussão',
  cajon: 'Cajón',
  violin: 'Violino',
  viola: 'Viola',
  cello: 'Violoncelo',
  double_bass: 'Contrabaixo acústico',
  saxophone: 'Saxofone',
  sax: 'Saxofone',
  trumpet: 'Trompete',
  trombone: 'Trombone',
  flute: 'Flauta',
  clarinet: 'Clarinete',
  harmonica: 'Gaita',
  ukulele: 'Ukulele',
  banjo: 'Banjo',
  mandolin: 'Bandolim',
  dj: 'DJ',
  producer: 'Produtor(a)',
  other: 'Outro',
  electric_guitar: 'Guitarra elétrica',
  'electric guitar': 'Guitarra elétrica',
  'bass guitar': 'Baixo',
  singer: 'Cantor(a)',
  vocalist: 'Vocalista',
};

export const formatInstrumentLabel = (instrument?: string): string => {
  if (!instrument) return '';
  const key = instrument.trim().toLowerCase();
  const label = INSTRUMENT_LABELS[key];
  if (label) return label;

  const pretty = key.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!pretty) return instrument;
  return pretty.replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Labels de resposta de disponibilidade.
 */
export const AVAILABILITY_LABELS: Record<string, string> = {
  pending: 'Pendente',
  available: 'Disponível',
  unavailable: 'Indisponível',
  maybe: 'Talvez',
};

/**
 * Cores de status (Tailwind classes).
 */
export const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

/**
 * Cores de disponibilidade (Tailwind classes).
 */
export const AVAILABILITY_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  available: 'bg-green-100 text-green-700',
  unavailable: 'bg-red-100 text-red-700',
  maybe: 'bg-yellow-100 text-yellow-700',
};

/**
 * Extrai o lineup de disponibilidades de um evento.
 */
export function extractLineup(availabilities: Availability[] | undefined): string[] {
  if (!availabilities) return [];

  return availabilities
    .filter(a => a.response === 'available')
    .map(a => getMusicianDisplayName(a.musician));
}

/**
 * Conta disponibilidades por tipo.
 */
export function countAvailabilities(availabilities: Availability[] | undefined): {
  available: number;
  unavailable: number;
  maybe: number;
  pending: number;
  total: number;
} {
  if (!availabilities) {
    return { available: 0, unavailable: 0, maybe: 0, pending: 0, total: 0 };
  }

  return availabilities.reduce(
    (acc, a) => {
      acc.total++;
      if (a.response === 'available') acc.available++;
      else if (a.response === 'unavailable') acc.unavailable++;
      else if (a.response === 'maybe') acc.maybe++;
      else acc.pending++;
      return acc;
    },
    { available: 0, unavailable: 0, maybe: 0, pending: 0, total: 0 }
  );
}

/**
 * Formata número de telefone brasileiro.
 * Aceita entrada com ou sem máscara e aplica formatação: (XX) XXXXX-XXXX
 * @param value - Valor a ser formatado (pode ter dígitos ou já estar formatado)
 * @returns Telefone formatado no padrão brasileiro
 * @example
 * formatPhone('11999999999') // '(11) 99999-9999'
 * formatPhone('(11) 99999-9999') // '(11) 99999-9999'
 * formatPhone('11') // '11'
 */
export function formatPhone(value: string): string {
  if (!value) return '';

  const numbers = value.replace(/\D/g, '');
  const limited = numbers.slice(0, 11);

  if (limited.length <= 2) return limited;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  if (limited.length <= 10)
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

/**
 * Remove a máscara de telefone, retornando apenas os dígitos.
 * Útil para enviar ao backend ou armazenar em formato limpo.
 * @param value - Telefone com ou sem máscara
 * @returns Apenas os dígitos do telefone
 * @example
 * unmaskPhone('(11) 99999-9999') // '11999999999'
 * unmaskPhone('11999999999') // '11999999999'
 */
export function unmaskPhone(value: string): string {
  return value.replace(/\D/g, '');
}
