import { createWorker } from "tesseract.js";

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("spa");
  }
  return workerPromise;
}

/** OCR Spanish text from a flyer image buffer. */
export async function recognizeFlyerText(image: Buffer): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return (data.text ?? "").replace(/\r\n/g, "\n").trim();
}

/** Release OCR worker (optional; useful in CLI / tests). */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}
