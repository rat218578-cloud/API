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

// ========== LOGIN ==========
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('📤 Login:', req.body.login || req.body.email);
    
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

// ========== START-GAME-V2 - IGUAL AO pragmatic_app.py ==========
app.get('/api/start-game-v2', async (req, res) => {
  try {
    const { slug, platform, use_demo, source } = req.query;
    const authHeader = req.headers.authorization;
    
    console.log('🎮 Iniciando jogo:', slug);
    console.log('🔑 Auth:', authHeader ? '✅ Presente' : '❌ Ausente');
    
    // === IGUAL AO pragmatic_app.py ===
    const targetUrl = `https://sortenabet.bet.br/api/start-game-v2?slug=${slug}&platform=${platform || 'WEB'}&use_demo=${use_demo || 0}&source=${source || 'watchIsAuthenticated'}`;
    console.log('📤 GET:', targetUrl);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        ...(authHeader && { 'Authorization': authHeader })
      }
    });
    
    console.log('📥 Status:', response.status);
    
    const data = await response.json();
    console.log('📦 Resposta:', JSON.stringify(data).substring(0, 500));
    
    // === MESMA LÓGICA DO pragmatic_app.py ===
    const gameUrl = data.iframe_url || data.gameURL || null;
    
    if (gameUrl) {
      console.log('✅ URL obtida para', slug);
    } else {
      console.log('⚠️ Sem URL para', slug);
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========== ROLETAS - HISTÓRICO ==========
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
    // Retorna dados simulados se falhar
    res.status(200).json({
      spins: Array.from({ length: 30 }, (_, i) => ({
        number: Math.floor(Math.random() * 37),
        color: ['red', 'black', 'green'][Math.floor(Math.random() * 3)],
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        roundId: `sim_${Date.now()}_${i}`
      })),
      total: 30,
      room: slug || 'brasileira'
    });
  }
});

// ========== HEALTH ==========
app.get('/health', (req, res) => res.send('healthy'));

// ========== FRONTEND ==========
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Usando API: https://sortenabet.bet.br`);
});
