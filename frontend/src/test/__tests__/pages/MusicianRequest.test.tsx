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

describe('MusicianRequest Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => renderPage()).not.toThrow();
  });

  it('renders the artist type selector', () => {
    renderPage();
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('Dupla')).toBeInTheDocument();
    expect(screen.getByText('Banda')).toBeInTheDocument();
  });

  it('solo is selected by default', () => {
    renderPage();
    const soloBtn = screen.getByText('Solo').closest('button');
    expect(soloBtn).toHaveClass('bg-indigo-600');
  });

  it('solo hides stage name and formation section', () => {
    renderPage();
    expect(screen.queryByText('Nome Artístico da Formação *')).not.toBeInTheDocument();
    expect(screen.queryByText('Integrantes adicionais')).not.toBeInTheDocument();
  });

  it('selecting dupla shows stage name field', () => {
    renderPage();
    fireEvent.click(screen.getByText('Dupla'));
    expect(screen.getByText('Nome Artístico da Formação *')).toBeInTheDocument();
  });

  it('selecting dupla shows formation members section', () => {
    renderPage();
    fireEvent.click(screen.getByText('Dupla'));
    expect(screen.getByText('Integrantes adicionais')).toBeInTheDocument();
  });

  it('dupla does NOT show add member button', () => {
    renderPage();
    fireEvent.click(screen.getByText('Dupla'));
    expect(screen.queryByText('Adicionar')).not.toBeInTheDocument();
  });

  it('selecting banda shows stage name field', () => {
    renderPage();
    fireEvent.click(screen.getByText('Banda'));
    expect(screen.getByText('Nome Artístico da Formação *')).toBeInTheDocument();
  });

  it('selecting banda shows add member button', () => {
    renderPage();
    fireEvent.click(screen.getByText('Banda'));
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('selecting banda shows at least two member forms', () => {
    renderPage();
    fireEvent.click(screen.getByText('Banda'));
    // Each member form has "Integrante N" label
    const memberLabels = screen.getAllByText(/Integrante \d+/);
    expect(memberLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('clicking add member button increases member count for banda', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Banda'));

    const before = screen.getAllByText(/Integrante \d+/).length;
    fireEvent.click(screen.getByText('Adicionar'));

    await waitFor(() => {
      const after = screen.getAllByText(/Integrante \d+/).length;
      expect(after).toBe(before + 1);
    });
  });

  it('switching back to solo hides formation section', () => {
    renderPage();
    fireEvent.click(screen.getByText('Dupla'));
    expect(screen.getByText('Integrantes adicionais')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Solo'));
    expect(screen.queryByText('Integrantes adicionais')).not.toBeInTheDocument();
    expect(screen.queryByText('Nome Artístico da Formação *')).not.toBeInTheDocument();
  });
});
