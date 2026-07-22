const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Servidor iniciando...');
console.log('📡 Proxy para Python na porta 5000');

app.use(cors());

// Proxy para o Python
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  logLevel: 'debug'
}));

// Frontend
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});
