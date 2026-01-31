import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from '../Login';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginMock = vi.fn();
const setSessionMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    setSession: setSessionMock,
  }),
}));

vi.mock('../../utils/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/publicApi', () => ({
  googleAuthService: {
    authenticate: vi.fn(),
  },
}));

vi.mock('../../components/ui/OwlMascot', () => ({
  default: () => <div data-testid="owl-mascot" />,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Login page', () => {
  beforeEach(() => {
    loginMock.mockReset();
    setSessionMock.mockReset();
    navigateMock.mockReset();
  });

  it('faz login e redireciona para o dashboard', async () => {
    loginMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'joao' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({ username: 'joao', password: 'senha123' })
    );
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('exibe mensagem de erro ao receber 401', async () => {
    loginMock.mockRejectedValue({ response: { status: 401 } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'joao' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Usuário ou senha incorretos')).toBeInTheDocument();
  });
});
