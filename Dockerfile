FROM node:22-alpine as builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Usa npm install (funciona mesmo sem lock file)
RUN npm install

# Copia o resto do projeto
COPY . .

# Build
RUN npm run build

# Estágio de produção
FROM nginx:alpine

# Copia os arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80
EXPOSE 80

# Inicia o nginx
CMD ["nginx", "-g", "daemon off;"]
