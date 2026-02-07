import { rendererRegistry } from "./registry";
import { TextContentRenderer } from "./renderers/TextContentRenderer";

export function initializeRenderers(): void {
  const textRenderer = new TextContentRenderer();

  rendererRegistry.register("epub", textRenderer);
  rendererRegistry.register("rss", textRenderer);
  rendererRegistry.register("plain_text", textRenderer);
  rendererRegistry.setFallback(textRenderer);

  console.log(
    "[ContentRenderer] Initialized:",
    rendererRegistry.getSupportedTypes(),
  );
}

export { rendererRegistry } from "./registry";
export * from "./types";
