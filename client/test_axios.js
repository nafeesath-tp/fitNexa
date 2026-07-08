import axios from 'axios';
import FormData from 'form-data';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

const formData = new FormData();
formData.append('first_name', 'Test');
formData.append('last_name', 'Axios');

api.interceptors.request.use(config => {
    console.log("Request Headers:", config.headers);
    return config;
});

api.post('/api/client/profile/create/', formData, {
    headers: {
        'Content-Type': undefined
    }
}).catch(e => {
    console.log("Error Response:", e.response?.status, e.response?.data);
});
