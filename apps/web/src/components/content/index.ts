import { rendererRegistry } from "./registry";
import { TextContentRenderer } from "./renderers/TextContentRenderer";
import { AudioContentRenderer } from "./renderers/AudioContentRenderer";

export function initializeRenderers(): void {
  const textRenderer = new TextContentRenderer();
  const audioRenderer = new AudioContentRenderer();

  rendererRegistry.register("epub", textRenderer);
  rendererRegistry.register("rss", textRenderer);
  rendererRegistry.register("plain_text", textRenderer);
  rendererRegistry.register("audiobook", audioRenderer);
  rendererRegistry.setFallback(textRenderer);

  console.log(
    "[ContentRenderer] Initialized:",
    rendererRegistry.getSupportedTypes(),
  );
}

export { rendererRegistry } from "./registry";
export * from "./types";
