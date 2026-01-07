# Docker Desktop (Dev e Prod)

Este guia sobe o backend Django, frontend Vite e payment-service via Docker no desktop.

## Desenvolvimento (hot reload)

1) Subir os containers
```bash
docker compose -f docker-compose.dev.yml up --build
```

2) Acessos locais
- Frontend: http://localhost:5174
- Backend: http://localhost:8001
- Payment service: http://localhost:3002

## Producao (simulada no desktop)

1) Copiar envs de exemplo
```bash
cp .env.docker.example .env.docker
cp frontend/.env.docker.example frontend/.env.docker
cp payment-service/.env.docker.example payment-service/.env.docker
```

2) Ajustar `VITE_API_URL`
- Edite `frontend/.env.docker` e troque para o host desejado.

3) Subir os containers
```bash
docker compose -f docker-compose.prod.yml --env-file frontend/.env.docker up --build -d
```

4) Acessos locais
- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- Payment service: http://localhost:3001
