import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getHomeRoute } from '../utils/redirectUser';

const PublicRoute = () => {
    const { isAuthenticated, user } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to={getHomeRoute(user)} replace />;
    }

    return <Outlet />;
};

export default PublicRoute;
