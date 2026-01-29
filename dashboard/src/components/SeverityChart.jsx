// src/components/Sidebar.jsx
import {
  LayoutDashboard,
  Video,
  Bell,
  Images,
  Settings,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react'
import {useSystem} from '../context/SystemContext'
import './Sidebar.css'

const navItems = [
  {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard},
  {id: 'camerawall', label: 'Camera Wall', icon: Video},
  {id: 'alerts', label: 'Alerts', icon: Bell},
  {id: 'gallery', label: 'Gallery', icon: Images},
  {id: 'settings', label: 'Settings', icon: Settings},
]

export function Sidebar() {
  const {activeTab, setActiveTab, theme, toggleTheme} = useSystem()

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon-wrapper">
          <AlertTriangle size={26} className="brand-icon" />
        </div>
        <span className="brand-text">AccidentAI</span>
      </div>

      <nav className="nav-menu">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-btn ${
                activeTab === item.id ? 'active' : ''
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  )
}
