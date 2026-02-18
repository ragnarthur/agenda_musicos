import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { act } from 'react';
import ScrollToTop from '../../../components/routing/ScrollToTop';

function Page({ label }: { label: string }) {
  return (
    <div>
      <h1>{label}</h1>
      <Link to="/b">Go B</Link>
    </div>
  );
}

describe('ScrollToTop', () => {
  it('scrolls to top when route changes', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo');

    const { getByText } = render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <Routes>
          <Route path="/a" element={<Page label="A" />} />
          <Route path="/b" element={<div>B</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('A')).toBeInTheDocument();

    scrollToSpy.mockClear();

    await act(async () => {
      getByText('Go B').click();
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});
