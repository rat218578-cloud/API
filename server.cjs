const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Servidor iniciando na porta ' + PORT);
console.log('📡 Proxy para Python na porta 5000');

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================
// PROXY PARA O PYTHON (api_server.py)
// ============================================
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('❌ Proxy Error:', err.message);
    res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}));

// ============================================
// FRONTEND REACT
// ============================================
const distPath = path.join(__dirname, 'dist');
console.log('📁 Servindo arquivos de:', distPath);

app.use(express.static(distPath));

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error('❌ Erro ao servir index.html:', err);
      res.status(500).send('Erro ao carregar o app');
    }
  });
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', port: PORT });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📡 Proxy para API: http://localhost:5000`);
});

// Tratamento de erros
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});
