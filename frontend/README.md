# Agenda Musicos - Frontend

Interface moderna para o sistema GigFlow de gerenciamento de agenda para musicos.

## Instalacao

```bash
npm install
npm run dev
```

## Backend

Certifique-se de que o backend Django esta rodando em http://localhost:8000

## Tecnologias

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS 3
- React Router v6
- SWR (data fetching)
- Framer Motion (animacoes)
- React Hook Form
- Lucide (icones)
- PWA (vite-plugin-pwa)

## Padrao Visual Atual

- Portal Cultural Premium em layout magazine: `HeroCard` + grid de cards
- Fallback visual por categoria quando nao ha imagem (gradientes tematicos)
- Suporte a `thumbnail_url` em `PortalItem` para capa de noticia/edital
- Curadoria admin com pre-visualizacao e preenchimento por metadados Open Graph

## Scripts

```bash
npm run dev          # Desenvolvimento (hot reload)
npm run build        # Build de producao
npm run preview      # Preview do build
npm run lint         # ESLint
npm run lint:fix     # ESLint com auto-fix
npm run format       # Prettier
npm run test         # Testes (watch)
npm run test:ci      # Testes (CI)
npm run test:coverage # Cobertura
```
