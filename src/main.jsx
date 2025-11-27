import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n'; // Importez la configuration i18n
import 'leaflet/dist/leaflet.css';
import "react-datepicker/dist/react-datepicker.css";


createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
