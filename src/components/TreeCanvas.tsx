"use client";

import { useCallback, useMemo } from "react";
import { Background, Controls, MiniMap, ReactFlow, type OnNodeDrag } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTreeStore } from "@/lib/tree/store";
import { buildFlowGraph } from "@/lib/tree/layout";
import CaseTreeNode from "./CaseTreeNode";

const nodeTypes = { caseNode: CaseTreeNode };

export default function TreeCanvas() {
  const nodes = useTreeStore((s) => s.nodes);
  const detailLevel = useTreeStore((s) => s.detailLevel);
  const maxDepth = useTreeStore((s) => s.maxDepthForCurrentLevel());
  const collapsedIds = useTreeStore((s) => s.collapsedIds);
  const manualPositions = useTreeStore((s) => s.manualPositions);
  const beginDrag = useTreeStore((s) => s.beginDrag);
  const setNodePosition = useTreeStore((s) => s.setNodePosition);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => buildFlowGraph({ allNodes: nodes, detailLevel, maxDepth, collapsedIds, manualPositions }),
    [nodes, detailLevel, maxDepth, collapsedIds, manualPositions],
  );

  const handleNodeDragStart = useCallback(() => {
    beginDrag();
  }, [beginDrag]);

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      setNodePosition(node.id, node.position);
    },
    [setNodePosition],
  );

  if (nodes.length === 0) return null;

  return (
    <div className="h-full w-full" data-testid="casetree-canvas">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={24} color="var(--foreground)" style={{ opacity: 0.08 }} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor="#94a3b8"
          maskColor="rgba(127,127,127,0.15)"
          className="!bg-[var(--background)]"
        />
      </ReactFlow>
    </div>
  );
}
