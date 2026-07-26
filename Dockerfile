FROM python:3.11-slim

WORKDIR /app

# Instalar Node.js para build do frontend
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências primeiro (melhor caching)
COPY package*.json ./
COPY requirements.txt ./

# Instalar dependências Python e Node
RUN pip install --no-cache-dir -r requirements.txt
RUN npm install

# Copiar o resto do código
COPY . .

# Build do frontend
RUN npm run build

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["python3", "api_server.py"]
