import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/apiClient';

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ email, langue }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/password/forgot', { email, langue });
      return data; // { ok, message }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Request failed';
      return rejectWithValue({ message });
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, token, password, password_confirmation, langue }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/password/reset', {
        email, token, password, password_confirmation, langue
      });
      return data; // { ok, message }
    } catch (err) {
      const payload = err?.response?.data || { message: err?.message || 'Reset failed' };
      return rejectWithValue(payload);
    }
  }
);
