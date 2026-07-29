/**
 * getHomeRoute — single source of truth for post-login routing.
 *
 * Every login path (email, Google, token refresh) must call this function.
 * It determines where to send the user based on their role and current state.
 *
 * @param {Object} user  - The user data object from the auth store / API response.
 *   Expected fields:
 *     role                 : 'CLIENT' | 'TRAINER' | 'ADMIN'
 *     is_profile_completed : boolean  (CLIENT only)
 *     approval_status      : 'PENDING_ONBOARDING' | 'PENDING' | 'APPROVED' | 'REJECTED'
 *                            (TRAINER only — null / undefined treated as PENDING_ONBOARDING)
 *
 * @returns {string}  React Router path string.
 */
export const getHomeRoute = (user) => {
    if (!user) return '/login';

    switch (user.role) {

        case 'CLIENT':
            // No subscription yet → marketing home/subscription page
            if (!user.has_active_subscription) {
                return '/client/home';
            }
            // Active subscriber, but profile not yet completed → onboarding setup
            if (user.is_profile_completed === false) {
                return '/client/setup';
            }
            // Active subscriber with completed profile → dashboard
            return '/client/dashboard';

        case 'TRAINER': {
            const status = user.approval_status;

            // No profile yet (just signed up, hasn't completed onboarding form)
            if (!status || status === 'PENDING_ONBOARDING') {
                return '/trainer/onboarding';
            }

            if (status === 'APPROVED') {
                return '/trainer/home';
            }

            if (status === 'PENDING') {
                return '/trainer/pending';
            }

            if (status === 'REJECTED') {
                return '/trainer/rejected';
            }

            // Fallback: any unrecognised status → onboarding
            return '/trainer/onboarding';
        }

        case 'ADMIN':
            return '/admin/dashboard';

        default:
            return '/login';
    }
};
