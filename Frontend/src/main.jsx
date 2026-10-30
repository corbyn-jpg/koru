import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { CoursesProvider } from './contexts/CoursesContext'
import { CalendarProvider } from './contexts/CalendarContext'
import { installApiAuth } from './services/apiAuth'

installApiAuth()

// Mount the React app into the #root div defined in index.html
// StrictMode enables extra development warnings for common mistakes
// AuthProvider wraps the entire tree so auth state is available everywhere
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <CoursesProvider>
        <CalendarProvider>
          <App />
        </CalendarProvider>
      </CoursesProvider>
    </AuthProvider>
  </StrictMode>,
)
