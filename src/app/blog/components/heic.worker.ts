const globalSelf = self as unknown as {
  window?: typeof self;
  document?: { createElement: (tag: string) => OffscreenCanvas | Record<string, never> };
};

if (typeof globalSelf.window === "undefined") {
  globalSelf.window = self;

  if (typeof OffscreenCanvas !== "undefined") {
    // @ts-expect-error — OffscreenCanvas.toBlob is not in all environments
    OffscreenCanvas.prototype.toBlob = function (callback: any, type: any, quality: any) {
      this.convertToBlob({ type, quality }).then(callback);
    };
  }

  globalSelf.document = {
    createElement: (tag: string) => {
      if (tag === "canvas") return new OffscreenCanvas(300, 150);
      return {};
    },
  };
}

// ---------------------------------------------------------------------------
// exifr is safe to import statically — it doesn't sniff `window` at eval time.
// heic2any MUST stay as a dynamic import inside onmessage so the polyfill
// above is guaranteed to run first. Do not move it to the top of the file.
// ---------------------------------------------------------------------------
import exifr from "exifr";

self.onmessage = async function (e: MessageEvent) {
  const { name, file, id } = e.data;
  const start = Date.now();

  try {
    await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] });

    const isHeic = name.toLowerCase().endsWith(".heic") || name.toLowerCase().endsWith(".heif");
    if (isHeic) {
      const heic2any = (await import("heic2any")).default;
      await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
    } else {
      const end = Date.now() + 800;
      let x = 0;
      while (Date.now() < end) x += Math.sqrt(x + 1);
    }
  } catch (err: any) {
    self.postMessage({ type: "error", name, error: err?.message ?? String(err), id });
    return;
  }

  self.postMessage({ type: "success", name, elapsed: Date.now() - start, id });
};