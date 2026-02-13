import { useState } from 'react'
import {Routes, Route} from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BFSSimulation from './pages/BFSSimulation.jsx'
import DFSSimulation from './pages/DFSSimulation.jsx'
import NotFound from './pages/NotFound.jsx'

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bfs" element={<BFSSimulation/>} />
        <Route path="/dfs" element={<DFSSimulation/>} />
        <Route path="*" element={<NotFound/>} />
      </Routes>
    </>
  )
}
  
export default App
