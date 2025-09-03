import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';

import { rehydrateAuthFromStorage } from './features/auth/authActions';

// Pages
import AuthPage from './pages/auth/AuthPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import UserManagementDashboard from './pages/UserManagementDashboard/Components/UserManagementDashboard';
import Accueil from './pages/UserManagementDashboard/Components/Accueil/Accueil';
import Backoffice from './pages/UserManagementDashboard/Components/Backoffice/Backoffice';
import AlbumDetailPage from './pages/UserManagementDashboard/Components/Backoffice/Album/AlbumDetailPage';
import AlbumPhoto from './pages/UserManagementDashboard/Components/Backoffice/Album/AlbumPhoto';
import Visualiseur from './pages/UserManagementDashboard/Components/Visualiseur/Visualiseur';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import DefaultLayout from './layouts/DefaultLayout';

// Guards
import { RequireAuth, RequireGuest } from './routes/RouteGuards';

import './App.css';
import './index.css';
import DebugAuth from './routes/DebugAuth';
import MediaLibrary from './pages/media-library';

function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const hasToken = localStorage.getItem('tokenGuard');
    if (hasToken) {
      dispatch(rehydrateAuthFromStorage());
    }
  }, [dispatch]);

  return children;
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AuthInitializer>
            <Router>
              <Routes>
                {/* Routes publiques */}
                <Route element={<DefaultLayout />}>
                  <Route index element={<Accueil />} />
                  
                  {/* Pages invités uniquement */}
                  <Route element={<RequireAuth redirectTo="/" />}>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                  </Route>

                  <Route
                    path="/about"
                    element={
                      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                        <div className="bg-white p-8 rounded-lg shadow-md">
                          <h1 className="text-3xl font-bold text-blue-600 mb-4">Page About</h1>
                          <p className="text-gray-600">Cette page sera créée ultérieurement</p>
                        </div>
                      </div>
                    }
                  />
                </Route>
              
                {/* Routes protégées avec DefaultLayout */}
                <Route element={<RequireGuest redirectTo="/auth" />}>
                  <Route element={<DefaultLayout />}>
                    <Route path="/settings" element={<UserManagementDashboard />} />
                  </Route>
                </Route>

                {/* Routes protégées avec DashboardLayout */}
                <Route element={<RequireGuest redirectTo="/auth" />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/backoffice" element={<Backoffice />} />
                    <Route path="/backoffice/album/:albumName" element={<AlbumDetailPage />} />
                    <Route path="/albumphoto" element={<AlbumPhoto />} />
                    <Route path="/visualiseur/:photoName" element={<Visualiseur />} />
                  </Route>
                </Route>

                {/* 404 */}
                <Route
                  path="*"
                  element={
                    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                      <div className="bg-white p-8 rounded-lg shadow-md">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">404 - Page introuvable</h1>
                        <p className="text-gray-600">La page que vous recherchez n'existe pas.</p>
                      </div>
                    </div>
                  }
                />
                {/* Ajout des routes pour PageMedias et Visualiseur */}
                <Route path="/medias" element={<MediaLibrary />} />
                <Route path="/visualiseur/:photoName" element={<Visualiseur />} />
              </Routes>
            </Router>
            {/* <DebugAuth/> */}
          </AuthInitializer>
        </PersistGate>
      </Provider>
    </I18nextProvider>
  );
}