import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "../components/ui/button";
import Navbar from "../components/Navbar";
import FlowNetworkVisualization from "../components/FlowNetworkVisualization";
import FordFulkersonExecutor from "../utils/fordFulkerson";
import parseWeightedAdjList from "../utils/parseWeightedAdjList";

const MAX_NODES = 15;
const SIMULATION_DELAY = 1200;

export default function FordFulkersonSimulation() {
  const [input, setInput] = useState(
    "S: A(10) B(10)\nA: B(5) T(10)\nB: T(10)"
  );
  const adj = useMemo(() => parseWeightedAdjList(input), [input]);
  const nodes = useMemo(() => Object.keys(adj), [adj]);
  const [error, setError] = useState("");

  const [source, setSource] = useState(nodes[0] || "");
  const [sink, setSink] = useState(nodes[nodes.length - 1] || "");
  const [flowState, setFlowState] = useState({
    maxFlow: 0,
    iteration: 0,
    queue: [],
    visited: [],
    parent: {},
    currentNode: null,
    currentNeighbors: [],
    activePathEdges: [],
    activePathNodes: [],
    currentAugmentFlow: 0,
    lastAugmentedPathNodes: [],
    lastAugmentedFlow: 0,
    finalFlowEdges: [],
    residualCapacity: {},
    originalCapacity: {},
    log: [],
    done: false,
    mode: "start-bfs",
  });
  const [isSimulating, setIsSimulating] = useState(false);

  const executorRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  useMemo(() => {
    if (nodes.length > MAX_NODES) {
      setError(`Too many nodes! Maximum allowed: ${MAX_NODES}`);
      return;
    }

    if (nodes.length === 0) {
      setError("Please enter a valid graph.");
      return;
    }

    setError("");

    if (!nodes.includes(source)) {
      setSource(nodes[0]);
    }

    if (!nodes.includes(sink)) {
      setSink(nodes[nodes.length - 1]);
    }

    stopSimulation();
    const safeSource = nodes.includes(source) ? source : nodes[0];
    const safeSink = nodes.includes(sink) ? sink : nodes[nodes.length - 1];

    executorRef.current = new FordFulkersonExecutor(adj, safeSource, safeSink);
    setFlowState(executorRef.current.getState());
  }, [input]);

  useEffect(() => {
    return () => stopSimulation();
  }, []);

  function stopSimulation() {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  }

  function reset() {
    stopSimulation();
    executorRef.current = new FordFulkersonExecutor(adj, source, sink);
    setFlowState(executorRef.current.getState());
  }

  function step() {
    if (!executorRef.current) {
      executorRef.current = new FordFulkersonExecutor(adj, source, sink);
    }

    const state = executorRef.current.step();
    setFlowState(state);

    if (state.done) {
      stopSimulation();
    }
  }

  function startSimulation() {
    if (isSimulating) {
      stopSimulation();
      return;
    }

    executorRef.current = new FordFulkersonExecutor(adj, source, sink);
    setFlowState(executorRef.current.getState());
    setIsSimulating(true);

    simulationIntervalRef.current = setInterval(() => {
      if (!executorRef.current) return;

      const state = executorRef.current.step();
      setFlowState(state);

      if (state.done) {
        stopSimulation();
      }
    }, SIMULATION_DELAY);
  }

  const parentEntries = useMemo(() => {
    return Object.entries(flowState.parent || {});
  }, [flowState.parent]);

  const statusLines = useMemo(() => {
    const lines = [];

    if (flowState.done) {
      lines.push(`Final max flow = ${flowState.maxFlow}`);
      if (flowState.lastAugmentedPathNodes.length) {
        lines.push(
          `Last augmenting path: ${flowState.lastAugmentedPathNodes.join(" -> ")} (flow ${flowState.lastAugmentedFlow})`
        );
      }
      return lines;
    }

    if (flowState.mode === "start-bfs" || flowState.mode === "dequeue" || flowState.mode === "explore-neighbors") {
      lines.push(`Running BFS iteration ${flowState.iteration || 1} to find path from ${source} to ${sink}`);
    }

    if (flowState.mode === "show-path") {
      lines.push(`BFS found full path: ${flowState.activePathNodes.join(" -> ")}`);
      lines.push(`Minimum residual on path = ${flowState.currentAugmentFlow}`);
    }

    if (flowState.mode === "augment") {
      lines.push(`Reducing forward residual capacity by ${flowState.currentAugmentFlow}`);
      lines.push("Adding same value to reverse residual edges.");
    }

    if (!lines.length) {
      lines.push("Press Step or Start Simulation to begin BFS path search.");
    }

    return lines;
  }, [flowState, source, sink]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Ford-Fulkerson Algorithm</h1>
            <p className="text-muted-foreground mt-2">
              Visualize max flow using BFS-based augmenting paths (Edmonds-Karp)
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <label className="block text-sm font-medium mb-2">
                  Flow Network Input (Directed, Capacity)
                </label>
                <textarea
                  className="w-full min-h-32 max-h-80 p-3 rounded-md bg-background border border-border text-foreground font-mono text-sm resize-none overflow-auto"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="S: A(10) B(10)&#10;A: B(5) T(10)&#10;B: T(10)"
                  rows={Math.min(Math.max(4, input.split("\n").length + 1), 20)}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-muted-foreground">Format: Node: Neighbor(Capacity) ...</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-sm font-medium">Source</label>
                    <select
                      className="w-full p-2 rounded bg-background border border-border mt-1"
                      value={source}
                      onChange={(e) => {
                        setSource(e.target.value);
                        stopSimulation();
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
                    <label className="text-sm font-medium">Sink</label>
                    <select
                      className="w-full p-2 rounded bg-background border border-border mt-1"
                      value={sink}
                      onChange={(e) => {
                        setSink(e.target.value);
                        stopSimulation();
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
                  <Button onClick={reset} variant="outline" className="flex-1" disabled={isSimulating}>
                    Reset
                  </Button>
                  <Button
                    onClick={step}
                    variant="outline"
                    className="flex-1"
                    disabled={isSimulating || flowState.done || !!error || source === sink}
                  >
                    Step
                  </Button>
                  <Button
                    onClick={startSimulation}
                    className="flex-1"
                    variant={isSimulating ? "destructive" : "default"}
                    disabled={!!error || source === sink}
                  >
                    {isSimulating ? "Stop" : "Start Simulation"}
                  </Button>
                </div>
                {source === sink && (
                  <p className="text-xs text-red-500 mt-2">Source and sink must be different nodes.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg p-6 bg-card border border-border text-foreground">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Max Flow</h4>
                  <p className="text-3xl font-bold text-foreground">{flowState.maxFlow}</p>
                  <p className="text-sm mt-2 text-muted-foreground">BFS Round: {flowState.iteration}</p>
                </div>

                <div className="rounded-lg p-6 bg-card border border-border text-foreground">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Bottleneck</h4>
                  <p className="text-3xl font-bold text-foreground">{flowState.currentAugmentFlow || 0}</p>
                  <p className="text-sm mt-2 text-muted-foreground">Mode: {flowState.mode}</p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Queue</h4>
                <div className="min-h-10 flex items-center gap-2 flex-wrap">
                  {flowState.queue.length ? (
                    flowState.queue.map((node, index) => (
                      <div
                        key={`${node}-${index}`}
                        className="px-3 py-1 rounded bg-blue-500 text-white text-sm font-medium"
                      >
                        {node}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">(empty)</div>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Parent Array</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {parentEntries.length ? (
                    parentEntries.map(([node, parent]) => (
                      <div
                        key={node}
                        className="px-3 py-2 rounded bg-muted text-sm font-mono flex justify-between items-center"
                      >
                        <span className="font-bold">{node}:</span>
                        <span>{parent ?? "-"}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">(not initialized)</div>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Current Augmenting Path</h4>
                {flowState.activePathNodes.length ? (
                  <p className="font-mono text-sm">{flowState.activePathNodes.join(" -> ")}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">(no path found in current round)</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Last Applied Path</h4>
                {flowState.lastAugmentedPathNodes.length ? (
                  <>
                    <p className="font-mono text-sm">{flowState.lastAugmentedPathNodes.join(" -> ")}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Flow added on this path: {flowState.lastAugmentedFlow}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">(no augmentation applied yet)</p>
                )}
              </div>

              {flowState.done && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Final Flow That Gives Max Flow</h4>
                  {flowState.finalFlowEdges.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {flowState.finalFlowEdges.map((edge) => (
                        <div
                          key={`${edge.from}-${edge.to}`}
                          className="px-3 py-2 rounded bg-muted text-sm font-mono flex justify-between items-center"
                        >
                          <span className="font-bold">{edge.from}→{edge.to}</span>
                          <span>{edge.flow}/{edge.capacity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">(all final flows are 0)</p>
                  )}
                </div>
              )}

              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Execution Log</h4>
                <div className="max-h-96 overflow-auto text-sm font-mono">
                  {flowState.log.length ? (
                    flowState.log.map((entry, index) => (
                      <div
                        key={index}
                        className={`py-1 ${
                          entry.includes("===") || entry.startsWith("Starting") || entry.includes("Complete")
                            ? "text-foreground font-bold"
                            : entry.startsWith("  Update")
                            ? "text-green-600 pl-4 font-semibold"
                            : entry.startsWith("  ")
                            ? "text-muted-foreground pl-4"
                            : "text-foreground"
                        }`}
                      >
                        {entry}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">(no steps yet)</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <FlowNetworkVisualization
                adjacencyList={adj}
                originalCapacity={flowState.originalCapacity}
                residualCapacity={flowState.residualCapacity}
                activePathEdges={flowState.activePathEdges}
                finalFlowEdges={flowState.finalFlowEdges}
                showFinalFlow={flowState.done}
                statusLines={statusLines}
                visitedNodes={flowState.visited}
                currentNode={flowState.currentNode}
                currentNeighbors={flowState.currentNeighbors}
                source={source}
                sink={sink}
                width={640}
                height={540}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
