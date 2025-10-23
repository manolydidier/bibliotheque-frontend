import React, { useEffect, useState } from 'react';
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

import Visualiseur from './pages/media-library/Visualiseur/Visualiseur';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import DefaultLayout from './layouts/DefaultLayout';

// Guards
import { RequireAuth, RequireGuest } from './routes/RouteGuards';

import './App.css';
import './index.css';
import DebugAuth from './routes/DebugAuth';
import MediaLibrary from './pages/media-library';
import Configuration from './pages/UserManagementDashboard/Components/Backoffice/configuration/configuration';
import ArticlesPage from './pages/media-library/ArticlesPage';
import ArticlesIndex from './pages/UserManagementDashboard/Components/Backoffice/articles/ArticlesIndex';
import ArticleEditCreate from './pages/UserManagementDashboard/Components/Backoffice/articles/ArticleEditCreate';
import TrashedPage from './pages/UserManagementDashboard/Components/Backoffice/articles/TrashedPage';
import Dashboard from './pages/UserManagementDashboard/Components/Backoffice/dashboard/Dashboard';

function BootScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-600">Initialisation…</p>
      </div>
    </div>
  );
}

// ✅ Garde module-scope pour éviter le double-dispatch en React 18 StrictMode
let __rehydrateBootDone = false;

function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (__rehydrateBootDone) {
      setBooted(true);
      return;
    }
    __rehydrateBootDone = true;

    // Lance la réhydratation (idempotente : sort si aucun token en storage)
    Promise.resolve(dispatch(rehydrateAuthFromStorage()))
      .finally(() => setBooted(true));
  }, [dispatch]);

  if (!booted) return <BootScreen />;
  return children;
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <PersistGate loading={<BootScreen />} persistor={persistor}>
          <AuthInitializer>
            <Router>
              <Routes>
                {/* Routes publiques */}
                <Route element={<DefaultLayout />}>
                  <Route index element={<Accueil />} />

                  {/* Pages invités uniquement */}
                  <Route element={<RequireGuest redirectTo="/" />}>
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
                <Route element={<RequireAuth redirectTo="/auth" />}>
                  <Route element={<DefaultLayout />}>
                    <Route path="/settings" element={<UserManagementDashboard />} />
                    <Route path="/articles" element={<ArticlesPage />} />
                    <Route path="/articles/:show" element={<Visualiseur />} />
                  </Route>
                </Route>

                {/* Routes protégées avec DashboardLayout */}
                <Route element={<RequireAuth redirectTo="/auth" />}>
                  <Route element={<DashboardLayout />}>
                   
                    <Route path="/visualiseur/:articleslug" element={<Visualiseur />} />
                    <Route path="/configuration" element={<Configuration />} />
                    <Route path="/dashboard" element={<Dashboard  />} />


                    <Route path="/articlescontroler" element={<ArticlesIndex />} />
                    <Route path="/articles/new" element={<ArticleEditCreate />} />
                    <Route path="/articles/:id/edit" element={<ArticleEditCreate />} />
                    <Route path="/articles/trashed" element={<TrashedPage />} />
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
              </Routes>
            </Router>
            {/* <DebugAuth/> */}
          </AuthInitializer>
        </PersistGate>
      </Provider>
    </I18nextProvider>
  );
}
