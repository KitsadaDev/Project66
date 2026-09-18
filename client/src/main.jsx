import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * จุดเริ่มต้นหลักของระบบฝั่ง Frontend (React 18 Entry Point)
 * - ค้นหา Element ราก (`<div id="root">`) ใน index.html
 * - เรนเดอร์แอปพลิเคชันภายใต้ `<StrictMode>` เพื่อตรวจสอบปัญหาและผลข้างเคียง (Side Effects) ระหว่างการพัฒนา
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
