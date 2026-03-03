import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MusicianRequestPage from '@/pages/MusicianRequest';

function renderPage() {
  return render(
    <MemoryRouter>
      <MusicianRequestPage />
    </MemoryRouter>
  );
}

/** Preenche os campos mínimos do passo 1 e clica em "Continuar". */
async function advanceToStep2() {
  fireEvent.change(screen.getByPlaceholderText('Seu nome completo'), {
    target: { value: 'João Silva' },
  });
  fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
    target: { value: 'joao@teste.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
    target: { value: '11999999999' },
  });
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  await waitFor(() =>
    expect(screen.getByPlaceholderText('Ex: Guitarra, Vocal, Bateria...')).toBeInTheDocument()
  );
}

/** Preenche instrumento + gênero e avança ao passo 3. */
async function advanceToStep3(artistType: 'solo' | 'dupla' | 'banda' = 'solo') {
  // Se for dupla/banda, selecionar antes de avançar (ainda no passo 1)
  if (artistType !== 'solo') {
    const label = artistType === 'dupla' ? 'Dupla' : 'Banda';
    fireEvent.click(screen.getByText(label).closest('button')!);
  }

  await advanceToStep2();

  // Passo 2: instrumento
  fireEvent.change(screen.getByPlaceholderText('Ex: Guitarra, Vocal, Bateria...'), {
    target: { value: 'Guitarra' },
  });

  // Passo 2: pelo menos 1 gênero — clica no primeiro pill disponível
  const allButtons = screen.getAllByRole('button');
  const firstGenrePill = allButtons.find(
    btn =>
      btn.textContent &&
      !btn.textContent.match(/continuar|voltar|enviar|adicionar/i) &&
      btn.getAttribute('type') === 'button'
  );
  if (firstGenrePill) fireEvent.click(firstGenrePill);

  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  await waitFor(() => expect(screen.getByPlaceholderText('Sua cidade')).toBeInTheDocument());
}

describe('MusicianRequest Page — Wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => renderPage()).not.toThrow();
  });

  it('shows the 3-step stepper', () => {
    renderPage();
    expect(screen.getAllByText('Identidade').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sua Música').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Detalhes').length).toBeGreaterThan(0);
  });

  it('renders the artist type selector on step 1', () => {
    renderPage();
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('Dupla')).toBeInTheDocument();
    expect(screen.getByText('Banda')).toBeInTheDocument();
  });

  it('solo is selected by default (card has selected classes)', () => {
    renderPage();
    const soloBtn = screen.getByText('Solo').closest('button');
    expect(soloBtn).toHaveClass('border-indigo-600');
    expect(soloBtn).toHaveClass('bg-indigo-50');
  });

  it('step 1 shows nome, email and telefone fields', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(00) 00000-0000')).toBeInTheDocument();
  });

  it('step 1 does NOT show formation fields', () => {
    renderPage();
    expect(screen.queryByText(/Nome Artístico da Formação/)).not.toBeInTheDocument();
    expect(screen.queryByText('Integrantes adicionais')).not.toBeInTheDocument();
  });

  it('selecting dupla changes card selection', () => {
    renderPage();
    fireEvent.click(screen.getByText('Dupla').closest('button')!);
    const dupBtn = screen.getByText('Dupla').closest('button');
    expect(dupBtn).toHaveClass('border-indigo-600');
    const soloBtn = screen.getByText('Solo').closest('button');
    expect(soloBtn).not.toHaveClass('border-indigo-600');
  });

  it('selecting banda changes card selection', () => {
    renderPage();
    fireEvent.click(screen.getByText('Banda').closest('button')!);
    const bandBtn = screen.getByText('Banda').closest('button');
    expect(bandBtn).toHaveClass('border-indigo-600');
  });

  it('step 2 shows instrumento and gêneros fields after advancing', async () => {
    renderPage();
    await advanceToStep2();
    expect(screen.getByPlaceholderText('Ex: Guitarra, Vocal, Bateria...')).toBeInTheDocument();
  });

  it('step 2 shows genre error when no genre selected and trying to advance', async () => {
    renderPage();
    await advanceToStep2();
    // Preenche instrumento mas NÃO seleciona gênero
    fireEvent.change(screen.getByPlaceholderText('Ex: Guitarra, Vocal, Bateria...'), {
      target: { value: 'Bateria' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    await waitFor(() =>
      expect(screen.getByText(/selecione pelo menos 1 gênero musical/i)).toBeInTheDocument()
    );
  });

  it('step 3 (solo) shows cidade and estado fields', async () => {
    renderPage();
    await advanceToStep3('solo');
    expect(screen.getByPlaceholderText('Sua cidade')).toBeInTheDocument();
  });

  it('step 3 (solo) does NOT show stage name or formation fields', async () => {
    renderPage();
    await advanceToStep3('solo');
    expect(screen.queryByText(/Nome Artístico da Formação/)).not.toBeInTheDocument();
    expect(screen.queryByText('Integrantes adicionais')).not.toBeInTheDocument();
  });

  it('step 3 (dupla) shows stage name field', async () => {
    renderPage();
    await advanceToStep3('dupla');
    expect(screen.getByText(/Nome Artístico da Formação/)).toBeInTheDocument();
  });

  it('step 3 (dupla) shows formation members section', async () => {
    renderPage();
    await advanceToStep3('dupla');
    expect(screen.getByText('Integrantes adicionais')).toBeInTheDocument();
  });

  it('step 3 (dupla) does NOT show add member button', async () => {
    renderPage();
    await advanceToStep3('dupla');
    expect(screen.queryByRole('button', { name: /adicionar/i })).not.toBeInTheDocument();
  });

  it('step 3 (banda) shows stage name field', async () => {
    renderPage();
    await advanceToStep3('banda');
    expect(screen.getByText(/Nome Artístico da Formação/)).toBeInTheDocument();
  });

  it('step 3 (banda) shows add member button', async () => {
    renderPage();
    await advanceToStep3('banda');
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('step 3 (banda) shows at least two member forms', async () => {
    renderPage();
    await advanceToStep3('banda');
    const memberLabels = screen.getAllByText(/Integrante \d+/);
    expect(memberLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('clicking add member button increases member count for banda', async () => {
    renderPage();
    await advanceToStep3('banda');
    const before = screen.getAllByText(/Integrante \d+/).length;
    fireEvent.click(screen.getByText('Adicionar'));
    await waitFor(() => {
      const after = screen.getAllByText(/Integrante \d+/).length;
      expect(after).toBe(before + 1);
    });
  });

  it('back button on step 2 returns to step 1', async () => {
    renderPage();
    await advanceToStep2();
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument()
    );
  });
});
