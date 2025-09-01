import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import './index.css'
import { I18nextProvider } from 'react-i18next'
import AuthPage from './pages/auth/AuthPage'

import { Provider } from 'react-redux'
import { persistor, store } from './store/store'
import Toaster from './component/toast/Toaster'
import UserManagementDashboard from './pages/UserManagementDashboard/Components/UserManagementDashboard'
import { PersistGate } from 'redux-persist/integration/react'
import Accueil from './pages/UserManagementDashboard/Components/Accueil/Accueil'
import Backoffice from './pages/UserManagementDashboard/Components/Backoffice/Backoffice'
import DashboardLayout from '../DashboardLayout'
import DefaultLayout from '../DefaultLayout'

import AlbumDetailPage from './pages/UserManagementDashboard/Components/Backoffice/Album/AlbumDetailPage'
import AlbumPhoto from './pages/UserManagementDashboard/Components/Backoffice/Album/AlbumPhoto'
import Visualiseur from './pages/UserManagementDashboard/Components/Visualiseur/Visualiseur'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
function App() {

  return (
    <I18nextProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          {/* <Toaster /> */}
          <Router>
            <Routes>
              {/* Routes publiques avec la Navbar */}
              <Route element={<DefaultLayout />}>
                <Route path="/settings" element={<UserManagementDashboard />} />
                <Route path="/" element={<Accueil />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
      

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
              </Route>

              {/* Routes du tableau de bord avec la Sidebar */}
              <Route element={<DashboardLayout />}>
                <Route path="/backoffice" element={<Backoffice />} />
                <Route path="/backoffice/album/:albumName" element={<AlbumDetailPage />} />
                <Route path="/albumphoto" element={<AlbumPhoto />} />
                <Route path="/visualiseur/:photoName" element={<Visualiseur />} />
              </Route>

              {/* Page 404 (sans layout) */}
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
        </PersistGate>
    </Provider>
    </I18nextProvider>
  )
}

export default App