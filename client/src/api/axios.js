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

api.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// 401 Auto-refresh interceptor
//
// When any API call returns 401 (access token expired), we automatically:
//   1. POST to /api/auth/token/refresh/ — the server reads the HttpOnly
//      refresh_token cookie and sets a new access_token cookie.
//   2. Retry the original request once with the new cookie.
//   3. If refresh also fails (refresh token expired) → clear auth and
//      redirect the user to /login.
//
// We skip the interceptor for the refresh endpoint itself to prevent
// infinite retry loops.
// ─────────────────────────────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue = [];   // requests waiting while a refresh is in-flight

const processQueue = (error) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,   // pass through successful responses unchanged

    async (error) => {
        const originalRequest = error.config;

        // Only intercept 401s that haven't already been retried,
        // and skip the refresh endpoint to avoid infinite loops.
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/api/auth/token/refresh/') &&
            !originalRequest.url.includes('/api/auth/login/')
        ) {
            if (isRefreshing) {
                // Another refresh is already in-flight — queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => api(originalRequest))
                  .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Ask the backend to set a new access_token cookie
                await api.post('/api/auth/token/refresh/');
                processQueue(null);
                return api(originalRequest);   // retry the original request
            } catch (refreshError) {
                // Refresh token also expired — user must log in again
                processQueue(refreshError);

                // Clear Zustand auth state
                // (Import lazily to avoid circular dependency)
                const { useAuthStore } = await import('../stores/authStore');
                const { useSubscriptionStore } = await import('../stores/subscriptionStore');
                useAuthStore.getState().clearAuth();
                useSubscriptionStore.getState().clearSubscriptionState();

                // Only redirect to /login if we are NOT already on a public/auth route
                const publicPaths = ['/login', '/admin-login', '/signup', '/verify-otp', '/forgot-password', '/'];
                if (!publicPaths.includes(window.location.pathname)) {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
