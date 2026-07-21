import { useState } from "react";
import { Wallet, TrendingUp, Plus, ArrowLeft, Calculator } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Bankroll, SimulatorResult } from "../types";

interface BankrollManagerProps { onBack?: () => void; }

const PERCENTAGES = [1, 2, 3, 5, 7, 10];

export function BankrollManager({ onBack }: BankrollManagerProps) {
  const [tab, setTab] = useState<"wallets" | "reports" | "simulator">("wallets");
  const [bankrolls] = useState<Bankroll[]>([
    { id: "1", name: "Julho/2026", initialBalance: 10000, currentBalance: 10000, wins: 0, losses: 0, active: true, createdAt: new Date() },
  ]);
  const [percentage, setPercentage] = useState(5);
  const [days, setDays] = useState(31);

  const simulatorData: SimulatorResult[] = (() => {
    const data: SimulatorResult[] = [];
    let balance = 10000, accumulated = 0;
    for (let i = 1; i <= days; i++) {
      const target = balance * (percentage / 100);
      balance += target;
      accumulated += target;
      data.push({ day: i, balance, target, accumulated });
    }
    return data;
  })();

  const totalBalance = bankrolls.reduce((acc, b) => acc + b.currentBalance, 0);
  const totalWins = bankrolls.reduce((acc, b) => acc + b.wins, 0);
  const totalLosses = bankrolls.reduce((acc, b) => acc + b.losses, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card border border-border-default text-text-secondary hover:text-text-primary text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Gestão de Banca</h2>
          <p className="text-xs text-text-muted">Tudo salvo localmente</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{ id: "wallets", label: "Carteiras", icon: Wallet }, { id: "reports", label: "Relatórios", icon: TrendingUp }, { id: "simulator", label: "Simulador", icon: Calculator }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              tab === t.id ? "bg-bg-tertiary border-border-hover text-text-primary" : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "wallets" && (
        <>
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Saldo consolidado</div>
                <div className="text-4xl font-bold text-text-primary mt-1">{totalBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                <div className="text-sm text-text-muted mt-1">+R$ 0,00 (+0,00%)</div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="px-4 py-3 rounded-xl bg-bg-card border border-border-default text-center">
                  <div className="text-[10px] text-text-muted uppercase">Ativas</div>
                  <div className="text-xl font-bold text-text-primary">{bankrolls.filter((b) => b.active).length}</div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-bg-card border border-border-default text-center">
                  <div className="text-[10px] text-text-muted uppercase">Arquivadas</div>
                  <div className="text-xl font-bold text-text-primary">{bankrolls.filter((b) => !b.active).length}</div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-[10px] text-emerald-400 uppercase">Wins</div>
                  <div className="text-xl font-bold text-emerald-400">{totalWins}</div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <div className="text-[10px] text-red-400 uppercase">Losses</div>
                  <div className="text-xl font-bold text-red-400">{totalLosses}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-text-primary">Suas carteiras</h3>
            <div className="flex gap-2 flex-wrap">
              {["Ativas", "Arquivadas", "Todas"].map((f) => (
                <button key={f} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-card border border-border-default text-text-secondary hover:text-text-primary">{f}</button>
              ))}
              <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg btn-primary text-xs"><Plus className="w-4 h-4" /> Nova carteira</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankrolls.map((b) => (
              <div key={b.id} className="bg-gradient-to-br from-bg-card to-bg-secondary border border-border-default rounded-2xl p-5 hover:border-border-hover transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div><div className="font-bold text-text-primary">{b.name}</div><div className="text-[10px] text-text-muted uppercase">JUL/2026</div></div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400" />Ativa</div>
                </div>
                <div className="mb-4">
                  <div className="text-[10px] text-text-muted uppercase">Saldo atual</div>
                  <div className="text-2xl font-bold text-text-primary">{b.currentBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                  <div className="text-xs text-text-muted">+R$ 0,00 · +0,00%</div>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{b.wins} W · {b.losses} L</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "reports" && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-8 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-bold text-text-primary mb-2">Relatórios em breve</h3>
          <p className="text-sm text-text-muted">Acompanhe seu desempenho detalhado por dia, semana e mês.</p>
        </div>
      )}
      {tab === "simulator" && (
        <div className="space-y-6">
          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <div className="text-xs text-text-muted uppercase mb-3">Percentual diário</div>
            <div className="flex gap-2 mb-6 flex-wrap">
              {PERCENTAGES.map((p) => (
                <button key={p} onClick={() => setPercentage(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    percentage === p ? "bg-bg-tertiary border border-border-hover text-text-primary" : "bg-bg-secondary border border-border-default text-text-secondary hover:border-border-hover"
                  }`}>{p}%</button>
              ))}
            </div>
            <div className="text-xs text-text-muted uppercase mb-2">Período (dias)</div>
            <input type="number" value={days} onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value))))}
              className="w-full bg-bg-tertiary border border-border-default rounded-xl px-4 py-3 text-text-primary font-bold mb-6 focus:outline-none focus:border-accent-pink" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="text-[10px] text-text-muted uppercase">Banca final</div>
                <div className="text-xl font-bold text-emerald-400">{simulatorData[simulatorData.length - 1]?.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="text-[10px] text-text-muted uppercase">Lucro acumulado</div>
                <div className="text-xl font-bold text-text-primary">{simulatorData[simulatorData.length - 1]?.accumulated.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="text-[10px] text-text-muted uppercase">Multiplicador</div>
                <div className="text-xl font-bold text-amber-400">{((simulatorData[simulatorData.length - 1]?.balance || 10000) / 10000).toFixed(2)}x</div>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="text-[10px] text-text-muted uppercase">Meta do dia 1</div>
                <div className="text-xl font-bold text-text-primary">{simulatorData[0]?.target.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulatorData}>
                  <defs><linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="day" stroke="#737373" fontSize={12} />
                  <YAxis stroke="#737373" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #262626", borderRadius: "12px" }}
                    formatter={(value) => typeof value === "number" ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : value} />
                  <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary text-text-muted text-xs uppercase">
                <tr><th className="text-left p-3">Dia</th><th className="text-right p-3">Banca</th><th className="text-right p-3">Meta</th><th className="text-right p-3">Acumulado</th></tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {simulatorData.slice(0, 15).map((d) => (
                  <tr key={d.day} className="hover:bg-bg-tertiary/50">
                    <td className="p-3 text-text-primary font-medium">Dia {d.day}</td>
                    <td className="p-3 text-right text-text-primary">{d.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="p-3 text-right text-emerald-400">{d.target.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="p-3 text-right text-text-secondary">{d.accumulated.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
