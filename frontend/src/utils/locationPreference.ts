export type LocationPreference = {
  city: string;
  state: string;
  source: 'manual';
  updatedAt: number;
};

const STORAGE_KEY = 'location_preference';

const safeParse = (value: string | null): LocationPreference | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as LocationPreference;
    if (!parsed?.city || !parsed?.state || parsed.source !== 'manual') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const getLocationPreference = (): LocationPreference | null =>
  safeParse(localStorage.getItem(STORAGE_KEY));

export const setLocationPreference = (city: string, state: string): LocationPreference => {
  const preference: LocationPreference = {
    city: city.trim(),
    state: state.trim().toUpperCase(),
    source: 'manual',
    updatedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  window.dispatchEvent(
    new CustomEvent('location:preference-updated', { detail: preference })
  );
  return preference;
};

export const clearLocationPreference = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('location:preference-cleared'));
};
