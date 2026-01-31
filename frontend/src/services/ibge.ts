type IbgeState = {
  id: number;
  sigla: string;
  nome: string;
};

type IbgeCity = {
  id: number;
  nome: string;
};

const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const STATES_CACHE_KEY = 'ibge_states_cache_v1';
const CITIES_CACHE_PREFIX = 'ibge_cities_cache_v1_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const memoryCache: {
  states?: IbgeState[];
  citiesByUf: Record<string, IbgeCity[]>;
} = {
  citiesByUf: {},
};

const readCache = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp: number; data: T };
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Ignore cache write errors (storage full or disabled).
  }
};

export const fetchIbgeStates = async (): Promise<IbgeState[]> => {
  if (memoryCache.states) return memoryCache.states;

  const cached = readCache<IbgeState[]>(STATES_CACHE_KEY);
  if (cached) {
    memoryCache.states = cached;
    return cached;
  }

  const response = await fetch(`${IBGE_BASE_URL}/estados`);
  if (!response.ok) {
    throw new Error('Falha ao carregar estados do IBGE');
  }

  const data = (await response.json()) as IbgeState[];
  memoryCache.states = data;
  writeCache(STATES_CACHE_KEY, data);
  return data;
};

export const fetchIbgeCitiesByUf = async (uf: string): Promise<IbgeCity[]> => {
  const normalizedUf = uf.trim().toUpperCase();
  if (!normalizedUf) return [];

  if (memoryCache.citiesByUf[normalizedUf]) {
    return memoryCache.citiesByUf[normalizedUf];
  }

  const cacheKey = `${CITIES_CACHE_PREFIX}${normalizedUf}`;
  const cached = readCache<IbgeCity[]>(cacheKey);
  if (cached) {
    memoryCache.citiesByUf[normalizedUf] = cached;
    return cached;
  }

  const states = await fetchIbgeStates();
  const state = states.find(item => item.sigla === normalizedUf);
  if (!state) return [];

  const response = await fetch(`${IBGE_BASE_URL}/estados/${state.id}/municipios?orderBy=nome`);
  if (!response.ok) {
    throw new Error('Falha ao carregar municipios do IBGE');
  }

  const data = (await response.json()) as IbgeCity[];
  memoryCache.citiesByUf[normalizedUf] = data;
  writeCache(cacheKey, data);
  return data;
};

export const ibgeService = {
  fetchStates: fetchIbgeStates,
  fetchCitiesByState: fetchIbgeCitiesByUf,
};
