import { RouletteSpin, RouletteHistoryResponse } from "../types";

const API_BASE = "https://sortenabet.bet.br";

class RouletteApiService {
private accessToken: string | null = null;

constructor() {
this.accessToken = localStorage.getItem('access_token');
}

private getHeaders(): HeadersInit {
const headers: HeadersInit = {
'Content-Type': 'application/json',
'Accept': 'application/json',
};

if (this.accessToken) {
  headers['Authorization'] = \`Bearer \${this.accessToken}\`;
}

return headers;
}

async getLiveRouletteHistory(roomId: string = "brasileira", limit: number = 50): Promise<RouletteHistoryResponse> {
try {
const roomSlugs: Record<string, string> = {
"brasileira": "evolution/brasileira",
"immersive": "evolution/immersive-roulette",
"lightning": "evolution/lightning-roulette",
};

const slug = roomSlugs[roomId] || roomSlugs["brasileira"];

const response = await fetch(
\`\${API_BASE}/api/roulette/history?slug=\${slug}&limit=\${limit}\`,
{
method: 'GET',
headers: this.getHeaders()
}
);

if (!response.ok) {
throw new Error(\`Erro ao buscar histórico: \${response.status}\`);
}

const data = await response.json();

return {
spins: data.spins || [],
total: data.total || 0,
room: data.room || roomId
};
} catch (error) {
console.error('Erro ao buscar histórico da roleta:', error);
return {
spins: [],
total: 0,
room: roomId
};
}
}

async getLastNumber(roomId: string = "brasileira"): Promise<number | null> {
try {
const history = await this.getLiveRouletteHistory(roomId, 1);
if (history.spins.length > 0) {
return history.spins[0].number;
}
return null;
} catch (error) {
console.error('Erro ao buscar último número:', error);
return null;
}
}

async getRealtimeNumbers(roomId: string = "brasileira", count: number = 10): Promise<number[]> {
try {
const history = await this.getLiveRouletteHistory(roomId, count);
return history.spins.map(spin => spin.number);
} catch (error) {
console.error('Erro ao buscar números em tempo real:', error);
return [];
}
}

isAuthenticated(): boolean {
return !!this.accessToken;
}

setToken(token: string) {
this.accessToken = token;
}
}

export const rouletteApi = new RouletteApiService();
