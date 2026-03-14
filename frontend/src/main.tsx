import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppEduPlan from './AppEduPlan.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppEduPlan />
  </StrictMode>,
)
