import axiosInstance from '../../api/axios';

export const trainerApi = {
    // Submit onboarding (FormData for files)
    submitOnboarding: async (formData) => {
        const response = await axiosInstance.post('/trainer/onboarding/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data;
    },

    // Get trainer profile
    getProfile: async () => {
        const response = await axiosInstance.get('/trainer/profile/');
        return response.data;
    },
    
    // Get public specializations
    getSpecializations: async () => {
        const response = await axiosInstance.get('/public/specializations/');
        return response.data;
    }
};
