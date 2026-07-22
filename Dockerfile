FROM python:3.11-slim

WORKDIR /app

# Instalar Node.js para build do frontend
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copiar arquivos
COPY package*.json ./
COPY requirements.txt ./

# Instalar dependências Python e Node
RUN pip install flask flask-cors requests
RUN npm install

# Copiar o resto
COPY . .

# Build do frontend
RUN npm run build

# Expor porta
EXPOSE 8080

# Comando para iniciar
CMD ["python3", "api_server.py"]
