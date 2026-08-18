// src/components/StrategiesG1.tsx
// ESTRATÉGIAS G1 - CORES CORRETAS
// 🔴 VERMELHO = CASA (C)
// 🔵 AZUL = VISITANTE (V)
// 🟡 AMARELO = EMPATE (E)

export const strategiesG1 = [
  // ========== 1. ESTRATÉGIA 1-2-1 ==========
  // 🔴 → 🔵🔵 → 🔴 (CASA → 2 VISITANTE → CASA)
  {
    id: 'g1_1',
    name: '1-2-1',
    pattern: ['C', 'V', 'V', 'C'],
    next: 'C',
    size: 4,
    desc: '🔴 → 🔵🔵 → 🔴 (CASA → 2 VISITANTE → CASA)'
  },
  // 🔵 → 🔴🔴 → 🔵 (VISITANTE → 2 CASA → VISITANTE)
  {
    id: 'g1_2',
    name: '1-2-1 Inverso',
    pattern: ['V', 'C', 'C', 'V'],
    next: 'V',
    size: 4,
    desc: '🔵 → 🔴🔴 → 🔵 (VISITANTE → 2 CASA → VISITANTE)'
  },

  // ========== 2. ESTRATÉGIA 1-3-1 ==========
  // 🔴 → 🔵🔵🔵 → 🔴 (CASA → 3 VISITANTE → CASA)
  {
    id: 'g1_3',
    name: '1-3-1',
    pattern: ['C', 'V', 'V', 'V', 'C'],
    next: 'C',
    size: 5,
    desc: '🔴 → 🔵🔵🔵 → 🔴 (CASA → 3 VISITANTE → CASA)'
  },
  // 🔵 → 🔴🔴🔴 → 🔵 (VISITANTE → 3 CASA → VISITANTE)
  {
    id: 'g1_4',
    name: '1-3-1 Inverso',
    pattern: ['V', 'C', 'C', 'C', 'V'],
    next: 'V',
    size: 5,
    desc: '🔵 → 🔴🔴🔴 → 🔵 (VISITANTE → 3 CASA → VISITANTE)'
  },

  // ========== 3. ESTRATÉGIA DE ALTERNÂNCIA ==========
  // 🔴 → 🔵 → 🔴 (CASA → VISITANTE → CASA)
  {
    id: 'g1_5',
    name: 'Alternância C-V',
    pattern: ['C', 'V', 'C'],
    next: 'C',
    size: 3,
    desc: '🔴 → 🔵 → 🔴 (CASA → VISITANTE → CASA)'
  },
  // 🔵 → 🔴 → 🔵 (VISITANTE → CASA → VISITANTE)
  {
    id: 'g1_6',
    name: 'Alternância V-C',
    pattern: ['V', 'C', 'V'],
    next: 'V',
    size: 3,
    desc: '🔵 → 🔴 → 🔵 (VISITANTE → CASA → VISITANTE)'
  },

  // ========== 4. PREDOMINÂNCIA VERMELHA ==========
  // 🔴 → 🔵🔵🔵🔵 (CASA → 4 VISITANTE)
  {
    id: 'g1_7',
    name: 'Predominância Vermelha',
    pattern: ['C', 'V', 'V', 'V', 'V'],
    next: 'V',
    size: 5,
    desc: '🔴 → 4🔵 (CASA → 4 VISITANTE)'
  },
  // 🔴 → 🔵🔵🔵 (CASA → 3 VISITANTE)
  {
    id: 'g1_7b',
    name: 'Predominância Vermelha (3)',
    pattern: ['C', 'V', 'V', 'V'],
    next: 'V',
    size: 4,
    desc: '🔴 → 3🔵 (CASA → 3 VISITANTE)'
  },

  // ========== 5. PREDOMINÂNCIA AZUL ==========
  // 🔵 → 🔴🔴🔴🔴 (VISITANTE → 4 CASA)
  {
    id: 'g1_8',
    name: 'Predominância Azul',
    pattern: ['V', 'C', 'C', 'C', 'C'],
    next: 'C',
    size: 5,
    desc: '🔵 → 4🔴 (VISITANTE → 4 CASA)'
  },
  // 🔵 → 🔴🔴🔴 (VISITANTE → 3 CASA)
  {
    id: 'g1_8b',
    name: 'Predominância Azul (3)',
    pattern: ['V', 'C', 'C', 'C'],
    next: 'C',
    size: 4,
    desc: '🔵 → 3🔴 (VISITANTE → 3 CASA)'
  },

  // ========== 6. COR DO SURF PÓS QUEBRA ==========
  // 🔵🔵🔵🔵 🔴 🔵 (4 VISITANTE → CASA → VISITANTE)
  {
    id: 'g1_9',
    name: 'Cor do surf - Vermelha',
    pattern: ['V', 'V', 'V', 'V', 'C', 'V'],
    next: 'V',
    size: 6,
    desc: '4🔵 → 🔴 → 🔵 (4 VISITANTE → CASA → VISITANTE)'
  },
  // 🔴🔴🔴🔴 🔵 🔴 (4 CASA → VISITANTE → CASA)
  {
    id: 'g1_10',
    name: 'Cor do surf - Azul',
    pattern: ['C', 'C', 'C', 'C', 'V', 'C'],
    next: 'C',
    size: 6,
    desc: '4🔴 → 🔵 → 🔴 (4 CASA → VISITANTE → CASA)'
  },

  // ========== 7. VERMELHA APÓS EMPATE ==========
  // 🟡 → 🔵🔵🔵 (EMPATE → 3 VISITANTE)
  {
    id: 'g1_11',
    name: 'Vermelha após Empate',
    pattern: ['E', 'V', 'V', 'V'],
    next: 'V',
    size: 4,
    desc: '🟡 → 3🔵 (EMPATE → 3 VISITANTE)'
  },
  // 🟡 → 🔵🔵 (EMPATE → 2 VISITANTE)
  {
    id: 'g1_11b',
    name: 'Vermelha após Empate (2)',
    pattern: ['E', 'V', 'V'],
    next: 'V',
    size: 3,
    desc: '🟡 → 2🔵 (EMPATE → 2 VISITANTE)'
  },

  // ========== 8. AZUL APÓS EMPATE ==========
  // 🟡 → 🔴🔴🔴 (EMPATE → 3 CASA)
  {
    id: 'g1_12',
    name: 'Azul após Empate',
    pattern: ['E', 'C', 'C', 'C'],
    next: 'C',
    size: 4,
    desc: '🟡 → 3🔴 (EMPATE → 3 CASA)'
  },
  // 🟡 → 🔴🔴 (EMPATE → 2 CASA)
  {
    id: 'g1_12b',
    name: 'Azul após Empate (2)',
    pattern: ['E', 'C', 'C'],
    next: 'C',
    size: 3,
    desc: '🟡 → 2🔴 (EMPATE → 2 CASA)'
  },

  // ========== 9. DUPLO ==========
  // 🟡🟡 (2 EMPATES)
  {
    id: 'g1_13',
    name: 'Duplo Empate',
    pattern: ['E', 'E'],
    next: 'E',
    size: 2,
    desc: '🟡🟡 (2 EMPATES consecutivos)'
  },

  // ========== 10. DUAS CASAS ==========
  // 🟡 🔵 🔵 🟡
  {
    id: 'g1_14',
    name: 'Duas Casas - V V',
    pattern: ['E', 'V', 'V', 'E'],
    next: 'E',
    size: 4,
    desc: '🟡 🔵 🔵 🟡'
  },
  // 🟡 🔵 🔴 🟡
  {
    id: 'g1_15',
    name: 'Duas Casas - V C',
    pattern: ['E', 'V', 'C', 'E'],
    next: 'E',
    size: 4,
    desc: '🟡 🔵 🔴 🟡'
  },
  // 🟡 🔴 🔵 🟡
  {
    id: 'g1_16',
    name: 'Duas Casas - C V',
    pattern: ['E', 'C', 'V', 'E'],
    next: 'E',
    size: 4,
    desc: '🟡 🔴 🔵 🟡'
  },
  // 🟡 🔴 🔴 🟡
  {
    id: 'g1_17',
    name: 'Duas Casas - C C',
    pattern: ['E', 'C', 'C', 'E'],
    next: 'E',
    size: 4,
    desc: '🟡 🔴 🔴 🟡'
  },
];
