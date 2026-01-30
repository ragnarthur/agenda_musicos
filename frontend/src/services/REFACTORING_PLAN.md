# Refatoração de services/api.ts

## Estrutura Proposta

```
services/
├── api.ts                    # Configuração base (102 linhas) ✅
├── types.ts                  # Tipos compartilhados ✅
├── authService.ts            # Autenticação
├── musicianService.ts        # Músicos
├── eventService.ts           # Eventos
├── availabilityService.ts    # Disponibilidades
├── connectionService.ts      # Conexões
├── marketplaceService.ts     # Marketplace
├── index.ts                  # Exporta tudo
```

## Status da Refatoração

✅ **Concluído:**
- `api.ts` - Configuração base (reduzido de 772 para 102 linhas)
- `types.ts` - Tipos compartilhados

⏳ **Próximos passos:**
Extrair cada service do arquivo original para arquivos separados:

### 1. authService.ts (~30 linhas)
```typescript
export const authService = {
  login: (credentials: LoginCredentials) => 
    api.post('/token/', credentials),
  refresh: () => 
    api.post('/token/refresh/', {}),
  logout: () => 
    api.post('/logout/', {}),
};
```

### 2. musicianService.ts (~130 linhas)
```typescript
export const musicianService = {
  getAll: (page = 1, filters?: FilterParams) => 
    api.get(`/musicians/?page=${page}`),
  getById: (id: number) => 
    api.get(`/musicians/${id}/`),
  update: (id: number, data: MusicianUpdate) => 
    api.patch(`/musicians/${id}/`, data),
  // ... outros métodos
};
```

### 3. eventService.ts (~120 linhas)
```typescript
export const eventService = {
  getAll: (page = 1) => 
    api.get(`/events/?page=${page}`),
  create: (data: EventCreate) => 
    api.post('/events/', data),
  update: (id: number, data: EventUpdate) => 
    api.patch(`/events/${id}/`, data),
  // ... outros métodos
};
```

## Próxima Decisão

Como a refatoração completa envolve extrair muitos serviços e testar todos os imports no projeto, temos duas opções:

**Opção A:** Eu crio todos os arquivos de serviços agora (30 min)
- Criar auth, musician, event, availability, connection, marketplace services
- Criar index.ts com exports
- Atualizar imports no projeto

**Opção B:** Você aplica gradualmente
- Crio os arquivos mais críticos agora
- Você migra os imports aos poucos durante o desenvolvimento

**Qual prefere?**
