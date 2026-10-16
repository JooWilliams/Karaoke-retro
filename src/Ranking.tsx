import { useEffect, useState } from "react";
import { Cfg, Resultado, geral, porDecada, porMusica } from "./rank";

const medalha = ["🥇", "🥈", "🥉"];
const dt = (q: number) => new Date(q).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const VIS = ["GERAL", "POR MÚSICA", "POR DÉCADA", "HISTÓRICO"];

function lista(l: Resultado[], hist = false) {
  if (!l.length) return <p className="aviso">Nenhuma apresentação ainda.</p>;
  return <ol className="rk">{l.map((r, i) => (
    <li key={r.id ?? i} className={!hist && i < 3 ? `p${i + 1}` : ""}>
      <i>{hist ? "•" : i < 3 ? medalha[i] : i + 1}</i><b>{r.nome}</b><span>{r.titulo} — {r.artista}</span><em>{r.pontos}</em><small>{dt(r.quando)}</small>
    </li>))}</ol>;
}

export function Ranking({ rs, modo, teclas }: { rs: Resultado[]; modo: Cfg["modo"]; teclas?: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!teclas) return;
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setV((x) => Math.min(3, x + 1)); if (e.key === "ArrowLeft") setV((x) => Math.max(0, x - 1)); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [teclas]);
  const n = teclas ? 10 : 100;
  return (
    <div className="ranking">
      <div className="abas">{VIS.map((t, i) => <button key={t} className={v === i ? "on" : ""} onClick={() => setV(i)}>{t}</button>)}</div>
      {v === 0 && lista(geral(rs, modo).slice(0, n))}
      {v === 1 && lista(porMusica(rs).slice(0, n))}
      {v === 2 && <div className="cols">{[80, 90, 2000].map((d) => <div key={d}><h3>{d === 2000 ? "2000s" : `${d}s`}</h3>{lista(porDecada(rs, modo, d))}</div>)}</div>}
      {v === 3 && lista([...rs].sort((a, b) => b.quando - a.quando).slice(0, teclas ? 12 : 200), true)}
    </div>
  );
}
