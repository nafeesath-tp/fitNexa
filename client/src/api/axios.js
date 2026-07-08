import axios from 'axios';

const api = axios.create({
    // Using localhost instead of 127.0.0.1 matches the frontend URL (localhost:5173).
    // This makes it a Same-Site request, allowing SameSite=Lax cookies to be sent correctly!
    baseURL: 'http://localhost:8000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
