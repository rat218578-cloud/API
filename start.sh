#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 INICIANDO API - QA.AI"
echo "═══════════════════════════════════════════════════════════════"

# Instala dependências se necessário
pip install -r requirements.txt --no-cache-dir

# Inicia o servidor
python3 api_server.py
