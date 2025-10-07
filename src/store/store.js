// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import libraryReducer from '../store/slices/Slice';
import { combineReducers } from 'redux';

// ⛔️ Avant : whitelist: ['auth'] => persistait le sous-état auth (à éviter)
// ✅ Maintenant : on PERSISTE le slice "library" SAUF 'auth'
const libraryPersistConfig = {
  key: 'library',
  storage,
  blacklist: ['auth'], // <-- très important : on ne persiste pas l'auth redux
};

const rootReducer = combineReducers({
  // On applique le persist SEULEMENT sur library, avec un blacklist d'auth
  library: persistReducer(libraryPersistConfig, libraryReducer),
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore toutes les actions redux-persist
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/FLUSH',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }),
});

export const persistor = persistStore(store);
