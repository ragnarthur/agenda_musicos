# Instalação do Docker e Docker Compose no Servidor

## Situação Atual

O comando `docker-compose` não está disponível no servidor.

## Opções de Instalação

### Opção 1: Docker Compose Plugin (Recomendado) ✅

Esta é a versão moderna do Docker Compose que vem integrada ao Docker Engine.

**Comando**: `docker compose` (sem hífen)

#### Passo 1: Verificar se Docker está instalado

```bash
docker --version
```

Se não estiver instalado, instalar Docker Engine primeiro:

```bash
# Atualizar índice de pacotes
sudo apt-get update

# Instalar dependências
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Adicionar chave GPG oficial do Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Configurar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Atualizar índice novamente
sudo apt-get update

# Instalar Docker Engine, containerd e Docker Compose
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### Passo 2: Verificar instalação

```bash
docker --version
docker compose version  # Sem hífen!
```

**Output esperado**:
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

#### Passo 3: Adicionar usuário ao grupo docker (opcional, para não usar sudo)

```bash
sudo usermod -aG docker $USER
```

**IMPORTANTE**: Fazer logout e login novamente para aplicar.

#### Passo 4: Testar

```bash
docker ps
docker compose version
```

---

### Opção 2: Docker Compose Standalone (Legado)

Se preferir a versão antiga standalone:

```bash
# Instalar via apt
sudo apt-get update
sudo apt-get install -y docker-compose

# Verificar
docker-compose --version  # Com hífen
```

**Desvantagens**:
- Versão mais antiga (1.29.2)
- Menos features
- Não é a versão mantida ativamente

---

## 🚀 Deploy no Servidor

### Com Docker Compose Plugin (v2 - Recomendado)

```bash
cd /opt/agenda-musicos/agenda_musicos

# Build
docker compose -f docker-compose.prod.yml build

# Subir serviços
docker compose -f docker-compose.prod.yml up -d

# Ver status
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f
```

**Nota**: Usar `docker compose` (com espaço, sem hífen).

### Com Docker Compose Standalone (v1 - Legado)

```bash
cd /opt/agenda-musicos/agenda_musicos

# Build
docker-compose -f docker-compose.prod.yml build

# Subir serviços
docker-compose -f docker-compose.prod.yml up -d

# Ver status
docker-compose -f docker-compose.prod.yml ps
```

**Nota**: Usar `docker-compose` (com hífen).

---

## 📋 Checklist de Instalação

- [ ] Docker Engine instalado (`docker --version`)
- [ ] Docker Compose instalado (`docker compose version` ou `docker-compose --version`)
- [ ] Usuário no grupo docker (opcional, para evitar sudo)
- [ ] Docker daemon rodando (`sudo systemctl status docker`)
- [ ] Teste básico funcionando (`docker ps`)

---

## 🔍 Troubleshooting

### Erro: "permission denied while trying to connect to Docker daemon"

**Solução 1**: Adicionar usuário ao grupo docker
```bash
sudo usermod -aG docker $USER
# Logout e login novamente
```

**Solução 2**: Usar sudo temporariamente
```bash
sudo docker compose -f docker-compose.prod.yml up -d
```

### Erro: "Cannot connect to the Docker daemon"

Docker daemon não está rodando:
```bash
# Verificar status
sudo systemctl status docker

# Iniciar Docker
sudo systemctl start docker

# Habilitar no boot
sudo systemctl enable docker
```

### Erro: "docker: command not found"

Docker não está instalado. Seguir Passo 1 da Opção 1.

---

## 🎯 Comando Completo de Instalação Rápida

Para instalar Docker + Docker Compose Plugin de uma vez:

```bash
# Atualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar dependências
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Adicionar repositório Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verificar
docker --version
docker compose version

echo "✅ Docker e Docker Compose instalados com sucesso!"
echo "⚠️  Faça logout e login novamente para usar docker sem sudo"
```

---

## 📦 Depois da Instalação

### 1. Fazer Deploy

```bash
cd /opt/agenda-musicos/agenda_musicos

# Se instalou Docker Compose Plugin (v2)
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# OU se instalou standalone (v1)
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Verificar

```bash
# Ver containers rodando
docker ps

# Ver logs do backend (migrations)
docker compose -f docker-compose.prod.yml logs backend | grep migrate

# Ver logs de todos os serviços
docker compose -f docker-compose.prod.yml logs -f
```

### 3. Status dos Serviços

```bash
docker compose -f docker-compose.prod.yml ps
```

**Esperado**:
```
NAME                              STATUS
agenda_musicos-db-1               Up (healthy)
agenda_musicos-backend-1          Up
agenda_musicos-frontend-1         Up
agenda_musicos-payment-service-1  Up
agenda_musicos-nginx-1            Up
```

---

## ✅ Recomendação

**Instale a Opção 1 (Docker Compose Plugin)** que é a versão moderna e mantida pelo Docker.

**Comando único**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Depois fazer logout/login e executar:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 📚 Referências

- [Docker Engine Install](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose V2](https://docs.docker.com/compose/cli-command/)
