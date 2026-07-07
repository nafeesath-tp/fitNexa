export const getHomeRoute = (user) => {
    if (!user) return '/login';
    
    switch (user.role) {
        case 'CLIENT':
            if (user.is_profile_completed === false) {
                return '/client/setup';
            }
            return '/client/home';
            
        case 'TRAINER':
            if (user.approval_status === 'APPROVED') {
                return '/trainer/home';
            }
            // If they are PENDING or REJECTED or haven't onboarded yet
            return '/trainer/pending';
            
        case 'ADMIN':
            return '/admin/dashboard';
            
        default:
            return '/login';
    }
};
