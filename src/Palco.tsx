import { useEffect, useMemo, useRef, useState } from "react";
import { Linha, Musica, listar, listarR, obter, registrar, salvar, sincronizada } from "./db";
import { ouvir, useAviso, useLS } from "./canal";
import { CFG0, Cfg, Item, Pend, Resultado, cfgDe, nomeFinal, validarNome } from "./rank";
import { Ranking } from "./Ranking";
import { Painel } from "./Painel";
import { Amostra, Auto, pontuar } from "./score";
import { Mic, abrirMic, fecharMic, nivel } from "./mic";

const rotulo = (d: number) => (d === 2000 ? "2000s" : `${d}s`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Tela = { t: "car"; msg?: string } | { t: "nome"; m: Musica } | { t: "toca"; m: Musica; nome: string } | { t: "res"; p: Pend; pontos?: number; pos?: number; a?: Auto } | { t: "rank" };

export function Palco() {
  const [ms, setMs] = useState<Musica[]>([]);
  const [rs, setRs] = useState<Resultado[]>([]);
  const [tela, setTela] = useState<Tela>({ t: "car" });
  const [admin, setAdmin] = useState(false);
  const [cfgR] = useLS<Cfg>("cfg", CFG0);
  const cfg = cfgDe(cfgR);
  const [fila, setFila] = useLS<Item[]>("fila2", []);
  useAviso("v", () => listar().then(setMs));
  useAviso("vr", () => listarR().then(setRs));
  useEffect(() => {
    const off = ouvir((c) => {
      if (c.c === "tocar") { setAdmin(false); obter(c.id).then((m) => m && setTela({ t: "toca", m, nome: c.nome })); }
      if (c.c === "parar") setTela({ t: "car" });
      if (c.c === "mostrar") setTela((t) => (t.t === "res" ? { ...t, pontos: c.pontos, pos: c.pos } : t));
    });
    const k = (e: KeyboardEvent) => { if (e.key === "f" && !(e.target as HTMLElement).matches("input,textarea,select")) document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); };
    addEventListener("keydown", k);
    return () => { off(); removeEventListener("keydown", k); };
  }, []);
  const terminou = async (m: Musica, nome: string, a?: Auto) => {
    const p: Pend = { nome, musicaId: m.id as number, titulo: m.titulo, artista: m.artista, decada: m.decada };
    if (a) { try { const { pos } = await registrar({ ...p, pontos: a.pontos, quando: Date.now() }, cfg.modo); return setTela({ t: "res", p, pontos: a.pontos, pos, a }); } catch { /* cai para o modo manual */ } }
    localStorage.setItem("pendente", JSON.stringify(p)); setTela({ t: "res", p });
  };
  const cancelar = () => { localStorage.removeItem("pendente"); setTela({ t: "car" }); };
  const escolher = (m: Musica, nome: string) => {
    localStorage.setItem("ultimoNome", nome);
    const ocupado = !!localStorage.getItem("pendente") || JSON.parse(localStorage.getItem("estado") || "{}").id != null;
    if (!ocupado && fila.length === 0) return setTela({ t: "toca", m, nome });
    setFila([...fila, { m: m.id as number, nome }]); setTela({ t: "car", msg: `${nome}, você entrou na fila! (posição ${fila.length + 1})` });
  };
  if (admin) return <Painel fechar={() => setAdmin(false)} />;
  if (tela.t === "toca") return <Player key={tela.m.id} m={tela.m} nome={tela.nome} cfg={cfg} voltar={cancelar} terminou={(a) => terminou(tela.m, tela.nome, a)} />;
  if (tela.t === "nome") return <NomeTela m={tela.m} cfg={cfg} ok={(n) => escolher(tela.m, n)} voltar={() => setTela({ t: "car" })} />;
  if (tela.t === "res") return <><ResTela tela={tela} voltar={() => setTela({ t: "car" })} /><button className="gear" title="Cadastro e configurações" onClick={() => setAdmin(true)}>⚙</button></>;
  if (tela.t === "rank") return <TelaRank rs={rs} modo={cfg.modo} voltar={() => setTela({ t: "car" })} />;
  return <><Carrossel ms={ms} msg={tela.msg} abrir={(m) => setTela({ t: "nome", m })} rank={() => setTela({ t: "rank" })} /><button className="gear" title="Cadastro e configurações" onClick={() => setAdmin(true)}>⚙</button></>;
}

function useEsc(f: (e: KeyboardEvent) => void) { useEffect(() => { addEventListener("keydown", f); return () => removeEventListener("keydown", f); }); }

function NomeTela({ m, cfg, ok, voltar }: { m: Musica; cfg: Cfg; ok: (n: string) => void; voltar: () => void }) {
  const [n, setN] = useState(cfg.nome === "lembrar" ? localStorage.getItem("ultimoNome") ?? "" : "");
  const [e, setE] = useState("");
  const confirmar = () => { const x = validarNome(n, cfg); if (x) return setE(x); ok(nomeFinal(n)); };
  return (
    <div className="tela player"><small>{m.titulo} — {m.artista}</small><h2>QUEM VAI CANTAR?</h2>
      <input className="nome-in" autoFocus maxLength={20} value={n} placeholder="Seu nome ou apelido" onChange={(ev) => { setN(ev.target.value); setE(""); }}
        onKeyDown={(ev) => { if (ev.key === "Enter") confirmar(); if (ev.key === "Escape") voltar(); }} />
      {e && <p className="erro">{e}</p>}<footer>ENTER confirmar · ESC voltar</footer></div>
  );
}

function ResTela({ tela, voltar }: { tela: { p: Pend; pontos?: number; pos?: number; a?: Auto }; voltar: () => void }) {
  useEsc((e) => { if (e.key === "Escape" || e.key === "Enter") voltar(); });
  return (
    <div className="tela player"><small>RESULTADO</small><h2>{tela.p.nome}</h2><p className="aviso">{tela.p.titulo} — {tela.p.artista}</p>
      {tela.a && <p className="aviso">Participação {tela.a.part}% · Ritmo {tela.a.ritmo}% · Afinação: não avaliada nesta versão</p>}
      {tela.pontos === undefined ? <p className="aviso">Aguardando a pontuação do organizador…</p>
        : <><div className="nota">{tela.pontos}</div>{tela.pos ? <p className="pos">{tela.pos}º no ranking</p> : null}</>}
      <footer>ENTER ou ESC para voltar ao catálogo</footer></div>
  );
}

function TelaRank({ rs, modo, voltar }: { rs: Resultado[]; modo: Cfg["modo"]; voltar: () => void }) {
  useEsc((e) => { if (e.key === "Escape") voltar(); });
  return <div className="tela rkTela"><h1>RANKING</h1><Ranking rs={rs} modo={modo} teclas /><footer>← → trocar visão · ESC voltar</footer></div>;
}

function Carrossel({ ms, abrir, rank, msg }: { ms: Musica[]; abrir: (m: Musica) => void; rank: () => void; msg?: string }) {
  const [filtro, setFiltro] = useState(0);
  const [i, setI] = useState(0);
  const [fila] = useLS<Item[]>("fila2", []);
  const cantadas: number[] = useMemo(() => JSON.parse(localStorage.getItem("cantadas") || "[]"), []);
  const lista = useMemo(() => ms.filter((m) => !filtro || m.decada === filtro), [ms, filtro]);
  const capas = useMemo(() => lista.map((m) => (m.capa ? URL.createObjectURL(m.capa) : "")), [lista]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, lista.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
      if (e.key === "Enter" && lista[i]) abrir(lista[i]);
      if (e.key === "r") rank();
      const f: Record<string, number> = { "0": 0, "1": 80, "2": 90, "3": 2000 };
      if (e.key in f) { setFiltro(f[e.key]); setI(0); }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [lista, i]);
  return (
    <div className="tela">
      <header><h1>KARAOKÊ <span>GOSPEL</span></h1>
        <nav>{([[0, "TODAS"], [80, "80s"], [90, "90s"], [2000, "2000s"]] as [number, string][]).map(([d, n]) => (
          <button key={d} className={filtro === d ? "on" : ""} onClick={() => { setFiltro(d); setI(0); }}>{n}</button>))}</nav></header>
      {msg && <p className="toast">{msg}</p>}
      {lista.length === 0 && <p className="vazio">Nenhuma música cadastrada.<br />Abra o PAINEL e use a aba Músicas.</p>}
      <div className="trilho" style={{ transform: `translateX(calc(50vw - ${i * 340 + 160}px))` }}>
        {lista.map((m, n) => (
          <button key={m.id} className={`capa d${m.decada} ${n === i ? "foco" : ""}`} onClick={() => (n === i ? abrir(m) : setI(n))}
            style={capas[n] ? { backgroundImage: `linear-gradient(transparent 35%,rgba(0,0,0,.85)),url(${capas[n]})`, backgroundSize: "cover" } : undefined}>
            <b>{rotulo(m.decada)}</b>{cantadas.includes(m.id as number) && <u>✓ JÁ CANTADA</u>}
            <strong>{m.titulo}</strong><em>{m.artista} · {m.categoria}</em>{!sincronizada(m.letra) && <small>{m.letra.length ? "letra sem sincronia" : "sem letra"}</small>}
          </button>))}
      </div>
      <footer>← → navegar · ENTER escolher música · R ranking · 0-3 década · F tela cheia · fila: {fila.length}</footer>
    </div>
  );
}

function Letra({ ls, t, bloco }: { ls: Linha[]; t: number; bloco: number }) {
  if (!ls.length) return <p className="aviso">Esta música não tem letra cadastrada.</p>;
  if (!sincronizada(ls)) return <div className="letra">{ls.slice(bloco * 4, bloco * 4 + 4).map((l, n) => <p key={n} className={`l v${l.v} atual`} style={{ ["--p" as string]: "100%" }}>{l.x}</p>)}</div>;
  let i = -1; ls.forEach((l, n) => { if ((l.t as number) <= t) i = n; });
  const ini = Math.max(0, i - 1);
  const fim = i >= 0 ? (ls[i].f ?? Math.min((ls[i + 1]?.t ?? (ls[i].t as number) + 4) as number, (ls[i].t as number) + Math.max(1.5, ls[i].x.length * 0.1))) : 1;
  const p = i >= 0 ? Math.min(1, Math.max(0, (t - (ls[i].t as number)) / (fim - (ls[i].t as number)))) : 0;
  return <div className="letra">{ls.slice(ini, ini + 4).map((l, n) => { const idx = ini + n;
    return <p key={idx} className={`l v${l.v} ${idx < i ? "passada" : idx === i ? "atual" : "futura"}`} style={{ ["--p" as string]: `${p * 100}%` }}>{l.x}</p>; })}</div>;
}

function Player({ m, nome, cfg, voltar, terminou }: { m: Musica; nome: string; cfg: Cfg; voltar: () => void; terminou: (a?: Auto) => void }) {
  const a = useRef<HTMLAudioElement>(null);
  const url = useMemo(() => URL.createObjectURL(m.audio), [m]);
  const [t, setT] = useState(0), [dur, setDur] = useState(0), [rod, setRod] = useState(false), [bloco, setBloco] = useState(0), [erro, setErro] = useState("");
  const [aj, setAj] = useState(m.ajuste ?? 0);
  useEffect(() => { let r = 0; const lo = () => { if (a.current) setT(a.current.currentTime); r = requestAnimationFrame(lo); }; lo(); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => { if (aj === (m.ajuste ?? 0)) return; const id = setTimeout(() => salvar({ ...m, ajuste: aj }), 1000); return () => clearTimeout(id); }, [aj]);
  const mic = useRef<Mic | null>(null), am = useRef<Amostra[]>([]);
  const [nv, setNv] = useState(0), [aviso, setAviso] = useState("");
  const automatico = cfg.auto && sincronizada(m.letra);
  useEffect(() => {
    if (!cfg.auto) return;
    if (!sincronizada(m.letra)) { setAviso("Sem letra sincronizada: pontuação manual pelo organizador."); return; }
    let vivo = true, id = 0;
    abrirMic(cfg.micId).then((x) => {
      if (!vivo) return fecharMic(x);
      mic.current = x;
      id = window.setInterval(() => { const el = a.current, n = nivel(x); setNv(n); if (el && !el.paused) am.current.push({ t: el.currentTime, v: n > cfg.limiar }); }, 100);
    }).catch(() => setAviso("Microfone indisponível: pontuação manual pelo organizador."));
    return () => { vivo = false; clearInterval(id); if (mic.current) fecharMic(mic.current); };
  }, []);
  const pub = (p: boolean) => localStorage.setItem("estado", JSON.stringify({ id: m.id, t: a.current?.currentTime ?? 0, dur: a.current?.duration || 0, p }));
  useEffect(() => {
    const off = ouvir((c) => { const el = a.current; if (!el) return;
      if (c.c === "pausar") el.pause(); if (c.c === "retomar") el.play();
      if (c.c === "reiniciar") { el.currentTime = 0; el.play(); } if (c.c === "volume") el.volume = c.v; });
    const k = (e: KeyboardEvent) => { const el = a.current; if (!el) return;
      if (e.key === "Escape") voltar();
      if (e.key === " ") { e.preventDefault(); el.paused ? el.play() : el.pause(); }
      if (e.key === "ArrowRight") el.currentTime += 5; if (e.key === "ArrowLeft") el.currentTime -= 5;
      if (e.key === "ArrowUp") el.volume = Math.min(1, el.volume + 0.1); if (e.key === "ArrowDown") el.volume = Math.max(0, el.volume - 0.1);
      if (e.key === "r") el.currentTime = 0;
      if (e.key === "]") setAj((x) => Math.round((x + 0.1) * 10) / 10); if (e.key === "[") setAj((x) => Math.round((x - 0.1) * 10) / 10);
      if (e.key === "n") setBloco((b) => b + 1); if (e.key === "b") setBloco((b) => Math.max(0, b - 1)); };
    addEventListener("keydown", k);
    return () => { off(); removeEventListener("keydown", k); localStorage.setItem("estado", JSON.stringify({ id: null, t: 0, dur: 0, p: false })); };
  }, [m]);
  const fim = () => { const c: number[] = JSON.parse(localStorage.getItem("cantadas") || "[]"); localStorage.setItem("cantadas", JSON.stringify([...new Set([...c, m.id as number])])); terminou(automatico && mic.current ? pontuar(m.letra, am.current) ?? undefined : undefined); };
  return (
    <div className="tela player">
      <small>🎤 {nome} · {rotulo(m.decada)} · {m.artista}</small>
      <h2>{m.titulo}</h2>
      {aj !== 0 && <p className="aviso">Ajuste da letra: {aj > 0 ? "+" : ""}{aj.toFixed(1)} s</p>}
      <Letra ls={m.letra} t={t + aj} bloco={bloco} />
      {erro && <p className="erro">{erro}</p>}
      {aviso && <p className="aviso">{aviso}</p>}
      {automatico && !aviso && <div className="mic" title="Nível do microfone"><div style={{ width: `${Math.min(100, (nv / 0.3) * 100)}%` }} /></div>}
      <audio ref={a} src={url} autoPlay onTimeUpdate={() => pub(a.current!.paused)} onLoadedMetadata={() => setDur(a.current!.duration)}
        onPlay={() => { setRod(true); pub(false); }} onPause={() => { setRod(false); pub(true); }} onEnded={fim}
        onError={() => setErro("Falha ao reproduzir o áudio desta música. Verifique o arquivo cadastrado.")} />
      <div className="barra"><div style={{ width: dur ? `${(t / dur) * 100}%` : 0 }} /></div>
      <div className="tempo"><span>{mmss(t)}</span><span>{rod ? "♪" : "❚❚"}</span><span>-{mmss(Math.max(0, dur - t))}</span></div>
      <footer>ESPAÇO pausa · ← → ±5s · ↑ ↓ volume · R reiniciar · N/B bloco · [ ] atrasa/adianta a letra · ESC encerrar</footer>
    </div>
  );
}
