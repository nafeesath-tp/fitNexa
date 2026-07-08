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
            } else if (user.approval_status === 'PENDING') {
                return '/trainer/pending';
            } else if (user.approval_status === 'REJECTED') {
                return '/trainer/rejected';
            }
            // PENDING_ONBOARDING or no profile yet
            return '/trainer/onboarding';
            
        case 'ADMIN':
            return '/admin/dashboard';
            
        default:
            return '/login';
    }
};
