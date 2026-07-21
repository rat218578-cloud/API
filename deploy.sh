#!/bin/bash

echo "🚀 Iniciando deploy..."

git pull origin main

npm install

npm run build

sudo cp -r dist/* /var/www/qa-ai-app/

pm2 restart qa-ai-app

echo "✅ Deploy concluído!"
