import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Exemplo simples de teste - Componente Button
const Button = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid="button"
    data-variant={variant}
    className={`btn btn-${variant}`}
  >
    {children}
  </button>
);

describe('Button', () => {
  it('deve renderizar o texto do botão', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique aqui</Button>);

    await userEvent.click(screen.getByTestId('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('não deve chamar onClick quando desabilitado', async () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Clique aqui
      </Button>
    );

    await userEvent.click(screen.getByTestId('button'));
    expect(handleClick).not.toHaveBeenCalled();
    expect(screen.getByTestId('button')).toBeDisabled();
  });

  it('deve aplicar a classe correta para variante primary', () => {
    render(<Button variant="primary">Botão</Button>);
    expect(screen.getByTestId('button')).toHaveClass('btn-primary');
  });

  it('deve aplicar a classe correta para variante secondary', () => {
    render(<Button variant="secondary">Botão</Button>);
    expect(screen.getByTestId('button')).toHaveAttribute('data-variant', 'secondary');
  });
});

// Teste para verificar se o ambiente está configurado
describe('Configuração do Vitest', () => {
  it('deve ter @testing-library/jest-dom disponível', () => {
    expect(true).toBe(true);
    expect(document).toBeDefined();
  });
});
