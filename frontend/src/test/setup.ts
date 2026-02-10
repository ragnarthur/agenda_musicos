import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Vitest nao carrega o plugin do PWA (virtual modules). Mock para nao quebrar suites.
vi.mock('virtual:pwa-register', () => ({
  registerSW: () => async () => undefined,
}));

// Many smoke tests just assert "renders without crashing" and don't care about
// Auth/Theme state. We keep real Providers available (used by renderWithProviders),
// but mock the hooks to avoid requiring Provider wiring in every test file.
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>();
  const defaultAuthState = {
    user: null,
    loading: false,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    setSession: vi.fn(),
    refreshUser: vi.fn(),
  };
  return {
    ...actual,
    // vi.fn so individual tests can override return values.
    useAuth: vi.fn(() => defaultAuthState),
  };
});

vi.mock('../contexts/useTheme', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/useTheme')>();
  return {
    ...actual,
    useTheme: () => ({
      theme: 'dark',
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    }),
  };
});

afterEach(() => {
  cleanup();
});

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

vi.stubGlobal('import', { meta: { env: { DEV: true, VITE_API_URL: '/api' } } });

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: vi.fn(
    () =>
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  ),
  writable: true,
});

class MockLottiePlayer {
  destroy = vi.fn();
  play = vi.fn();
  pause = vi.fn();
  stop = vi.fn();
  setSpeed = vi.fn();
  setVolume = vi.fn();
  setDirection = vi.fn();
}

vi.mock('lottie-web', () => ({
  default: MockLottiePlayer,
}));

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
}));
