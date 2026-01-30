// services/geocoding.ts
// Serviço de geocoding usando OpenStreetMap Nominatim (100% gratuito)

interface NominatimResponse {
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

interface GeocodeData {
  city: string | null;
  state: string | null;
  country: string | null;
}

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

class GeocodingService {
  private cache: Map<string, GeocodeData> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hora em milissegundos
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 segundo (rate limit do Nominatim)

  private generateCacheKey(lat: number, lon: number): string {
    return `${lat.toFixed(4)},${lon.toFixed(4)}`;
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) return false;
    return Date.now() < expiry;
  }

  private setCache(key: string, data: GeocodeData): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private getCache(key: string): GeocodeData | null {
    if (!this.isCacheValid(key)) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  /**
   * Garante rate limit de 1 requisição/segundo (política do Nominatim)
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Reverse geocoding: converte coordenadas em nome da cidade
   * Usa OpenStreetMap Nominatim (gratuito)
   *
   * @param lat Latitude
   * @param lon Longitude
   * @returns { city, state, country } ou null em caso de erro
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodeData | null> {
    const cacheKey = this.generateCacheKey(lat, lon);
    const cached = this.getCache(cacheKey);

    if (cached) {
      console.log('Usando cache de geocoding:', cached);
      return cached;
    }

    try {
      // Respeitar rate limit
      await this.waitForRateLimit();

      const url = `${NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=pt-BR`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GigFlow/1.0', // Obrigatório pela política do Nominatim
        },
        signal: AbortSignal.timeout(5000), // 5 segundos timeout
      });

      if (!response.ok) {
        console.error('Erro na API Nominatim:', response.status, response.statusText);
        return null;
      }

      const data: NominatimResponse = await response.json();

      if (data && data.address) {
        const geocodeData: GeocodeData = {
          city:
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.municipality ||
            null,
          state: data.address.state || null,
          country: data.address.country || null,
        };

        this.setCache(cacheKey, geocodeData);
        console.log('Geocoding bem-sucedido:', geocodeData);
        return geocodeData;
      }

      console.warn('Resposta inválida da API Nominatim:', data);
      return null;
    } catch (error) {
      console.error('Erro no reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Geocoding direto: converte nome da cidade em coordenadas
   * Usa OpenStreetMap Nominatim
   *
   * @param city Nome da cidade
   * @param state Estado (opcional)
   * @param country País (opcional)
   * @returns { lat, lon } ou null em caso de erro
   */
  async geocode(
    city: string,
    state?: string,
    country = 'Brasil'
  ): Promise<{ lat: number; lon: number } | null> {
    try {
      // Respeitar rate limit
      await this.waitForRateLimit();

      const query = state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
      const encodedQuery = encodeURIComponent(query);

      const url = `${NOMINATIM_API}/search?q=${encodedQuery}&format=json&limit=1&accept-language=pt-BR`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GigFlow/1.0', // Obrigatório pela política do Nominatim
        },
        signal: AbortSignal.timeout(5000), // 5 segundos timeout
      });

      if (!response.ok) {
        console.error('Erro na API Nominatim:', response.status);
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
        };
      }

      console.warn('Cidade não encontrada:', city);
      return null;
    } catch (error) {
      console.error('Erro no geocoding:', error);
      return null;
    }
  }

  /**
   * Limpa todo o cache de geocoding
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Exportar instância única
export const geocodingService = new GeocodingService();
