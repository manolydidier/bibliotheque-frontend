import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import './index.css'
import Navbar from './component/navbar/Navbar'
import { I18nextProvider } from 'react-i18next'
import AuthPage from './pages/auth/AuthPage'

import { Provider } from 'react-redux'
import { store } from './store/store'



function App() {

  return (
    <I18nextProvider>
      <Provider store={store}>
      <Router>
        <Navbar/>
       
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-blue-600 mb-4">
                  Hello Tailwind!
                </h1>
                <p className="text-gray-600 bg-red-500">
                  Tailwind CSS fonctionne parfaitementd 🎉
                </p>
              </div>
            </div>
          } />
         
          {/* Exemple de route pour une page About que vous pourriez créer plus tard */}
          <Route path="/about" element={
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-blue-600 mb-4">
                  Page About
                </h1>
                <p className="text-gray-600">
                  Cette page sera créée ultérieurement
                </p>
              </div>
            </div>
          } />
          
          {/* Route pour les pages non trouvées */}
          <Route path="*" element={
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-red-600 mb-4">
                  404 - Page Not Found
                </h1>
                <p className="text-gray-600">
                  La page que vous recherchez n'existe pas
                </p>
              </div>
            </div>
          } />
        </Routes>
      </Router>
       
    </Provider>
    </I18nextProvider>
  )
}

export default App