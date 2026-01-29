import { useState, useEffect, useCallback } from 'react';
import { geocodingService } from '../services/geocoding';
import { isIOSSafari, getGeolocationTimeout, getPositionTimeout } from '../utils/browserDetection';

interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

interface GeolocationData {
  city: string | null;
  state: string | null;
  country: string | null;
  coordinates: Coordinates;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  isMonteCarmelo: boolean;
}

const CACHE_KEY = 'geolocation_data';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora em milissegundos

interface GeolocationOptions {
  autoStart?: boolean;
}

interface GeolocationError extends Error {
  code: number;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}

export const useGeolocation = (options: GeolocationOptions = {}) => {
  const { autoStart = true } = options;
  const [data, setData] = useState<GeolocationData>({
    city: null,
    state: null,
    country: null,
    coordinates: { latitude: null, longitude: null },
    isLoading: true,
    error: null,
    hasPermission: false,
    isMonteCarmelo: false,
  });

  const checkCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();

        if (now - parsed.timestamp < CACHE_DURATION) {
          const isMonteCarmelo = parsed.data.city?.toLowerCase().includes('monte carmelo') || false;
          setData({
            city: parsed.data.city,
            state: parsed.data.state,
            country: parsed.data.country,
            coordinates: parsed.coordinates,
            isLoading: false,
            error: null,
            hasPermission: true,
            isMonteCarmelo,
          });
          return true;
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Erro ao ler cache:', error);
    }
    return false;
  }, []);

  const saveCache = useCallback((geoData: GeolocationData) => {
    try {
      const cacheData = {
        timestamp: Date.now(),
        data: {
          city: geoData.city,
          state: geoData.state,
          country: geoData.country,
        },
        coordinates: geoData.coordinates,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      window.dispatchEvent(new CustomEvent('geolocation:updated', { detail: cacheData }));
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Geolocalização não é suportada neste navegador',
      }));
      return false;
    }

    try {
      const permission = await navigator.permissions.query({
        name: 'geolocation'
      } as PermissionDescriptor);

      if (permission.state === 'granted') {
        setData((prev) => ({ ...prev, hasPermission: true }));
        return true;
      } else if (permission.state === 'denied') {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Permissão de localização negada',
          hasPermission: false,
        }));
        return false;
      } else if (permission.state === 'prompt') {
        setData((prev) => ({ ...prev, hasPermission: true }));
        return true;
      }
    } catch {
      console.log('API de permissões não disponível, tentando geolocalização direta');
      setData((prev) => ({ ...prev, hasPermission: true }));
      return true;
    }

    return false;
  }, []);

  const getLocation = useCallback(async (retryWithLowAccuracy = false) => {
    if (!navigator.geolocation) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Geolocalização não é suportada neste navegador',
      }));
      return;
    }

    try {
      await requestPermission();
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      const timeoutDuration = getGeolocationTimeout();
      const positionTimeout = getPositionTimeout();

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          const error = new Error('Timeout ao obter localização') as GeolocationError;
          error.code = 3;
          error.PERMISSION_DENIED = 1;
          error.POSITION_UNAVAILABLE = 2;
          error.TIMEOUT = 3;
          reject(error);
        }, timeoutDuration);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            resolve(position);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          {
            enableHighAccuracy: !retryWithLowAccuracy,
            timeout: positionTimeout,
            maximumAge: retryWithLowAccuracy ? 300000 : 0, // 5 min cache on retry
          }
        );
      });

      // Extrair coordenadas
      const { latitude, longitude } = position.coords;
      const coords = { latitude, longitude };

      console.log('Coordenadas obtidas:', coords);

      // Fazer reverse geocoding para obter cidade/estado/país
      const locationInfo = await geocodingService.reverseGeocode(latitude, longitude);

      if (locationInfo) {
        // Verificar se é Monte Carmelo
        const isMonteCarmelo = locationInfo.city?.toLowerCase().includes('monte carmelo') || false;

        // Atualizar estado com todos os dados
        const newData: GeolocationData = {
          city: locationInfo.city,
          state: locationInfo.state,
          country: locationInfo.country,
          coordinates: coords,
          isLoading: false,
          error: null,
          hasPermission: true,
          isMonteCarmelo,
        };

        setData(newData);
        saveCache(newData); // Salvar no cache para evitar novas requisições

        console.log('Localização completa obtida:', newData);
      } else {
        // Geocoding falhou, mas temos coordenadas
        console.warn('Geocoding retornou nulo, salvando apenas coordenadas');
        setData((prev) => ({
          ...prev,
          coordinates: coords,
          isLoading: false,
          error: 'Não foi possível identificar sua cidade',
          hasPermission: true,
        }));
      }
    } catch (error: unknown) {
      console.error('Erro ao obter localização:', error);

      // Verifica se o erro tem propriedade code (erro da Geolocation API)
      const hasErrorCode = error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'number';

      // Se falhou com alta precisão e não tentamos ainda, tentar com baixa precisão
      if (!retryWithLowAccuracy && hasErrorCode && error.code === 3) { // Timeout
        console.log('Tentando novamente com precisão reduzida...');
        return getLocation(true);
      }

      let errorMessage = 'Erro ao obter localização';

      const isIOSDevice = isIOSSafari();

      // Mensagens específicas para iOS/Safari
      if (hasErrorCode && error.code === 1) {
        if (isIOSDevice) {
          errorMessage = 'Permissão de localização negada. Vá em Ajustes > Safari > Localização e permita o acesso.';
        } else {
          errorMessage = 'Permissão de localização negada';
        }
      } else if (hasErrorCode && error.code === 2) {
        errorMessage = 'Localização indisponível. Verifique se o GPS está ativado.';
      } else if (hasErrorCode && error.code === 3) {
        if (isIOSDevice) {
          errorMessage = 'Timeout ao obter localização. O GPS pode estar desativado ou o sinal está fraco.';
        } else {
          errorMessage = 'Timeout ao obter localização';
        }
      }

      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        hasPermission: !hasErrorCode || error.code !== 1, // Se negado, não tem permissão
      }));
    }
  }, [requestPermission, saveCache]);

  useEffect(() => {
    const initGeolocation = async () => {
      // Primeiro verifica se tem dados em cache
      const hasCachedData = checkCache();

      if (hasCachedData) {
        console.log('Usando dados de geolocalização do cache');
        return;
      }

      if (!autoStart) {
        setData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Se não tem cache, busca nova localização
      await getLocation();
    };

    initGeolocation();
  }, [autoStart, checkCache, getLocation]);

  useEffect(() => {
    const onGeoUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        data?: { city?: string | null; state?: string | null; country?: string | null };
        coordinates?: Coordinates;
      };

      if (!detail?.data) return;

      const isMonteCarmelo = detail.data?.city?.toLowerCase().includes('monte carmelo') || false;

      setData((prev) => ({
        ...prev,
        city: detail.data?.city ?? prev.city,
        state: detail.data?.state ?? prev.state,
        country: detail.data?.country ?? prev.country,
        coordinates: detail?.coordinates ?? prev.coordinates,
        isLoading: false,
        error: null,
        hasPermission: true,
        isMonteCarmelo,
      }));
    };

    window.addEventListener('geolocation:updated', onGeoUpdated);
    return () => window.removeEventListener('geolocation:updated', onGeoUpdated);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setData({
      city: null,
      state: null,
      country: null,
      coordinates: { latitude: null, longitude: null },
      isLoading: true,
      error: null,
      hasPermission: false,
      isMonteCarmelo: false,
    });
    // Após resetar, buscar nova localização
    getLocation();
  }, [getLocation]);

  return {
    ...data,
    getLocation,
    reset,
    requestPermission,
  };
};
