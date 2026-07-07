import api from '../../api/axios';

export const clientApi = {
  getProfile: async () => {
    const response = await api.get('/api/client/profile/');
    return response.data;
  },

  createProfile: async (formData) => {
    const response = await api.post('/api/client/profile/create/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateProfile: async (data) => {
    // If it includes a file (profile_image), you might pass formData here too
    // For now we assume typical JSON or FormData depending on what's passed
    const isFormData = data instanceof FormData;
    const response = await api.patch('/api/client/profile/', data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
    return response.data;
  },
};
