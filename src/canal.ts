import { useEffect, useState } from "react";
// Comunicação palco <-> painel via localStorage (evento "storage" dispara na OUTRA janela).
export const enviar = (c: Record<string, unknown>) => localStorage.setItem("cmd", JSON.stringify({ ...c, n: Math.random() }));
export const ouvir = (f: (c: any) => void) => {
  const h = (e: StorageEvent) => { if (e.key === "cmd" && e.newValue) f(JSON.parse(e.newValue)); };
  addEventListener("storage", h); return () => removeEventListener("storage", h);
};
export function useLS<T>(k: string, ini: T): [T, (v: T) => void] {
  const ler = () => { try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return ini; } };
  const [v, setV] = useState<T>(ler);
  useEffect(() => { const h = (e: StorageEvent) => e.key === k && setV(ler()); addEventListener("storage", h); return () => removeEventListener("storage", h); }, []);
  return [v, (x) => { localStorage.setItem(k, JSON.stringify(x)); setV(x); }];
}
export const useMusicas = (carregar: () => void) => useEffect(() => {
  carregar(); const h = (e: StorageEvent) => e.key === "v" && carregar();
  addEventListener("storage", h); return () => removeEventListener("storage", h);
}, []);
export const useAviso = (k: string, carregar: () => void) => useEffect(() => {
  carregar(); const h = (e: StorageEvent) => e.key === k && carregar();
  addEventListener("storage", h); return () => removeEventListener("storage", h);
}, []);
