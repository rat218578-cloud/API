const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== DOMÍNIO DA API =====
const API_BASE = 'https://api-sortenabet-betbr.bs2bet.com';

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
    const response = await fetch(`${API_BASE}/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(req.body)
    });
    
    const text = await response.text();
    console.log('📥 Status:', response.status);
    console.log('📄 Resposta:', text.substring(0, 200));
    
    try {
      const data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch {
      // Se não for JSON, retorna como está
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========== START-GAME ==========
app.get('/api/start-game-v2', async (req, res) => {
  try {
    const { slug, platform, use_demo, source } = req.query;
    const authHeader = req.headers.authorization;
    
    console.log('🎮 Iniciando jogo:', slug);
    console.log('🔑 Auth:', authHeader ? '✅ Presente' : '❌ Ausente');
    
    // TENTA DIFERENTES ENDPOINTS
    const endpoints = [
      `${API_BASE}/v2/start-game?slug=${slug}&platform=${platform || 'WEB'}&use_demo=${use_demo || 0}&source=${source || 'watchIsAuthenticated'}`,
      `${API_BASE}/api/start-game-v2?slug=${slug}&platform=${platform || 'WEB'}&use_demo=${use_demo || 0}&source=${source || 'watchIsAuthenticated'}`,
      `https://sortenabet.bet.br/api/start-game-v2?slug=${slug}&platform=${platform || 'WEB'}&use_demo=${use_demo || 0}&source=${source || 'watchIsAuthenticated'}`
    ];
    
    let lastError = null;
    
    for (const targetUrl of endpoints) {
      try {
        console.log(`📤 Tentando: ${targetUrl}`);
        
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...(authHeader && { 'Authorization': authHeader })
          }
        });
        
        const text = await response.text();
        console.log(`📥 Status: ${response.status}`);
        console.log(`📄 Resposta: ${text.substring(0, 200)}`);
        
        // Se status for 200, tenta parsear JSON
        if (response.status === 200) {
          try {
            const data = JSON.parse(text);
            if (data.gameURL || data.iframe_url) {
              console.log('✅ URL encontrada!');
              return res.status(200).json(data);
            }
          } catch {
            // Não é JSON, continua tentando
          }
        }
      } catch (err) {
        lastError = err;
        console.log(`❌ Falha no endpoint: ${err.message}`);
      }
    }
    
    // Se chegou aqui, nenhum endpoint funcionou
    console.log('❌ Todos os endpoints falharam');
    return res.status(404).json({ 
      error: 'Nenhum endpoint retornou uma URL válida',
      details: lastError?.message || 'Erro desconhecido'
    });
    
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
    
    const endpoints = [
      `${API_BASE}/v2/roulette/history?slug=${slug}&limit=${limit || 50}`,
      `${API_BASE}/api/roulette/history?slug=${slug}&limit=${limit || 50}`,
      `https://sortenabet.bet.br/api/roulette/history?slug=${slug}&limit=${limit || 50}`
    ];
    
    for (const targetUrl of endpoints) {
      try {
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(authHeader && { 'Authorization': authHeader })
          }
        });
        
        if (response.status === 200) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            if (data.spins) {
              return res.status(200).json(data);
            }
          } catch {
            // Não é JSON, continua
          }
        }
      } catch (err) {
        console.log(`❌ Falha: ${err.message}`);
      }
    }
    
    // Retorna dados simulados se nada funcionar
    return res.status(200).json({
      spins: Array.from({ length: 30 }, () => ({
        number: Math.floor(Math.random() * 37),
        color: ['red', 'black', 'green'][Math.floor(Math.random() * 3)],
        timestamp: new Date().toISOString(),
        roundId: `sim_${Date.now()}`
      })),
      total: 30,
      room: slug || 'brasileira'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  console.log(`📡 API Base: ${API_BASE}`);
});
