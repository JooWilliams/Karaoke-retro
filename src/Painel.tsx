import { useEffect, useMemo, useRef, useState } from "react";
import { Linha, Musica, apagar, lerLetra, limparR, listar, listarR, salvar, salvarR, sincronizada } from "./db";
import { enviar, useAviso, useLS } from "./canal";
import { MicCard } from "./MicCard";
import { CFG0, Cfg, Item, Pend, Resultado, baixar, cfgDe, chave, csv, geral, nomeFinal, validarNome } from "./rank";
import { Ranking } from "./Ranking";

type Estado = { id: number | null; t: number; dur: number; p: boolean };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Painel({ fechar }: { fechar: () => void }) {
  const [aba, setAba] = useState<"fila" | "musicas" | "rank">("fila");
  const [ms, setMs] = useState<Musica[]>([]);
  const [rs, setRs] = useState<Resultado[]>([]);
  const [fila, setFila] = useLS<Item[]>("fila2", []);
  const [est] = useLS<Estado>("estado", { id: null, t: 0, dur: 0, p: false });
  const [pend, setPend] = useLS<Pend | null>("pendente", null);
  const [cfgR, setCfg] = useLS<Cfg>("cfg", CFG0);
  const cfg = cfgDe(cfgR);
  const [sync, setSync] = useState<Musica | null>(null);
  const [edit, setEdit] = useState<Musica | null>(null);
  const [nome, setNome] = useState(localStorage.getItem("ultimoNome") ?? "");
  const [pts, setPts] = useState(""), [aviso, setAviso] = useState("");
  const recarregar = () => listar().then(setMs);
  useAviso("v", recarregar);
  useAviso("vr", () => listarR().then(setRs));
  const tit = (id: number | null) => { const m = ms.find((x) => x.id === id); return m ? `${m.titulo} — ${m.artista}` : "(música removida)"; };
  const quem = () => { const e = validarNome(nome, cfg); if (e) { setAviso(e); return null; } setAviso(""); localStorage.setItem("ultimoNome", nome.trim()); return nomeFinal(nome); };
  const cantar = (m: Musica, agora: boolean) => { const n = quem(); if (n === null) return; agora ? enviar({ c: "tocar", id: m.id, nome: n }) : setFila([...fila, { m: m.id as number, nome: n }]); };
  const proxima = () => { if (!fila.length) return; enviar({ c: "tocar", id: fila[0].m, nome: fila[0].nome }); setFila(fila.slice(1)); };
  const mover = (i: number, d: number) => { const f = [...fila], j = i + d; if (j < 0 || j >= f.length) return; [f[i], f[j]] = [f[j], f[i]]; setFila(f); };
  const excluir = async (m: Musica) => { if (!confirm(`Excluir "${m.titulo}"?`)) return; await apagar(m.id as number); setFila(fila.filter((x) => x.m !== m.id)); recarregar(); };
  const salvarPts = async () => {
    const n = Number(pts);
    if (!pend || pts.trim() === "" || !Number.isInteger(n) || n < 0 || n > 100) return setAviso("Pontuação: número inteiro de 0 a 100.");
    const novo: Resultado = { ...pend, pontos: n, quando: Date.now() };
    try {
      await salvarR(novo); const todos = await listarR();
      const pos = geral(todos, cfg.modo).findIndex((r) => chave(r) === chave(novo) && (cfg.modo === "melhor" || r.quando === novo.quando)) + 1;
      enviar({ c: "mostrar", pontos: n, pos }); setPend(null); setPts(""); setAviso(""); setRs(todos);
    } catch { setAviso("Não foi possível salvar o resultado."); }
  };
  const limpar = async (tudo: boolean) => {
    if (!confirm(tudo ? "Reiniciar a competição? Apaga ranking, fila e marcas de 'já cantada'." : "Apagar todo o ranking?")) return;
    await limparR(); setRs([]); if (tudo) { localStorage.removeItem("cantadas"); setFila([]); }
  };
  if (sync) return <Sync m={sync} fim={() => { setSync(null); recarregar(); }} />;
  return (
    <main className="painel">
      <h1>PAINEL</h1><button onClick={fechar}>← Voltar ao karaokê</button>
      <div className="abas"><button className={aba === "fila" ? "on" : ""} onClick={() => setAba("fila")}>FILA E CONTROLE</button>
        <button className={aba === "musicas" ? "on" : ""} onClick={() => setAba("musicas")}>MÚSICAS ({ms.length})</button>
        <button className={aba === "rank" ? "on" : ""} onClick={() => setAba("rank")}>RANKING, REGRAS E MICROFONE</button></div>
      {aviso && <p className="erro">{aviso}</p>}
      {aba === "fila" && <section>
        {pend && <div className="card"><h3>PONTUAÇÃO PENDENTE</h3><p>{pend.nome} cantou {pend.titulo}. Pontuação manual (a automática chega na Etapa 4).</p>
          <input type="number" min={0} max={100} placeholder="0 a 100" value={pts} onChange={(e) => setPts(e.target.value)} />
          <div><button onClick={salvarPts}>Salvar no ranking</button><button onClick={() => { setPend(null); enviar({ c: "parar" }); }}>Descartar sem salvar</button></div></div>}
        <div className="card"><h3>AGORA NO PALCO</h3>
          {est.id !== null ? <><p>{tit(est.id)} · {mmss(est.t)} / {mmss(est.dur)}</p>
            <div><button onClick={() => enviar({ c: est.p ? "retomar" : "pausar" })}>{est.p ? "Retomar" : "Pausar"}</button>
              <button onClick={() => enviar({ c: "reiniciar" })}>Reiniciar</button><button onClick={() => enviar({ c: "parar" })}>Encerrar</button></div></> : <p>Nada tocando.</p>}
          <label>Volume <input type="range" min={0} max={1} step={0.05} defaultValue={1} onChange={(e) => enviar({ c: "volume", v: +e.target.value })} /></label></div>
        <div className="card"><h3>FILA ({fila.length})</h3>
          <button disabled={!fila.length} onClick={proxima}>▶ Cantar próxima / Pular</button>
          {fila.map((it, i) => <div className="lin" key={i}><span>{i + 1}. <b>{it.nome}</b> · {tit(it.m)}</span>
            <button onClick={() => mover(i, -1)}>▲</button><button onClick={() => mover(i, 1)}>▼</button>
            <button onClick={() => setFila(fila.filter((_, n) => n !== i))}>✕</button></div>)}
          {!fila.length && <p>Fila vazia. Os participantes entram pelo palco (Enter) ou pela aba Músicas.</p>}</div>
      </section>}
      {aba === "musicas" && <section><Cadastro key={edit?.id ?? "nova"} edit={edit} ok={() => { setEdit(null); recarregar(); }} fim={() => setEdit(null)} />
        <div className="card"><h3>BIBLIOTECA</h3>
          <input placeholder="Nome do participante (para Cantar agora / + Fila)" maxLength={20} value={nome} onChange={(e) => setNome(e.target.value)} />
          {!ms.length && <p>Nenhuma música ainda.</p>}
          {ms.map((m) => <div className="lin" key={m.id}><span>{m.titulo} — {m.artista} ({m.decada}s) · {sincronizada(m.letra) ? "letra sincronizada" : m.letra.length ? "letra SEM sincronia" : "sem letra"}</span>
            <button onClick={() => cantar(m, true)}>Cantar agora</button><button onClick={() => cantar(m, false)}>+ Fila</button>
            {m.letra.length > 0 && <button onClick={() => setSync(m)}>Sincronizar</button>}<button onClick={() => setEdit(m)}>Editar</button><button onClick={() => excluir(m)}>Excluir</button></div>)}</div></section>}
      {aba === "rank" && <section>
        <div className="card"><h3>REGRAS</h3>
          <label>Identificação do participante <select value={cfg.nome} onChange={(e) => setCfg({ ...cfg, nome: e.target.value as Cfg["nome"] })}>
            <option value="sempre">Exigir nome antes de cada música</option><option value="lembrar">Exigir nome, lembrando o último (mesma pessoa várias músicas)</option><option value="opcional">Nome opcional ("Anônimo")</option></select></label>
          <label>Várias apresentações da mesma pessoa <select value={cfg.modo} onChange={(e) => setCfg({ ...cfg, modo: e.target.value as Cfg["modo"] })}>
            <option value="melhor">Ranking usa só a melhor pontuação</option><option value="todas">Ranking conta todas as tentativas</option></select></label></div>
        <div className="card"><h3>ADMINISTRAÇÃO</h3><div>
          <button disabled={!rs.length} onClick={() => baixar(`ranking-${new Date().toISOString().slice(0, 10)}.csv`, csv(rs))}>Exportar CSV</button>
          <button onClick={() => limpar(false)}>Limpar ranking</button><button onClick={() => limpar(true)}>Reiniciar competição</button></div></div>
        <MicCard cfg={cfg} setCfg={setCfg} /><Ranking rs={rs} modo={cfg.modo} /></section>}
    </main>
  );
}

function Cadastro({ ok, edit, fim }: { ok: () => void; edit?: Musica | null; fim?: () => void }) {
  const vazio = { titulo: "", artista: "", decada: 90, categoria: "Louvor", texto: "" };
  const textoOriginal = edit?.letra.map((l) => `${l.v === 1 ? "2: " : ""}${l.x}`).join("\n") ?? "";
  const [f, setF] = useState(edit ? { titulo: edit.titulo, artista: edit.artista, decada: edit.decada, categoria: edit.categoria, texto: textoOriginal } : vazio);
  const [audio, setAudio] = useState<File | null>(null), [capa, setCapa] = useState<File | null>(null), [arq, setArq] = useState<File | null>(null);
  const [msg, setMsg] = useState(""), [k, setK] = useState(0);
  const enviarForm = async () => {
    setMsg("");
    if (!f.titulo.trim()) return setMsg("Informe o título.");
    const audioSalvo = audio ?? edit?.audio;
    if (!audioSalvo) return setMsg("Escolha o arquivo de áudio (MP3 ou WAV).");
    if (audio && (!/^audio\//.test(audio.type) && !/\.(mp3|wav)$/i.test(audio.name))) return setMsg("Formato de áudio não suportado. Use MP3 ou WAV.");
    if (audio) {
      const toca = await new Promise<boolean>((r) => { const a = new Audio(URL.createObjectURL(audio)); a.onloadedmetadata = () => r(true); a.onerror = () => r(false); });
      if (!toca) return setMsg("Este áudio está corrompido ou não pode ser reproduzido.");
    }
    if (capa && !capa.type.startsWith("image/")) return setMsg("A capa precisa ser uma imagem.");
    const txt = arq ? await arq.text() : f.texto;
    const letra = !arq && edit && txt === textoOriginal ? edit.letra : txt.trim() ? lerLetra(arq?.name ?? "x.txt", txt) : [];
    if (txt.trim() && !letra.length) return setMsg("Não encontrei versos válidos no arquivo de letra (LRC/SRT/TXT).");
    try {
      await salvar({
        ...(edit ? { id: edit.id } : {}),
        titulo: f.titulo.trim(),
        artista: f.artista.trim(),
        decada: f.decada as 80 | 90 | 2000,
        categoria: f.categoria,
        audio: audioSalvo,
        capa: capa ?? (edit ? edit.capa : undefined),
        letra
      });
      setMsg(edit ? "Música atualizada!" : "Música salva!");
      if (!edit) { setF(vazio); setAudio(null); setCapa(null); setArq(null); }
      setK(k + 1); ok();
    } catch { setMsg("Não foi possível salvar. Verifique o espaço em disco."); }
  };
  const set = (c: string) => (e: { target: { value: string } }) => setF({ ...f, [c]: e.target.value });
  return (
    <div className="card" key={k}><h3>{edit ? "EDITAR MÚSICA" : "NOVA MÚSICA"}</h3>
      <input placeholder="Título" value={f.titulo} onChange={set("titulo")} /><input placeholder="Artista ou grupo" value={f.artista} onChange={set("artista")} />
      <select value={f.decada} onChange={(e) => setF({ ...f, decada: +e.target.value })}><option value={80}>Anos 80</option><option value={90}>Anos 90</option><option value={2000}>Anos 2000</option></select>
      <input placeholder="Categoria (Louvor, Adoração...)" value={f.categoria} onChange={set("categoria")} />
      <label>{edit ? "Trocar áudio (opcional)" : "Áudio (MP3/WAV)"} <input type="file" accept="audio/*,.mp3,.wav" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} /></label>
      <label>{edit ? "Trocar capa (opcional)" : "Capa (opcional)"} <input type="file" accept="image/*" onChange={(e) => setCapa(e.target.files?.[0] ?? null)} /></label>
      <label>Letra: arquivo .lrc/.srt/.txt <input type="file" accept=".lrc,.srt,.txt" onChange={(e) => setArq(e.target.files?.[0] ?? null)} /></label>
      <textarea rows={5} placeholder={"ou cole a letra aqui, um verso por linha.\nPrefixe 1: ou 2: para alternar a cor de duas vozes."} value={f.texto} onChange={set("texto")} />
      <button onClick={enviarForm}>{edit ? "Atualizar música" : "Salvar música"}</button>
      {edit && <button onClick={fim}>Cancelar</button>}
      {msg && <p className="aviso">{msg}</p>}
    </div>
  );
}

function Sync({ m, fim }: { m: Musica; fim: () => void }) {
  const [ls, setLs] = useState<Linha[]>(m.letra);
  const [lat, setLat] = useState(0.2);
  const url = useMemo(() => URL.createObjectURL(m.audio), [m]);
  const a = useRef<HTMLAudioElement>(null);
  const i = ls.findIndex((l) => l.t === null);
  const agora = () => Math.max(0, (a.current?.currentTime ?? 0) - lat);

  const marcar = () => {
    if (i >= 0) {
      const novoTempo = agora();
      setLs(ls.map((l, n) => {
        if (n === i) return { ...l, t: novoTempo };
        if (n === i - 1) return { ...l, f: novoTempo };
        return l;
      }));
    }
  };

  const marcarFim = () => {
    const ultimoMarcado = ls.map((l, n) => l.t !== null ? n : -1).reduce((a, b) => Math.max(a, b), -1);
    if (ultimoMarcado >= 0) {
      const novoFim = agora();
      setLs(ls.map((l, n) => (n === ultimoMarcado ? { ...l, f: novoFim } : l)));
    }
  };

  const desfazer = () => {
    const ultimoMarcado = ls.map((l, n) => l.t !== null ? n : -1).reduce((a, b) => Math.max(a, b), -1);
    if (ultimoMarcado >= 0) {
      setLs(ls.map((l, n) => (n === ultimoMarcado ? { ...l, t: null, f: undefined } : l)));
    }
  };

  const deslocar = (d: number) => setLs(ls.map((l) => (l.t === null ? l : { ...l, t: Math.max(0, l.t + d), f: l.f === undefined ? undefined : Math.max(0, l.f + d) })));

  useEffect(() => {
    const el = document.getElementById("v" + (i < 0 ? ls.length - 1 : i));
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [i]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input")) return;
      const el = a.current;
      if (e.key === "m") marcar(); if (e.key === "e") marcarFim(); if (e.key === "z") desfazer();
      if (el && e.key === " ") { e.preventDefault(); el.paused ? el.play() : el.pause(); }
      if (el && e.key === "ArrowRight") el.currentTime += 5; if (el && e.key === "ArrowLeft") el.currentTime -= 5;
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [ls, i]);

  const guardar = async () => { await salvar({ ...m, letra: ls }); fim(); };

  return (
    <main className="painel"><h1>SINCRONIZAR</h1>
      <div className="syncTopo">
        <audio ref={a} src={url} controls />
        <div className="proximo"><small>{i >= 0 ? `PRÓXIMO VERSO (${i + 1} de ${ls.length})` : "TODOS OS VERSOS MARCADOS"}</small>{i >= 0 ? ls[i].x : "Confira e salve a sincronia."}</div>
        <div><button onClick={marcar} disabled={i < 0}>Marcar início (M)</button><button onClick={marcarFim}>Marcar fim (E)</button><button onClick={desfazer}>Desfazer (Z)</button>
          <button onClick={() => deslocar(-0.1)}>Tudo -0,1 s</button><button onClick={() => deslocar(0.1)}>Tudo +0,1 s</button>
          <button onClick={() => setLs(ls.map((l) => ({ ...l, t: null, f: undefined })))}>Refazer do zero</button>
          <button onClick={guardar} disabled={i >= 0}>Salvar sincronia</button><button onClick={fim}>Cancelar</button></div>
        <label>Compensação do tempo de reação (s): <input type="number" step={0.05} min={0} max={1} value={lat} onChange={(e) => setLat(+e.target.value)} /></label>
      </div>
      <p className="aviso">{m.titulo}. Teclas: ESPAÇO toca/pausa · ← → ±5 s · M início do verso · E fim do verso (opcional) · Z desfaz. Já estava sincronizada? Use "Tudo ±0,1 s".</p>
      <div className="card">{ls.map((l, n) => <div id={"v" + n} key={n} className={`lin ${n === i ? "prox" : ""} ${l.t !== null ? "marcado" : ""}`}><span>{l.t === null ? "--:--" : mmss(l.t)}{l.f !== undefined ? ` → ${mmss(l.f)}` : ""} · {l.x}</span></div>)}</div>
    </main>
  );
}