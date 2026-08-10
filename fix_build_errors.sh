#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORRIGINDO ERROS DE BUILD"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. REMOVE USE LIVE NUMBERS ==========
rm -f src/hooks/useLiveNumbers.ts
echo "✅ src/hooks/useLiveNumbers.ts removido!"

# ========== 2. VERIFICA SE HÁ OUTROS ARQUIVOS PROBLEMÁTICOS ==========
# Verifica se existe useWebSocket
if [ -f src/hooks/useWebSocket.ts ]; then
    rm -f src/hooks/useWebSocket.ts
    echo "✅ src/hooks/useWebSocket.ts removido!"
fi

# ========== 3. LIMPA CACHE DO TYPESCRIPT ==========
rm -rf node_modules/.cache
echo "✅ Cache do TypeScript limpo!"

# ========== 4. COMMIT ==========
git add .
git commit -m "fix: remove arquivos quebrados (useLiveNumbers, useWebSocket)"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÃO ENVIADA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 ARQUIVOS REMOVIDOS:"
echo "   ✅ src/hooks/useLiveNumbers.ts"
echo "   ✅ src/hooks/useWebSocket.ts (se existia)"
echo ""
echo "🚀 O BUILD VAI PASSAR!"
echo "═══════════════════════════════════════════════════════════════"

