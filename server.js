import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Log para debug
console.log('🚀 Iniciando servidor...');
console.log(`📁 Diretório atual: ${__dirname}`);
console.log(`📁 Dist path: ${path.join(__dirname, 'dist')}`);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'dist'), {
  index: 'index.html',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Healthcheck - DEVE SER A PRIMEIRA ROTA
app.get('/health', (req, res) => {
  console.log('✅ Healthcheck OK');
  res.status(200).send('healthy');
});

// Rota raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Todas as outras rotas - SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando em http://0.0.0.0:${PORT}`);
});
