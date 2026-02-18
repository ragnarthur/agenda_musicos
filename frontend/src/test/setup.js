import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';
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
  constructor() {
    Object.defineProperty(this, 'observe', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'disconnect', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'unobserve', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  }
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
  constructor() {
    Object.defineProperty(this, 'destroy', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'play', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'pause', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'stop', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'setSpeed', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'setVolume', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(this, 'setDirection', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  }
}
vi.mock('lottie-web', () => ({
  default: MockLottiePlayer,
}));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
}));
