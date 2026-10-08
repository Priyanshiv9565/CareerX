import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { Milestone, Roadmap } from "../types/roadmap";
import "@xyflow/react/dist/style.css";

type Status = "known" | "ready" | "locked" | "skipped";
type GraphNodeData = { title: string; hours: number; status: Status; phase: string; onOpen: (id: string) => void; [key: string]: unknown };

function MilestoneNode({ data, id }: { data: GraphNodeData; id: string }) {
  return (
    <div className="graph-node-shell">
      <Handle type="target" position={Position.Left} />
      <button className={`graph-node ${data.status}`} onClick={() => data.onOpen(id)} aria-label={`${data.title}, ${data.status}, ${data.hours} hours`}>
        <span className="graph-node-top"><i className={`graph-status-dot ${data.status}`} /> {data.phase}</span>
        <strong>{data.title}</strong>
        <span className="graph-node-bottom">{data.hours} hours <span>›</span></span>
      </button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { milestone: MilestoneNode };

export default function RoadmapGraph({ roadmap, statusFor, onOpen }: {
  roadmap: Roadmap;
  statusFor: (milestone: Milestone) => Status;
  onOpen: (milestone: Milestone) => void;
}) {
  const initialNodes = useMemo(() => roadmap.nodes.map((milestone, index) => ({
    id: milestone.id,
    type: "milestone",
    position: savedPosition(milestone.id) ?? { x: 30 + milestone.phase * 300, y: 45 + roadmap.nodes.filter((n, i) => i < index && n.phase === milestone.phase).length * 145 },
    data: { title: milestone.title, hours: milestone.hours, phase: roadmap.phases[milestone.phase]?.name ?? "Milestone", status: statusFor(milestone), onOpen: (id: string) => { const selected = roadmap.nodes.find((node) => node.id === id); if (selected) onOpen(selected); } },
  } satisfies Node<GraphNodeData>)), [roadmap, statusFor, onOpen]);
  const initialEdges = useMemo(() => roadmap.nodes.flatMap((milestone) => milestone.deps.map((dependency) => ({
    id: `${dependency}-${milestone.id}`,
    source: dependency,
    target: milestone.id,
    type: "smoothstep",
    animated: true,
    style: { stroke: "#a39eef", strokeWidth: 2 },
  } satisfies Edge))), [roadmap]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);
  useEffect(() => setNodes((current) => initialNodes.map((next) => ({ ...next, position: current.find((node) => node.id === next.id)?.position ?? next.position }))), [initialNodes, setNodes]);
  function savePosition(id: string, x: number, y: number) {
    try { const positions = JSON.parse(localStorage.getItem("careerx.graph.positions") ?? "{}"); positions[id] = { x, y }; localStorage.setItem("careerx.graph.positions", JSON.stringify(positions)); } catch { /* A fresh default layout is fine if storage is unavailable. */ }
  }

  return <div className="graph-wrap" aria-label="Draggable career roadmap skill tree">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onNodeDragStop={(_, node) => savePosition(node.id, node.position.x, node.position.y)} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.3} maxZoom={1.4} nodesDraggable nodesConnectable={false} elementsSelectable proOptions={{ hideAttribution: true }}>
      <Background color="#dedde9" gap={24} size={1} />
      <MiniMap pannable zoomable nodeColor={(node) => (node.data as GraphNodeData).status === "known" ? "#7cc4a7" : (node.data as GraphNodeData).status === "ready" ? "#7772dc" : "#c9c8d3"} />
      <Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}

function savedPosition(id: string) {
  try { const saved = JSON.parse(localStorage.getItem("careerx.graph.positions") ?? "{}"); const point = saved[id]; if (Number.isFinite(point?.x) && Number.isFinite(point?.y)) return point as { x: number; y: number }; } catch { /* Ignore stale layout data. */ }
  return null;
}
