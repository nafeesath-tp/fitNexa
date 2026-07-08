import api from '../../api/axios';

export const clientApi = {
  getProfile: async () => {
    const response = await api.get('/api/client/profile/');
    return response.data;
  },

  createProfile: async (formData) => {
    // Axios 1.x postForm automatically handles the FormData boundary and headers
    const response = await api.postForm('/api/client/profile/create/', formData);
    return response.data;
  },

  updateProfile: async (data) => {
    const isFormData = data instanceof FormData;
    if (isFormData) {
        const response = await api.patchForm('/api/client/profile/', data);
        return response.data;
    } else {
        const response = await api.patch('/api/client/profile/', data);
        return response.data;
    }
  },
};
