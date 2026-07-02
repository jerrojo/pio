'use client';

/**
 * Verificador de voz humana con Silero VAD (open source, Apache/MIT)
 * corriendo en el navegador vía ONNX Runtime Web.
 *
 * El VAD por energía (RMS) decide los límites del turno; Silero decide si
 * el segmento capturado ES voz humana (vs TV, música, teclas, ruido) antes
 * de gastar red y API. Si el modelo no puede cargar, todo pasa (fail-open).
 */

const VAD_CDN = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/';
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

/** ms mínimos de voz detectada por Silero para aceptar el turno */
const MIN_HUMAN_SPEECH_MS = 350;

type VadInstance = {
  run: (audio: Float32Array, sampleRate: number) => AsyncGenerator<{
    audio: Float32Array;
    start: number;
    end: number;
  }>;
};

let vadPromise: Promise<VadInstance | null> | null = null;

function loadVad(): Promise<VadInstance | null> {
  if (!vadPromise) {
    vadPromise = (async () => {
      try {
        const vad = await import('@ricky0123/vad-web');
        return await vad.NonRealTimeVAD.new({
          modelURL: VAD_CDN + 'silero_vad_legacy.onnx',
          ortConfig: (ort: any) => {
            ort.env.wasm.wasmPaths = ORT_CDN;
          },
        } as any);
      } catch (err) {
        console.warn('Silero VAD no disponible; se omite verificación:', err);
        return null;
      }
    })();
  }
  return vadPromise;
}

/** Pre-carga el modelo en segundo plano (llamar al montar la conversación) */
export function warmupHumanVoice(): void {
  void loadVad();
}

/**
 * ¿El blob contiene voz humana suficiente?
 * Devuelve true en caso de duda (fail-open): nunca bloquea al usuario.
 */
export async function isHumanSpeech(blob: Blob, audioCtx?: AudioContext | null): Promise<boolean> {
  try {
    const vad = await loadVad();
    if (!vad) return true;

    // Decodifica el audio grabado (webm/opus en Chrome, mp4/aac en iOS)
    const ctx =
      audioCtx ??
      new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const audio = buffer.getChannelData(0);

    let speechMs = 0;
    for await (const segment of vad.run(audio, buffer.sampleRate)) {
      speechMs += segment.end - segment.start;
      if (speechMs >= MIN_HUMAN_SPEECH_MS) return true;
    }
    return speechMs >= MIN_HUMAN_SPEECH_MS;
  } catch (err) {
    // decodificación o inferencia fallaron → no bloquear
    console.warn('Verificación de voz omitida:', err);
    return true;
  }
}
