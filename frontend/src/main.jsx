import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useAuthStore } from './stores/authStore'

// Initialize auth state
useAuthStore.getState().initialize()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
