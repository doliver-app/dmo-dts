// React
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// React Router
import { RouterProvider } from 'react-router-dom';
import { router } from "./routes"
// Fonts
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
// Stylesheet
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
