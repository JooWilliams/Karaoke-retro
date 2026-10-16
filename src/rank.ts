export type Resultado = { id?: number; nome: string; musicaId: number; titulo: string; artista: string; decada: number; pontos: number; quando: number };
export type Pend = Omit<Resultado, "pontos" | "quando" | "id">;
export type Item = { m: number; nome: string };
export type Cfg = { nome: "sempre" | "lembrar" | "opcional"; modo: "melhor" | "todas"; auto: boolean; limiar: number; micId: string };
export const CFG0: Cfg = { nome: "lembrar", modo: "melhor", auto: true, limiar: 0.03, micId: "" };
export const cfgDe = (c: Partial<Cfg>): Cfg => ({ ...CFG0, ...c });

export const validarNome = (n: string, c: Cfg) => {
  const t = n.trim();
  if (!t) return c.nome === "opcional" ? "" : "Informe seu nome ou apelido.";
  return t.length > 20 ? "Use no máximo 20 caracteres." : "";
};
export const nomeFinal = (n: string) => n.trim() || "Anônimo";
export const chave = (r: { nome: string }) => r.nome.trim().toLowerCase();

const ord = (rs: Resultado[]) => [...rs].sort((a, b) => b.pontos - a.pontos || a.quando - b.quando);
const melhores = (rs: Resultado[], k: (r: Resultado) => string) => {
  const m = new Map<string, Resultado>();
  for (const r of ord(rs)) if (!m.has(k(r))) m.set(k(r), r);
  return [...m.values()];
};
export const geral = (rs: Resultado[], modo: Cfg["modo"]) => (modo === "melhor" ? ord(melhores(rs, chave)) : ord(rs));
export const porMusica = (rs: Resultado[]) => ord(melhores(rs, (r) => String(r.musicaId)));
export const porDecada = (rs: Resultado[], modo: Cfg["modo"], d: number) => geral(rs.filter((r) => r.decada === d), modo).slice(0, 5);

export const csv = (rs: Resultado[]) => "\ufeffnome;musica;artista;decada;pontos;data\n" +
  [...rs].sort((a, b) => a.quando - b.quando).map((r) =>
    [r.nome, r.titulo, r.artista, r.decada, r.pontos, new Date(r.quando).toLocaleString("pt-BR")]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
export function baixar(nome: string, txt: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" })); a.download = nome; a.click();
}
