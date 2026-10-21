import { chave, geral, type Resultado } from "./rank";
export type Linha = { t: number | null; f?: number; x: string; v: 0 | 1 };
export type Musica = { id?: number; titulo: string; artista: string; decada: 80 | 90 | 2000; categoria: string; ajuste?: number; audio: Blob; capa?: Blob; letra: Linha[] };
export const sincronizada = (l: Linha[]) => l.length > 0 && l.every((x) => x.t !== null);

const abrir = () => new Promise<IDBDatabase>((ok, no) => {
  const r = indexedDB.open("karaoke", 2);
  r.onupgradeneeded = () => { const d = r.result; for (const n of ["m", "r"]) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: "id", autoIncrement: true }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
});
const tx = async <T,>(st: string, modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
  const d = await abrir();
  return new Promise<T>((ok, no) => { const t = d.transaction(st, modo); const r = f(t.objectStore(st));
    t.oncomplete = () => ok(r.result); t.onerror = t.onabort = () => no(t.error); });
};
const avisar = (k = "v") => localStorage.setItem(k, String(Date.now()));
export const listar = () => tx<Musica[]>("m", "readonly", (s) => s.getAll());
export const obter = (id: number) => tx<Musica>("m", "readonly", (s) => s.get(id));
export const salvar = async (m: Musica) => { await tx("m", "readwrite", (s) => s.put(m)); avisar(); };
export const apagar = async (id: number) => { await tx("m", "readwrite", (s) => s.delete(id)); avisar(); };
export const listarR = () => tx<Resultado[]>("r", "readonly", (s) => s.getAll());
export const salvarR = async (r: Resultado) => { await tx("r", "readwrite", (s) => s.put(r)); avisar("vr"); };
export const limparR = async () => { await tx("r", "readwrite", (s) => s.clear()); avisar("vr"); };

const voz = (s: string): [string, 0 | 1] => { const m = /^([12]):\s*/.exec(s); return m ? [s.slice(m[0].length), m[1] === "2" ? 1 : 0] : [s, 0]; };
function lerLRC(txt: string): Linha[] {
  const o: Linha[] = [];
  for (const l of txt.split(/\r?\n/)) {
    const tags = [...l.matchAll(/[\[<](\d+):(\d+(?:\.\d+)?)[\]>]/g)];
    const textoLimpo = l.replace(/[\[<][^\]>]*[\]>]/g, "").trim();
    if (!textoLimpo) continue;
    const [x, v] = voz(textoLimpo);
    if (tags.length) {
      const t = +tags[0][1] * 60 + +tags[0][2];
      const ultimo = o[o.length - 1];
      if (ultimo && ultimo.x === x) {
        // Se for a mesma frase, atualizamos o tempo de início para a primeira tag
        // e podemos guardar a última tag como o fim da frase
        const ultimaTag = tags[tags.length - 1];
        ultimo.f = +ultimaTag[1] * 60 + +ultimaTag[2];
      } else {
        const ultimaTag = tags[tags.length - 1];
        const tFim = tags.length > 1 ? +ultimaTag[1] * 60 + +ultimaTag[2] : undefined;
        o.push({ t, x, v, f: tFim });
      }
    } else {
      o.push({ t: null, x, v });
    }
  }
  return o.sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity));
}
function lerSRT(txt: string): Linha[] {
  return txt.replace(/\r/g, "").split(/\n\n+/).flatMap((b) => {
    const m = /(\d+):(\d+):(\d+)[,.](\d+)\s*-->/.exec(b); if (!m) return [];
    const ls = b.split("\n"); const [x, v] = voz(ls.slice(ls.findIndex((l) => l.includes("-->")) + 1).join(" ").trim());
    return x ? [{ t: +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000, x, v }] : [];
  });
}
const lerTXT = (txt: string): Linha[] => txt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => { const [x, v] = voz(s); return { t: null, x, v }; });
export const lerLetra = (nome: string, txt: string) => /\.lrc$/i.test(nome) ? lerLRC(txt) : /\.srt$/i.test(nome) ? lerSRT(txt) : lerTXT(txt);

export async function registrar(r: Resultado, modo: "melhor" | "todas") {
  await salvarR(r); const todos = await listarR();
  const pos = geral(todos, modo).findIndex((x) => chave(x) === chave(r) && (modo === "melhor" || x.quando === r.quando)) + 1;
  return { pos, todos };
}
