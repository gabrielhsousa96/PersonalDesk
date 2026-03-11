FROM python:3.11-slim

# Definir o diretório de trabalho
WORKDIR /app

# Copiar apenas os arquivos de dependência primeiro (para usar o cache do Docker)
COPY requirements.txt .

# Instalar dependências (incluindo dependências do sistema para psycopg2)
RUN apt-get update && apt-get install -y libpq-dev gcc \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copiar todo o código fonte para dentro do container
COPY . .

# Expor a porta 8080 que o Google Cloud Run exige
EXPOSE 8080

# Comando para iniciar o servidor, lendo a porta dinâmica ou 8080 como fallback
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
