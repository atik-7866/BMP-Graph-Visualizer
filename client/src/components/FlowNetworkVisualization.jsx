import { useMemo } from "react";

function calculateNodePositions(nodes, width, height) {
  const positions = {};
  const centerX = width / 2;
  const centerY = height / 2;

  const radius = Math.min(width, height) * (nodes.length > 7 ? 0.4 : 0.35);

  if (nodes.length === 1) {
    positions[nodes[0]] = { x: centerX, y: centerY };
    return positions;
  }

  nodes.forEach((node, index) => {
    const angle = (index * 2 * Math.PI) / nodes.length - Math.PI / 2;
    positions[node] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return positions;
}

function makeEdgeKey(from, to) {
  return `${from}->${to}`;
}

export default function FlowNetworkVisualization({
  adjacencyList,
  originalCapacity,
  residualCapacity,
  activePathEdges = [],
  finalFlowEdges = [],
  showFinalFlow = false,
  statusLines = [],
  visitedNodes = [],
  currentNode = null,
  currentNeighbors = [],
  source = null,
  sink = null,
  width = 620,
  height = 520,
}) {
  const nodes = useMemo(() => Object.keys(adjacencyList), [adjacencyList]);
  const nodeRadius = nodes.length > 10 ? 22 : 25;
  const fontSize = nodes.length > 10 ? 14 : 16;

  const positions = useMemo(
    () => calculateNodePositions(nodes, width, height),
    [nodes, width, height]
  );

  const activePathSet = useMemo(() => {
    const set = new Set();
    activePathEdges.forEach(({ from, to }) => set.add(makeEdgeKey(from, to)));
    return set;
  }, [activePathEdges]);

  const finalFlowSet = useMemo(() => {
    const set = new Set();
    finalFlowEdges.forEach(({ from, to, flow }) => {
      if (flow > 0) {
        set.add(makeEdgeKey(from, to));
      }
    });
    return set;
  }, [finalFlowEdges]);

  const forwardEdges = useMemo(() => {
    const edges = [];

    for (const from of nodes) {
      for (const to of nodes) {
        const capacity = originalCapacity?.[from]?.[to] ?? 0;
        if (capacity > 0) {
          const residual = residualCapacity?.[from]?.[to] ?? 0;
          const flow = capacity - residual;
          edges.push({ from, to, capacity, flow });
        }
      }
    }

    return edges;
  }, [nodes, originalCapacity, residualCapacity]);

  const backwardEdges = useMemo(() => {
    const edges = [];

    for (const from of nodes) {
      for (const to of nodes) {
        const capacity = originalCapacity?.[from]?.[to] ?? 0;
        if (capacity <= 0) continue;

        const residualForward = residualCapacity?.[from]?.[to] ?? 0;
        const flow = capacity - residualForward;
        if (flow > 0) {
          edges.push({ from: to, to: from, flow });
        }
      }
    }

    return edges;
  }, [nodes, originalCapacity, residualCapacity]);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-semibold text-lg mb-2">Flow Network Visualization</h3>
      <div className="mb-3 bg-muted/40 border border-border rounded-md px-3 py-2">
        <p className="text-xs font-semibold text-foreground mb-1">Live Algorithm Status</p>
        <div className="space-y-1">
          {statusLines.length ? (
            statusLines.map((line, index) => (
              <p key={index} className="text-xs text-muted-foreground font-mono">
                {line}
              </p>
            ))
          ) : (
            <p className="text-xs text-muted-foreground font-mono">(status will appear while stepping)</p>
          )}
        </div>
      </div>
      <svg width={width} height={height} className="bg-muted/30 rounded">
        <defs>
          <marker
            id="ff-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
          </marker>
          <marker
            id="ff-arrow-active"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
          </marker>
          <marker
            id="ff-arrow-back"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#a1a1aa" />
          </marker>
        </defs>

        <g>
          {forwardEdges.map((edge) => {
            const from = positions[edge.from];
            const to = positions[edge.to];
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const unitX = dx / distance;
            const unitY = dy / distance;

            const x1 = from.x + unitX * nodeRadius;
            const y1 = from.y + unitY * nodeRadius;
            const x2 = to.x - unitX * (nodeRadius + 8);
            const y2 = to.y - unitY * (nodeRadius + 8);
            const perpX = -unitY;
            const perpY = unitX;

            const hasReverseForwardEdge = (originalCapacity?.[edge.to]?.[edge.from] ?? 0) > 0;
            const directionBias = hasReverseForwardEdge
              ? edge.from < edge.to
                ? 1
                : -1
              : 1;

            const labelX = x1 + unitX * 26 + perpX * 14 * directionBias;
            const labelY = y1 + unitY * 26 + perpY * 14 * directionBias;

            const key = makeEdgeKey(edge.from, edge.to);
            const isPathEdge = activePathSet.has(key);
            const isFinalFlowEdge = showFinalFlow && finalFlowSet.has(key);
            const isExploring = currentNode === edge.from && currentNeighbors.includes(edge.to);
            const isActive = isPathEdge || isExploring;
            const strokeColor = isActive
              ? "#f59e0b"
              : isFinalFlowEdge
              ? "#8b5cf6"
              : "#64748b";
            const strokeWidth = isActive ? 4 : isFinalFlowEdge ? 3.5 : 2.5;

            return (
              <g key={`forward-${key}`}>
                {(isActive || isFinalFlowEdge) && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isActive ? "#fbbf24" : "#8b5cf6"}
                    strokeWidth={8}
                    strokeOpacity={isActive ? 0.25 : 0.2}
                  />
                )}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  markerEnd={isActive ? "url(#ff-arrow-active)" : "url(#ff-arrow)"}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isActive ? "#f59e0b" : isFinalFlowEdge ? "#7c3aed" : "#334155"}
                  stroke="#f8fafc"
                  strokeWidth="3"
                  paintOrder="stroke"
                  fontSize="14"
                  fontWeight="700"
                  className="pointer-events-none"
                >
                  {`${edge.flow}/${edge.capacity}`}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {backwardEdges.map((edge) => {
            const from = positions[edge.from];
            const to = positions[edge.to];
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const unitX = dx / distance;
            const unitY = dy / distance;
            const perpX = -unitY;
            const perpY = unitX;

            const startX = from.x + unitX * nodeRadius;
            const startY = from.y + unitY * nodeRadius;
            const endX = to.x - unitX * (nodeRadius + 8);
            const endY = to.y - unitY * (nodeRadius + 8);

            const curveAmount = 26;
            const controlX = (startX + endX) / 2 + perpX * curveAmount;
            const controlY = (startY + endY) / 2 + perpY * curveAmount;

            return (
              <g key={`backward-${edge.from}-${edge.to}`}>
                <path
                  d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  markerEnd="url(#ff-arrow-back)"
                />
                <text
                  x={controlX}
                  y={controlY - 6}
                  textAnchor="middle"
                  fill="#d4d4d8"
                  fontSize="13"
                  fontWeight="700"
                  className="pointer-events-none"
                >
                  {`${-edge.flow}/0`}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {nodes.map((node) => {
            const pos = positions[node];
            if (!pos) return null;

            const isSource = node === source;
            const isSink = node === sink;
            const isCurrent = node === currentNode;
            const isVisited = visitedNodes.includes(node);
            const isPathNode = activePathEdges.some((edge) => edge.from === node || edge.to === node);

            let fill = "#f1f5f9";
            let stroke = "#94a3b8";
            let textFill = "#1e293b";

            if (isSource) {
              fill = "#2563eb";
              stroke = "#1d4ed8";
              textFill = "#ffffff";
            }
            if (isSink) {
              fill = "#0ea5e9";
              stroke = "#0284c7";
              textFill = "#ffffff";
            }
            if (isVisited && !isSource && !isSink) {
              fill = "#22c55e";
              stroke = "#16a34a";
              textFill = "#ffffff";
            }
            if (isPathNode && !isCurrent) {
              fill = "#f59e0b";
              stroke = "#d97706";
              textFill = "#ffffff";
            }
            if (isCurrent) {
              fill = "#ef4444";
              stroke = "#dc2626";
              textFill = "#ffffff";
            }

            return (
              <g key={node}>
                {(isCurrent || isPathNode) && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius + 7}
                    fill={isCurrent ? "#ef4444" : "#f59e0b"}
                    opacity={0.2}
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isCurrent || isPathNode ? 3 : 2}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={textFill}
                  fontSize={fontSize}
                  fontWeight="700"
                >
                  {node}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-slate-500" />
          <span className="font-medium">Forward: flow/capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 border-t-2 border-dashed border-zinc-400" />
          <span className="font-medium">Backward residual: -flow/0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-600" />
          <span className="font-medium">Current Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-amber-600" />
          <span className="font-medium">Augmenting Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-violet-500 border-2 border-violet-600" />
          <span className="font-medium">Final Max-Flow Edges</span>
        </div>
      </div>
    </div>
  );
}
