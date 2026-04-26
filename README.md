# ***Graphify*** 
## 1. Problem
Understanding graph algorithms is hard for many students.
Most students can read code or formulas, but they cannot clearly see:
- which node is visited now,
- which edge is selected now,
- and how the final answer is built step by step.

This project solves that problem by showing algorithm steps visually.

## 2. Why Graph Algorithm Visualization Is Difficult
Graph algorithms are dynamic. The graph keeps changing during execution.
A static diagram is usually not enough.

Common difficulties are:
- too many nodes and edges on one screen,
- hard to track visited, active, and final edges,
- confusion between directed and undirected graphs,
- confusion between weighted and unweighted input,
- students losing track of why one step happened.

This project addresses these issues with clear colors, step-by-step controls, and logs.

## 3. What We Had Before This Project
Before building this project, we had:
- algorithm theory from class,
- textbook examples,
- code implementations without interactive visuals.

What was missing:
- one place to test many algorithms,
- visual comparison of different algorithms,
- simple input format for quick experiments,
- clear learning flow from input to output.

## 4. What This Project Provides
BMP Graph Visualizer is a React web app that lets users:
- enter a graph using adjacency list input,
- run graph algorithms interactively,
- see live graph states (visited/current/highlighted),
- inspect result paths, trees, and edge sets,
- learn theorem-based graph ideas like Whitney connectivity.

## 5. Tech Stack
Frontend:
- React 19
- React Router DOM (For Routing)
- Vite (Bundler)

Styling/UI:
- Tailwind CSS 4
- Lucide React icons

Code quality and tooling:
- ESLint

## 6. Implemented Algorithms
The project includes simulations for:

Traversal and ordering:
- BFS
- DFS
- Topological Sort

Graph properties:
- Bipartite Check
- Connected Components
- Cycle Detection
- Whitney Connectivity Theorem
- Whitney 2-Connected Ear Decomposition

Shortest path:
- Dijkstra
- Bellman-Ford
- Floyd-Warshall

Spanning tree:
- Prim's MST
- Kruskal's MST
- Count of possible MSTs (utility support)

Flow network:
- Ford-Fulkerson (max flow with residual updates)

## 7. Common Flow of Algorithms in This Project
Most simulations follow a shared learning flow:

1. Input graph
- User enters an adjacency list.
- Example (unweighted):
  - A: B C
  - B: A D
  - C: A D
  - D: B C

2. Parse and normalize
- Input is parsed into a clean internal graph structure.
- Weighted algorithms use weighted parsing.

3. Validate graph
- Basic checks are applied (missing nodes, invalid format, etc.).

4. Initialize algorithm state
- Set starting node/source if needed.
- Reset visited sets, queues/stacks, distances, parents, or capacities.

5. Execute step by step
- Each step updates internal state.
- Logs explain what happened in simple language.

6. Visual update
- Nodes and edges are redrawn with highlights.
- Colors show active edges, selected result edges, and current focus node.

7. Final result
- The final path/tree/flow/result is displayed clearly.

## 8. How to Run the Project
From the project root:

```bash
cd client
npm install
npm run dev
```


