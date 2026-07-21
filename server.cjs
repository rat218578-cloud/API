const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Proxy para login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('📤 Proxy login:', req.body.login);
    
    const response = await fetch('https://sortenabet.bet.br/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log('📥 Status:', response.status);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para jogos
app.get('/api/start-game-v2', async (req, res) => {
  try {
    const { slug, platform, use_demo, source } = req.query;
    const authHeader = req.headers.authorization;
    
    const response = await fetch(
      `https://sortenabet.bet.br/api/start-game-v2?slug=${slug}&platform=${platform || 'WEB'}&use_demo=${use_demo || 0}&source=${source || 'watchIsAuthenticated'}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        }
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para roleta
app.get('/api/roulette/history', async (req, res) => {
  try {
    const { slug, limit } = req.query;
    const authHeader = req.headers.authorization;
    
    const response = await fetch(
      `https://sortenabet.bet.br/api/roulette/history?slug=${slug}&limit=${limit || 50}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        }
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.send('healthy');
});

// Servir arquivos estáticos
app.use(express.static('dist'));

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Proxy rodando na porta ${PORT}`);
});
