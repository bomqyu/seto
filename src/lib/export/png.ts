import { getViewportForBounds, type ReactFlowInstance } from "@xyflow/react";
import { toPng } from "html-to-image";

/** Exports the current React Flow viewport as a PNG, framing the whole tree (not just the visible canvas area). */
export async function exportFlowAsPng(instance: ReactFlowInstance, filename: string): Promise<void> {
  const nodes = instance.getNodes();
  if (nodes.length === 0) return;

  // Use the instance method (not the standalone utility) - it resolves each
  // node's measured width/height from React Flow's internal lookup, which
  // the plain nodes array returned by getNodes() doesn't carry.
  const bounds = instance.getNodesBounds(nodes);
  const padding = 60;
  const imageWidth = Math.max(Math.round(bounds.width + padding * 2), 400);
  const imageHeight = Math.max(Math.round(bounds.height + padding * 2), 300);
  const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.1, 2, 0.05);

  const viewportEl = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewportEl) return;

  const isDark = document.documentElement.classList.contains("dark");

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: isDark ? "#0d1117" : "#f7f8fa",
    width: imageWidth,
    height: imageHeight,
    pixelRatio: 2,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
