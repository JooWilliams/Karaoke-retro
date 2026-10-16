export type Mic = { ctx: AudioContext; an: AnalyserNode; stream: MediaStream; buf: Float32Array };
export async function abrirMic(id?: string): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, ...(id ? { deviceId: { exact: id } } : {}) } });
  const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(an);
  return { ctx, an, stream, buf: new Float32Array(an.fftSize) };
}
export const nivel = (m: Mic) => { m.an.getFloatTimeDomainData(m.buf); let s = 0; for (const x of m.buf) s += x * x; return Math.sqrt(s / m.buf.length); };
export const fecharMic = (m: Mic) => { m.stream.getTracks().forEach((t) => t.stop()); m.ctx.close(); };
