export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

export const BRAZILIAN_STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapa',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceara',
  DF: 'Distrito Federal',
  ES: 'Espirito Santo',
  GO: 'Goias',
  MA: 'Maranhao',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Para',
  PB: 'Paraiba',
  PR: 'Parana',
  PE: 'Pernambuco',
  PI: 'Piaui',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondonia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'Sao Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export const BRAZILIAN_STATE_OPTIONS = Object.entries(BRAZILIAN_STATE_NAMES).map(
  ([value, label]) => ({ value, label })
);

const normalizeState = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const STATE_NAME_TO_ABBR = Object.fromEntries(
  Object.entries(BRAZILIAN_STATE_NAMES).map(([abbr, name]) => [normalizeState(name), abbr])
);

export const getStateAbbreviation = (state?: string | null): string | null => {
  if (!state) return null;
  const trimmed = state.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (BRAZILIAN_STATE_NAMES[upper]) {
    return upper;
  }

  const normalized = normalizeState(trimmed);
  return STATE_NAME_TO_ABBR[normalized] || null;
};
