// App.jsx (ou src/App.jsx selon ton arborescence)
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import { Provider, useDispatch, useSelector } from 'react-redux';
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

import Configuration from './pages/UserManagementDashboard/Components/Backoffice/configuration/configuration';
import ArticlesPage from './pages/media-library/ArticlesPage';
import ArticlesIndex from './pages/UserManagementDashboard/Components/Backoffice/articles/ArticlesIndex';
import ArticleEditCreate from './pages/UserManagementDashboard/Components/Backoffice/articles/ArticleEditCreate';
import TrashedPage from './pages/UserManagementDashboard/Components/Backoffice/articles/TrashedPage';
import Dashboard from './pages/UserManagementDashboard/Components/Backoffice/dashboard/Dashboard';
import NotFoundPage from './component/NotFound/NotFoundPage';

/* 🔹 AJOUTS: hook + helper pour rôles/permissions (mêmes que Comments.jsx) */
import useMeFromLaravel from './hooks/useMeFromLaravel';
import { computeRights } from './utils/access';
import TermsOfUse from './pages/auth/TermsOfUse';
import DocumentationPage from './pages/Divers/Documentation';
import UserGuidePage from './pages/Divers/UserGuide';
import FAQPage from './pages/Divers/FAQ';
import AboutPage from './pages/About/About';
import SocietesIndex from './pages/UserManagementDashboard/Components/Backoffice/TenantId/Societe/SocietesIndex';
import SocieteEditCreate from './pages/UserManagementDashboard/Components/Backoffice/TenantId/Societe/SocieteEditCreate';
import BureauxIndex from './pages/UserManagementDashboard/Components/Backoffice/TenantId/Bureau/BureauxIndex';
import BureauEditCreate from './pages/UserManagementDashboard/Components/Backoffice/TenantId/Bureau/BureauEditCreate';
import BureauPublicShow from './pages/UserManagementDashboard/Components/Backoffice/TenantId/Bureau/BureauPublicShow';
import ContactMessagesIndex from './pages/UserManagementDashboard/Components/Backoffice/TenantId/Messagerie/ContactMessagesIndex';
import HomeMiradia from './pages/Miradia/HomeMiradia';
import MiradiaSlidesIndex from './pages/UserManagementDashboard/Components/Backoffice/Miradia/Slide/MiradiaSlidesIndex';
import MiradiaSlideForm from './pages/UserManagementDashboard/Components/Backoffice/Miradia/Slide/MiradiaSlideForm';
import OrgNodesIndex from './pages/UserManagementDashboard/Components/Backoffice/Miradia/orgchart/OrgNodesIndex';
import OrgNodeForm from './pages/UserManagementDashboard/Components/Backoffice/Miradia/orgchart/OrgNodeForm';
import CmsSectionForm from './pages/UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionForm';
import CmsSectionsIndex from './pages/UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionsIndex';

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

  // Exemple (dans App.jsx ou RootLayout.jsx)
  useEffect(() => {
    document.body.classList.add('desktop-scene');
    return () => document.body.classList.remove('desktop-scene');
  }, []);

  if (!booted) return <BootScreen />;
  return children;
}

/* 🔒 AdminRoute: bloque l'accès si pas admin (fusion Redux + Laravel) */
function AdminRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((s) => s.library?.auth || {});
  const { me } = useMeFromLaravel();

  const mergedUser        = { ...(user || {}), ...(me?.user || {}) };
  const mergedRoles       = [ ...(user?.roles || []), ...(me?.roles || []) ];
  const mergedPermissions = [ ...(user?.permissions || []), ...(me?.permissions || []) ];
  const { isAdmin } = computeRights(mergedPermissions, mergedRoles, mergedUser);

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/auth?view=login&next=${next}`} replace />;
  }
  if (!isAdmin) return <Navigate to="/settings" replace />;
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
                      <AboutPage />
                    }
                  />
                </Route>

                {/* Routes protégées avec DefaultLayout */}
                <Route element={<RequireAuth redirectTo="/auth" />}>
                  <Route element={<DefaultLayout />}>
                    <Route path="/settings" element={<UserManagementDashboard />} />
                    <Route path="/articles" element={<ArticlesPage />} />
                    <Route path="/articles/:show" element={<Visualiseur />} />
                    <Route path="/bureaux-public/:id" element={<BureauPublicShow />} />
                  </Route>
                </Route>

                {/* Routes protégées avec DashboardLayout */}
                <Route element={<RequireAuth redirectTo="/auth" />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/visualiseur/:articleslug" element={<Visualiseur />} />
                    <Route path="/configuration" element={<Configuration />} />
                    <Route path="/dashboard" element={<Dashboard  />} />

                    {/* 🔒 Admin-only */}
                    <Route
                      path="/articlescontroler"
                      element={
                        <AdminRoute>
                          <ArticlesIndex />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/articles/new"
                      element={
                        <AdminRoute>
                          <ArticleEditCreate />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/articles/:id/edit"
                      element={
                        <AdminRoute>
                          <ArticleEditCreate />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/articles/trashed"
                      element={
                        <AdminRoute>
                          <TrashedPage />
                        </AdminRoute>
                      }
                    />
                      {/* 🔹 AJOUT : SOCIÉTÉS */}
                    <Route
                      path="/societescontroler"
                      element={
                        <AdminRoute>
                          <SocietesIndex />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/societes/create"
                      element={
                        <AdminRoute>
                          <SocieteEditCreate />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/societes/:id/edit"
                      element={
                        <AdminRoute>
                          <SocieteEditCreate />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/societes"
                      element={
                        <AdminRoute>
                          <SocietesIndex />
                        </AdminRoute>
                      }
                    />
                    {/* 🔹 AJOUT : BUREAUX */}
                    <Route
                      path="/bureauxcontroler"
                      element={
                        <AdminRoute>
                          <BureauxIndex />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/bureaux/create"
                      element={
                        <AdminRoute>
                          <BureauEditCreate />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/bureaux/:id/edit"
                      element={
                        <AdminRoute>
                          <BureauEditCreate />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/messageries"
                      element={
                        <AdminRoute>
                          <ContactMessagesIndex />
                        </AdminRoute>
                      }
                    />
                     <Route
                    path="/miradia-slidescontroler"
                    element={
                      <AdminRoute>
                        <MiradiaSlidesIndex />
                      </AdminRoute>
                    }
                  />
                      <Route
                  path="/miradia-slides/new"
                  element={
                    <AdminRoute>
                      <MiradiaSlideForm />
                    </AdminRoute>
                  }
                />

                <Route
                  path="/miradia-slides/:id/edit"
                  element={
                    <AdminRoute>
                      <MiradiaSlideForm />
                    </AdminRoute>
                  }
                />
          <Route
            path="/orgnodescontroler"
            element={
              <AdminRoute>
                <OrgNodesIndex />
              </AdminRoute>
            }
          />

          <Route
            path="/orgnodes/new"
            element={
              <AdminRoute>
                <OrgNodeForm />
              </AdminRoute>
            }
          />

          <Route
            path="/orgnodes/:id/edit"
            element={
              <AdminRoute>
                <OrgNodeForm />
              </AdminRoute>
            }
          />
          <Route
  path="/cms-sectionscontroler"
  element={
    <AdminRoute>
      <CmsSectionsIndex />
    </AdminRoute>
  }
/>

<Route
  path="/cms-sections/new"
  element={
    <AdminRoute>
      <CmsSectionForm />
    </AdminRoute>
  }
/>

<Route
  path="/cms-sections/:id/edit"
  element={
    <AdminRoute>
      <CmsSectionForm />
    </AdminRoute>
  }
/>


                  </Route>
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
                <Route path="termsofuse" element={<TermsOfUse />} />
                 <Route path="/documentation" element={<DocumentationPage />} />
                <Route path="/guide" element={<UserGuidePage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/miradia" element={<HomeMiradia />} />

              </Routes>
            </Router>
            {/* <DebugAuth/> */}
          </AuthInitializer>
        </PersistGate>
      </Provider>
    </I18nextProvider>
  );
}
