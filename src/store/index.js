import { configureStore } from '@reduxjs/toolkit';
import library from './slices/Slice';
import { initApiClient } from '../lib/apiClient';

export const store = configureStore({
  reducer: { library },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

initApiClient(store);
export default store;
