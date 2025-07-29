import { configureStore } from '@reduxjs/toolkit';
import libraryReducer from '../store/slices/Slice'; // Ajustez le chemin selon votre structure

export const store = configureStore({
  reducer: {
    library: libraryReducer, // Ce nom ('library') doit correspondre à votre slice
  },
});