import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getHomeRoute } from '../utils/redirectUser';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        return <Navigate to={getHomeRoute(user)} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
