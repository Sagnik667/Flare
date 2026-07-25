import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectCurrentToken, selectIsAuthenticated, setCredentials, clearCredentials, updateUserProfile } from '../store/slices/authSlice';
import { useGetVolunteerProfileQuery } from '../store/api/volunteerApi';
import { useLogoutMutation } from '../store/api/authApi';
import { ROLES } from '../lib/constants';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [logoutApi] = useLogoutMutation();

  // Fetch volunteer profile if authenticated and not admin
  const shouldFetchProfile = isAuthenticated && user && user.role !== ROLES.ADMIN;
  
  const { data: volunteerProfile, isLoading: isProfileLoading, refetch: refetchProfile } = useGetVolunteerProfileQuery(undefined, {
    skip: !shouldFetchProfile,
  });

  const isWoman = user?.role === ROLES.WOMAN;
  const isVolunteer = user?.role === ROLES.VOLUNTEER;
  const isAdmin = user?.role === ROLES.ADMIN;

  const isPendingVolunteer = isWoman && volunteerProfile?.verification_status === 'pending';
  const isRejectedVolunteer = isWoman && volunteerProfile?.verification_status === 'rejected';

  const logout = async () => {
    dispatch(clearCredentials());
    try {
      await logoutApi().unwrap();
    } catch (err) {
      console.error('Server logout failed:', err);
    }
  };

  const login = (userData) => {
    dispatch(setCredentials(userData));
  };

  const updateProfile = (profileData) => {
    dispatch(updateUserProfile(profileData));
  };

  return {
    user,
    token,
    isAuthenticated,
    isWoman,
    isVolunteer,
    isAdmin,
    isPendingVolunteer,
    isRejectedVolunteer,
    volunteerProfile,
    isProfileLoading,
    refetchProfile,
    logout,
    login,
    updateProfile,
  };
};

export default useAuth;
