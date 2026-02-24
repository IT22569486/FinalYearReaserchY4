import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import BusList from './pages/BusList'
import BusDetail from './pages/BusDetail'
import MapView from './pages/MapView'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/buses" element={<BusList />} />
          <Route path="/buses/:vehicleId" element={<BusDetail />} />
          <Route path="/map" element={<MapView />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
