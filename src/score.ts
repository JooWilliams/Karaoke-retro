import type { Linha } from "./db";
export type Amostra = { t: number; v: boolean };
export type Auto = { pontos: number; part: number; ritmo: number };

// Critérios: participação (voz presente durante os versos) e ritmo (início perto do verso + silêncio nos intervalos).
// Afinação NÃO é avaliada (exige melodia de referência). Retorna null se houver poucos dados.
export function pontuar(ls: Linha[], am: Amostra[]): Auto | null {
  const jan = ls.map((l, i) => { const a = l.t as number; return { a, b: Math.min((ls[i + 1]?.t as number) ?? a + 4, a + 8) }; });
  let dentro = 0, dv = 0, fora = 0, fv = 0;
  for (const s of am) {
    if (jan.some((w) => s.t >= w.a && s.t < w.b)) { dentro++; if (s.v) dv++; } else { fora++; if (s.v) fv++; }
  }
  if (dentro < 10 || !jan.length) return null;
  const part = Math.min(1, dv / dentro / 0.7);
  const inicio = jan.filter((w) => am.some((s) => s.v && s.t >= w.a - 0.3 && s.t <= w.a + 1.5)).length / jan.length;
  const ritmo = 0.6 * inicio + 0.4 * (fora ? 1 - fv / fora : 1);
  return { pontos: Math.round(100 * (0.5 * part + 0.5 * ritmo)), part: Math.round(part * 100), ritmo: Math.round(ritmo * 100) };
}
