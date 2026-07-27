#!/usr/bin/env python3
"""
🔑 PEGA EVOSESSIONID DA ROLETA ABERTA
"""
import requests
import json
import re

API_BASE = "https://sortenabet.bet.br"
EMAIL = "gcriste268@gmail.com"
PASSWORD = "284050"

def get_game_url_from_api():
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    login_data = {
        "login": EMAIL,
        "email": EMAIL,
        "password": PASSWORD,
        "app_source": "web"
    }
    
    try:
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=10)
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            if token:
                session.headers.update({'Authorization': f'Bearer {token}'})
                response = session.get(
                    f'{API_BASE}/api/start-game-v2',
                    params={
                        'slug': 'evolution/immersive-roulette',
                        'platform': 'WEB',
                        'use_demo': 0,
                        'source': 'watchIsAuthenticated'
                    },
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    game_url = data.get('iframe_url') or data.get('gameURL')
                    if game_url:
                        match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                        if match:
                            return match.group(1)
    except:
        pass
    return None

def main():
    print("=" * 60)
    print("🔑 PEGANDO EVOSESSIONID")
    print("=" * 60)
    evo_id = get_game_url_from_api()
    if evo_id:
        print(f"\n✅ EVOSESSIONID: {evo_id}")
        print(f"\n🚀 RODE: python3 live_roulette_debug.py {evo_id}")
    else:
        print("\n❌ Não foi possível obter o EVOSESSIONID")

if __name__ == "__main__":
    main()
