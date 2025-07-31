import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import libraryReducer from '../store/slices/Slice';
import { combineReducers } from 'redux';

const persistConfig = {
  key: 'library',
  storage,
  whitelist: ['auth']
};

const rootReducer = combineReducers({
  library: persistReducer(persistConfig, libraryReducer)
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
});

export const persistor = persistStore(store);
