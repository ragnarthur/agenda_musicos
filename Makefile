.PHONY: help format format-check lint test test-coverage install-dev ci

help:
	@echo "Comandos disponíveis:"
	@echo "  make format        - Formata código Python com Black e isort"
	@echo "  make format-check  - Verifica se código está formatado"
	@echo "  make lint          - Roda flake8 para verificar estilo"
	@echo "  make test          - Roda testes do Django"
	@echo "  make test-coverage - Roda testes com cobertura"
	@echo "  make install-dev   - Instala dependências de desenvolvimento"
	@echo "  make ci            - Roda todas as verificações (format, lint, test)"

format:
	@echo "🎨 Formatando código Python..."
	black .
	isort .

format-check:
	@echo "🔍 Verificando formatação..."
	black --check .
	isort --check-only .

lint:
	@echo "🔎 Verificando estilo com flake8..."
	flake8 .

test:
	@echo "🧪 Rodando testes..."
	python manage.py test

test-coverage:
	@echo "📊 Rodando testes com cobertura..."
	coverage run --source='.' manage.py test
	coverage report
	coverage html

install-dev:
	@echo "📦 Instalando dependências de desenvolvimento..."
	pip install -r requirements.txt

ci: format-check lint test
	@echo "✅ Todas as verificações passaram!"
