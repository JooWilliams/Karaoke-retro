import { useEffect, useRef, useState } from "react";
import { Mic, abrirMic, fecharMic, nivel } from "./mic";
import type { Cfg } from "./rank";

export function MicCard({ cfg, setCfg }: { cfg: Cfg; setCfg: (c: Cfg) => void }) {
  const [devs, setDevs] = useState<MediaDeviceInfo[]>([]);
  const [nv, setNv] = useState(0), [msg, setMsg] = useState("");
  const mic = useRef<Mic | null>(null), raf = useRef(0);
  const parar = () => { cancelAnimationFrame(raf.current); if (mic.current) fecharMic(mic.current); mic.current = null; setNv(0); };
  useEffect(() => parar, []);
  const testar = async () => {
    parar(); setMsg("");
    try {
      const m = await abrirMic(cfg.micId); mic.current = m;
      setDevs((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput"));
      const lo = () => { setNv(nivel(m)); raf.current = requestAnimationFrame(lo); }; lo();
      setMsg("Microfone ativo. Fale ou cante: a barra deve passar da marca vermelha.");
    } catch { setMsg("Não foi possível acessar o microfone. Verifique a conexão e a permissão do Windows (Configurações > Privacidade > Microfone)."); }
  };
  const calibrar = async () => {
    const m = mic.current; if (!m) return setMsg("Clique em \"Testar microfone\" primeiro.");
    setMsg("Calibrando por 3 segundos… fique em silêncio, com a música de fundo tocando.");
    const v: number[] = [];
    await new Promise<void>((r) => { const f = setInterval(() => v.push(nivel(m)), 50); setTimeout(() => { clearInterval(f); r(); }, 3000); });
    const limiar = Math.max(0.015, Math.round(Math.max(...v) * 1800) / 1000);
    setCfg({ ...cfg, limiar }); setMsg(`Calibrado (limiar ${limiar}). Cante para conferir.`);
  };
  return (
    <div className="card"><h3>MICROFONE E PONTUAÇÃO AUTOMÁTICA</h3>
      <label><input type="checkbox" checked={cfg.auto} onChange={(e) => setCfg({ ...cfg, auto: e.target.checked })} /> Pontuação automática (participação + ritmo; exige letra sincronizada)</label>
      <label>Dispositivo <select value={cfg.micId} onChange={(e) => setCfg({ ...cfg, micId: e.target.value })}>
        <option value="">Padrão do Windows</option>{devs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}</select></label>
      <div className="medidor"><div style={{ width: `${Math.min(100, (nv / 0.3) * 100)}%` }} /><i style={{ left: `${Math.min(100, (cfg.limiar / 0.3) * 100)}%` }} /></div>
      <div><button onClick={testar}>Testar microfone</button><button onClick={calibrar}>Calibrar (3 s)</button><button onClick={parar}>Parar teste</button></div>
      {msg && <p className="aviso">{msg}</p>}
      <p className="aviso">Afinação e reconhecimento de palavras ainda não são avaliados. Use microfone dinâmico, bem perto da boca; instrumental alto pode ser confundido com voz.</p>
    </div>
  );
}
