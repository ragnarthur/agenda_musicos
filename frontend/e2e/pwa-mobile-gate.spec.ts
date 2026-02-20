import { expect, test, type Page } from '@playwright/test';

const CRITICAL_ROUTES = ['/', '/app-start', '/login', '/musicos', '/eventos'] as const;
const ERROR_TEXT_MARKERS = ['connection timed out', 'error code 522', 'host error'];
const INSTRUMENT_ALIASES = ['violao', 'violonista', 'acoustic_guitar', 'acoustic guitar'] as const;
const BENIGN_ERROR_MARKERS = [
  'from accessing a frame with origin "https://accounts.google.com"',
  "can't access dead object",
  'due to access control checks',
];

const assertNoKnownOutageMarkers = async (route: string, page: Page) => {
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  for (const marker of ERROR_TEXT_MARKERS) {
    expect(bodyText, `Texto de falha detectado em ${route}: ${marker}`).not.toContain(marker);
  }
};

test.describe('PWA mobile release gate', () => {
  for (const route of CRITICAL_ROUTES) {
    test(`rota critica carrega em mobile: ${route}`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response, `Sem resposta ao abrir ${route}`).not.toBeNull();
      expect(response!.status(), `Status HTTP inesperado para ${route}`).toBeLessThan(400);

      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await assertNoKnownOutageMarkers(route, page);
      const relevantErrors = pageErrors.filter(error => {
        const normalized = error.toLowerCase();
        return !BENIGN_ERROR_MARKERS.some(marker => normalized.includes(marker));
      });
      expect(relevantErrors, `Erro de runtime JS em ${route}`).toEqual([]);
    });
  }

  test('deep link /musicos?instrument=bass carrega sem loop visivel', async ({ page }) => {
    const response = await page.goto('/musicos?instrument=bass', { waitUntil: 'domcontentloaded' });
    expect(response, 'Sem resposta no deep link de músicos').not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    const musiciansTitle = page.getByText(/Músicos profissionais|Musicos profissionais/i);
    const loginTitle = page.getByRole('heading', { name: /Entrar/i });
    const musiciansVisible = await musiciansTitle.isVisible().catch(() => false);
    const loginVisible = await loginTitle.isVisible().catch(() => false);
    expect(
      musiciansVisible || loginVisible,
      'Deep link precisa abrir em /musicos ou redirecionar para /login sem quebrar'
    ).toBeTruthy();
    await assertNoKnownOutageMarkers('/musicos?instrument=bass', page);
  });

  for (const alias of INSTRUMENT_ALIASES) {
    test(`alias "${alias}" carrega rota de músicos sem erro`, async ({ page }) => {
      const encodedAlias = encodeURIComponent(alias);
      const route = `/musicos?instrument=${encodedAlias}`;

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response, `Sem resposta ao abrir ${route}`).not.toBeNull();
      expect(response!.status(), `Status HTTP inesperado para ${route}`).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      const musiciansTitle = page.getByText(/Músicos profissionais|Musicos profissionais/i);
      const loginTitle = page.getByRole('heading', { name: /Entrar/i });
      const musiciansVisible = await musiciansTitle.isVisible().catch(() => false);
      const loginVisible = await loginTitle.isVisible().catch(() => false);
      expect(
        musiciansVisible || loginVisible,
        `Alias ${alias} precisa abrir em /musicos ou redirecionar para /login sem quebrar`
      ).toBeTruthy();
      await assertNoKnownOutageMarkers(route, page);
    });
  }

  test('offline fallback renderiza conteudo esperado', async ({ page }) => {
    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Você está offline|Voce esta offline/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Tentar novamente/i })).toBeVisible();
  });
});
