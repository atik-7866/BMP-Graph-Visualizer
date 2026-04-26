import { useEffect, useMemo, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import GraphVisualization from "../components/GraphVisualization";
import { Button } from "../components/ui/button";
import parseAdjList from "../utils/parseAdjList";
import {
  findArticulationPoints,
  findTwoDisjointPaths,
  isGraphConnected,
  normalizeTwoConnectedInput,
  WhitneyTwoConnectedExecutor,
} from "../utils/whitneyTwoConnectedSimple";

const MAX_NODES = 12;
const SIMULATION_DELAY = 1500; // milliseconds between steps

function toPathEdges(path) {
  const edges = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    edges.push({ from: path[i], to: path[i + 1] });
  }
  return edges;
}

function edgeToKey(u, v) {
  return u < v ? `${u}::${v}` : `${v}::${u}`;
}

export default function WhitneyTwoConnectedSimulation() {
  const [input, setInput] = useState("A: B C D\nB: A C\nC: A B D E\nD: A C E\nE: C D");
  const parsedAdj = useMemo(() => parseAdjList(input), [input]);
  const normalized = useMemo(() => normalizeTwoConnectedInput(parsedAdj), [parsedAdj]);
  const nodes = normalized.nodes;

  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("decomposition"); // "decomposition" or "disjoint-paths"
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [paths, setPaths] = useState([]);
  const [pathError, setPathError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  // Whitney 2-connected decomposition state
  const [whitneyState, setWhitneyState] = useState({
    constructedNodes: [],
    currentEar: null,
    selectedU: null,
    selectedV: null,
    usedEdges: [],
    unusedEdges: [],
    log: [],
    done: false,
    phase: "finding_cycle",
    stepCount: 0,
    initialCycle: [],
  });
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Interactive mode state
  const [interactiveMode, setInteractiveMode] = useState(true);
  const [uSelected, setUSelected] = useState(null);
  const [vSelected, setVSelected] = useState(null);
  const [interactiveError, setInteractiveError] = useState("");

  const executorRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  useEffect(() => {
    if (nodes.length > MAX_NODES) {
      setError(`Too many nodes! Maximum allowed: ${MAX_NODES}`);
      return;
    }

    if (nodes.length === 0) {
      setError("Please enter a valid graph.");
      return;
    }

    setError("");
  }, [nodes]);

  useEffect(() => {
    setPaths([]);
    setPathError("");
    setAnalysis(null);
    stopSimulation();
    resetWhitney();
  }, [input]);

  useEffect(() => {
    if (!nodes.length) {
      setSource("");
      setTarget("");
      return;
    }

    if (!nodes.includes(source)) {
      setSource(nodes[0]);
    }

    if (!nodes.includes(target)) {
      setTarget(nodes[1] || nodes[0]);
    }
  }, [nodes, source, target]);

  function stopSimulation() {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  }

  function resetWhitney() {
    stopSimulation();
    setUSelected(null);
    setVSelected(null);
    setInteractiveError("");
    if (nodes.length > 0) {
      executorRef.current = new WhitneyTwoConnectedExecutor(normalized);
      setWhitneyState(executorRef.current.getState());
    }
  }

  function handleSelectU(node) {
    setUSelected(node);
    setInteractiveError("");
  }

  function handleSelectV(node) {
    setVSelected(node);
    setInteractiveError("");
  }

  function handleFindPath() {
    if (!executorRef.current) {
      executorRef.current = new WhitneyTwoConnectedExecutor(normalized);
    }

    if (!uSelected || !vSelected) {
      setInteractiveError("Select both u and v");
      return;
    }

    if (uSelected === vSelected) {
      setInteractiveError("u and v must be different");
      return;
    }

    const success = executorRef.current.selectAndFindPath(uSelected, vSelected);
    if (success) {
      setWhitneyState(executorRef.current.getState());
      setInteractiveError("");
    } else {
      setInteractiveError(executorRef.current.log[executorRef.current.log.length - 1]);
    }
  }

  function handleMergeEar() {
    if (!executorRef.current) return;

    const success = executorRef.current.mergeEar();
    if (success) {
      setWhitneyState(executorRef.current.getState());
      setUSelected(null);
      setVSelected(null);
    }
  }

  function stepWhitney() {
    if (!executorRef.current) {
      executorRef.current = new WhitneyTwoConnectedExecutor(normalized);
    }
    const state = executorRef.current.step();
    setWhitneyState(state);
    if (state.done) {
      stopSimulation();
    }
  }

  function startWhitneySimulation() {
    if (isSimulating) {
      stopSimulation();
      return;
    }

    if (!executorRef.current) {
      executorRef.current = new WhitneyTwoConnectedExecutor(normalized);
    }
    setIsSimulating(true);

    simulationIntervalRef.current = setInterval(() => {
      if (!executorRef.current) return;

      const state = executorRef.current.step();
      setWhitneyState(state);

      if (state.done) {
        stopSimulation();
      }
    }, SIMULATION_DELAY);
  }

  function resetPaths() {
    setPaths([]);
    setPathError("");
  }

  function handleFindPaths() {
    if (error) return;

    if (!source || !target) {
      setPathError("Select two nodes.");
      setPaths([]);
      return;
    }

    if (source === target) {
      setPathError("Select two different nodes.");
      setPaths([]);
      return;
    }

    const result = findTwoDisjointPaths(normalized, source, target);
    if (!result.paths.length) {
      setPathError("Could not find two internally vertex-disjoint paths.");
      setPaths([]);
      return;
    }

    setPathError("");
    setPaths(result.paths);
  }

  function handleCheckTwoConnected() {
    if (error) return;
    const articulationPoints = findArticulationPoints(nodes, normalized.undirected);
    const connected = isGraphConnected(nodes, normalized.undirected);
    const isTwoConnected = connected && nodes.length > 1 && articulationPoints.length === 0;
    setAnalysis({ articulationPoints, connected, isTwoConnected });
  }

  // Build visualization data for Whitney decomposition
  const buildWhitneyVisualizationData = () => {
    const constructedNodesSet = new Set(whitneyState.constructedNodes);
    const usedEdgesSet = new Set(whitneyState.usedEdges);
    const currentEarSet = new Set();
    const selectedNodesSet = new Set();

    // Get edges from used edges
    const constructedEdges = Array.from(usedEdgesSet).map((key) => {
      const [u, v] = key.split("::");
      return { from: u, to: v };
    });

    // Get current ear edges
    if (whitneyState.currentEar) {
      for (let i = 0; i < whitneyState.currentEar.length - 1; i++) {
        const u = whitneyState.currentEar[i];
        const v = whitneyState.currentEar[i + 1];
        const key = edgeToKey(u, v);
        currentEarSet.add(key);
      }
    }

    const earEdges = Array.from(currentEarSet).map((key) => {
      const [u, v] = key.split("::");
      return { from: u, to: v };
    });

    // Mark selected u and v
    if (whitneyState.selectedU) selectedNodesSet.add(whitneyState.selectedU);
    if (whitneyState.selectedV) selectedNodesSet.add(whitneyState.selectedV);

    const highlightedEdgeGroups = [];

    // Constructed (RED) edges
    if (constructedEdges.length > 0) {
      highlightedEdgeGroups.push({
        label: "Constructed (G)",
        color: "#ef4444",
        edges: constructedEdges,
      });
    }

    // Current ear (BLUE) edges
    if (earEdges.length > 0) {
      highlightedEdgeGroups.push({
        label: "Current Ear",
        color: "#3b82f6",
        edges: earEdges,
      });
    }

    return {
      highlightedEdgeGroups,
      highlightedNodes: Array.from(selectedNodesSet),
      highlightedNodeColor: { fill: "#f59e0b", stroke: "#d97706", text: "#ffffff" },
    };
  };

  const whitneyVizData = buildWhitneyVisualizationData();

  const pathEdgeGroups = useMemo(() => {
    if (!paths.length) return [];
    const colors = ["#22c55e", "#3b82f6"];
    return paths.slice(0, 2).map((path, index) => ({
      label: `Path ${index + 1}`,
      color: colors[index] || "#a855f7",
      edges: toPathEdges(path),
    }));
  }, [paths]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Whitney's 2-Connected Decomposition</h1>
            <p className="text-muted-foreground mt-2">
              Iteratively construct a 2-connected graph using initial cycle and ear decomposition
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === "decomposition" ? "default" : "outline"}
              onClick={() => setViewMode("decomposition")}
            >
              Decomposition
            </Button>
            <Button
              variant={viewMode === "disjoint-paths" ? "default" : "outline"}
              onClick={() => setViewMode("disjoint-paths")}
            >
              2-Connected Analysis
            </Button>
          </div>

          {viewMode === "decomposition" ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <label className="block text-sm font-medium mb-2">
                    Graph Input (Undirected Adjacency List)
                  </label>
                  <textarea
                    className="w-full min-h-32 max-h-80 p-3 rounded-md bg-background border border-border text-foreground font-mono text-sm resize-none overflow-auto"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="A: B C\nB: A C\nC: A B"
                    rows={Math.min(Math.max(4, input.split("\n").length + 1), 20)}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-muted-foreground">Format: Node: Neighbor1 Neighbor2 ...</p>
                    <p
                      className={`text-xs font-medium ${
                        error
                          ? "text-red-500"
                          : nodes.length > MAX_NODES * 0.8
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {nodes.length}/{MAX_NODES} nodes
                    </p>
                  </div>
                  {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={resetWhitney}
                      variant="outline"
                      className="flex-1"
                      disabled={isSimulating || nodes.length === 0}
                    >
                      Reset
                    </Button>
                    {/* <Button
                      onClick={stepWhitney}
                      variant="outline"
                      className="flex-1"
                      disabled={isSimulating || whitneyState.done || nodes.length === 0}
                    >
                      Step
                    </Button>
                    <Button
                      onClick={startWhitneySimulation}
                      className="flex-1"
                      variant={isSimulating ? "destructive" : "default"}
                      disabled={!!error}
                    >
                      {isSimulating ? "Stop" : "Animate"}
                    </Button> */}
                  </div>
                </div>

                {/* Interactive vertex selection */}
                {!whitneyState.done && whitneyState.constructedNodes.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Step {whitneyState.stepCount + 1}</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select u and v from the RED graph, then find and merge a path with new vertices
                    </p>

                    <div className="space-y-3">
                      {/* Select U */}
                      <div>
                        <label className="text-xs font-medium mb-2 block">Select u:</label>
                        <div className="flex flex-wrap gap-2">
                          {whitneyState.constructedNodes.map((node) => (
                            <Button
                              key={node}
                              variant={uSelected === node ? "default" : "outline"}
                              size="sm"
                              onClick={() => setUSelected(node)}
                              className="text-xs"
                            >
                              {node}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Select V */}
                      <div>
                        <label className="text-xs font-medium mb-2 block">Select v:</label>
                        <div className="flex flex-wrap gap-2">
                          {whitneyState.constructedNodes.map((node) => (
                            <Button
                              key={node}
                              variant={vSelected === node ? "default" : "outline"}
                              size="sm"
                              onClick={() => setVSelected(node)}
                              className="text-xs"
                            >
                              {node}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {interactiveError && <p className="text-xs text-red-500 font-medium">{interactiveError}</p>}

                      {/* Action buttons */}
                      {!whitneyState.currentEar ? (
                        <Button
                          onClick={handleFindPath}
                          className="w-full"
                          disabled={!uSelected || !vSelected}
                        >
                          Find Path (BLUE)
                        </Button>
                      ) : (
                        <Button onClick={handleMergeEar} className="w-full">
                          Merge to RED
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-card border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Algorithm Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phase:</span>
                      <span className="font-mono font-medium">{whitneyState.phase}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Step:</span>
                      <span className="font-mono font-medium">{whitneyState.stepCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Constructed Nodes:</span>
                      <span className="font-mono font-medium">{whitneyState.constructedNodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Edges Used:</span>
                      <span className="font-mono font-medium">{whitneyState.usedEdges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`font-medium ${whitneyState.done ? "text-green-600" : "text-amber-600"}`}>
                        {whitneyState.done ? "✓ Complete" : "In Progress"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Color Legend</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-muted-foreground">RED: Constructed graph</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-muted-foreground">BLUE: Current ear being added</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-400 rounded"></div>
                      <span className="text-muted-foreground">ORANGE: Selected endpoints (u, v)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 max-h-80 overflow-y-auto">
                  <h4 className="font-semibold mb-3">Execution Log</h4>
                  <div className="space-y-1 text-xs font-mono">
                    {whitneyState.log.length > 0 ? (
                      whitneyState.log.map((logLine, idx) => (
                        <div key={idx} className="text-muted-foreground">
                          {logLine}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">(no logs yet)</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <GraphVisualization
                  adjacencyList={normalized.displayAdj}
                  highlightedEdgeGroups={whitneyVizData.highlightedEdgeGroups}
                  highlightedNodes={whitneyVizData.highlightedNodes}
                  highlightedNodeLabel="Selected (u, v)"
                  highlightedNodeColor={whitneyVizData.highlightedNodeColor}
                  width={600}
                  height={500}
                />
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <label className="block text-sm font-medium mb-2">Graph Input (Undirected Adjacency List)</label>
                  <textarea
                    className="w-full min-h-32 max-h-80 p-3 rounded-md bg-background border border-border text-foreground font-mono text-sm resize-none overflow-auto"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="A: B C\nB: A C\nC: A B"
                    rows={Math.min(Math.max(4, input.split("\n").length + 1), 20)}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-muted-foreground">Format: Node: Neighbor1 Neighbor2 ...</p>
                    <p
                      className={`text-xs font-medium ${
                        error
                          ? "text-red-500"
                          : nodes.length > MAX_NODES * 0.8
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {nodes.length}/{MAX_NODES} nodes
                    </p>
                  </div>
                  {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex gap-3">
                    <Button onClick={handleCheckTwoConnected} className="flex-1" disabled={!!error}>
                      Check 2-Connected
                    </Button>
                  </div>
                </div>

                {analysis && (
                  <>
                    <div
                      className={`rounded-lg p-4 border ${
                        analysis.isTwoConnected ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"
                      }`}
                    >
                      <h4 className="font-semibold mb-1">2-Connected Status</h4>
                      <p className="text-sm font-medium">
                        {analysis.isTwoConnected ? "✓ 2-Connected" : "✗ Not 2-Connected"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {analysis.connected
                          ? "Graph is connected. Articulation points decide 2-connectedness."
                          : "Graph is disconnected, so it cannot be 2-connected."}
                      </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Articulation Points</h4>
                      <div className="min-h-10 flex items-center gap-2 flex-wrap">
                        {analysis.articulationPoints.length ? (
                          analysis.articulationPoints.map((node) => (
                            <div
                              key={node}
                              className="px-3 py-1 rounded bg-purple-500 text-white text-sm font-medium"
                            >
                              {node}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">(none)</div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold">Pick u, v and show 2 vertex-disjoint paths</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">u</label>
                      <select
                        className="w-full p-2 rounded bg-background border border-border"
                        value={source}
                        onChange={(e) => {
                          setSource(e.target.value);
                          resetPaths();
                        }}
                      >
                        {nodes.map((node) => (
                          <option key={node} value={node}>
                            {node}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">v</label>
                      <select
                        className="w-full p-2 rounded bg-background border border-border"
                        value={target}
                        onChange={(e) => {
                          setTarget(e.target.value);
                          resetPaths();
                        }}
                      >
                        {nodes.map((node) => (
                          <option key={node} value={node}>
                            {node}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={resetPaths} variant="outline" className="flex-1">
                      Reset Paths
                    </Button>
                    <Button onClick={handleFindPaths} className="flex-1" disabled={!!error}>
                      Find 2 Paths
                    </Button>
                  </div>

                  {pathError && <p className="text-xs text-red-500 font-medium">{pathError}</p>}
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Vertex-Disjoint Paths</h4>
                  {paths.length ? (
                    <div className="space-y-2 text-sm font-mono">
                      {paths.map((path, index) => (
                        <div key={`${index}-${path.join("-")}`} className="text-muted-foreground">
                          Path {index + 1}: {path.join(" → ")}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">(no paths yet)</div>
                  )}
                </div>
              </div>

              <div>
                <GraphVisualization
                  adjacencyList={normalized.displayAdj}
                  highlightedEdgeGroups={pathEdgeGroups}
                  highlightedNodes={analysis?.articulationPoints || []}
                  highlightedNodeLabel="Articulation"
                  highlightedNodeColor={{ fill: "#a855f7", stroke: "#7e22ce", text: "#ffffff" }}
                  width={600}
                  height={500}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
