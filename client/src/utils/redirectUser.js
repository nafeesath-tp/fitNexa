export function getHomeRoute(user) {
    if (!user) return '/login';

    switch (user.role) {
        case 'ADMIN':
            return '/admin/dashboard';
        
        case 'TRAINER':
            if (user.approval_status === 'PENDING' || user.approval_status === 'REJECTED') {
                return '/trainer/pending';
            }
            return '/trainer/profile'; // Or trainer dashboard if one exists
        
        case 'CLIENT':
            if (!user.is_profile_completed) {
                return '/client/profile/setup';
            }
            return '/client/home';
            
        default:
            return '/login';
    }
}
