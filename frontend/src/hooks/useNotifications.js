import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useGetNotificationsQuery, useMarkAllReadMutation, useMarkReadMutation } from '../store/api/notificationsApi';
import { setNotifications, addNotification, markNotificationRead, markAllNotificationsRead, togglePanel, setUnreadCount } from '../store/slices/notificationSlice';
import useAuth from './useAuth';
import useSocket from './useSocket';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const { items, unreadCount, panelOpen } = useSelector((state) => state.notification);

  const { data: apiNotifications, refetch } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [apiMarkRead] = useMarkReadMutation();
  const [apiMarkAllRead] = useMarkAllReadMutation();

  // Sync API notifications to store
  useEffect(() => {
    if (apiNotifications && apiNotifications.success) {
      const list = apiNotifications.data || [];
      dispatch(setNotifications(list));
      const unreads = list.filter((n) => n.status === 'unread').length;
      dispatch(setUnreadCount(unreads));
    }
  }, [apiNotifications, dispatch]);

  // Socket notification listener
  useSocket({
    notification: (notification) => {
      console.log('Socket notification received:', notification);
      dispatch(addNotification(notification));
    },
  });

  const markRead = async (id) => {
    dispatch(markNotificationRead(id));
    try {
      await apiMarkRead(id).unwrap();
    } catch (err) {
      console.error('Failed to mark notification read in API:', err);
    }
  };

  const markAllRead = async () => {
    dispatch(markAllNotificationsRead());
    try {
      await apiMarkAllRead().unwrap();
    } catch (err) {
      console.error('Failed to mark all notifications read in API:', err);
    }
  };

  const toggleNotificationPanel = (open) => {
    dispatch(togglePanel(open));
  };

  return {
    items,
    unreadCount,
    panelOpen,
    markRead,
    markAllRead,
    togglePanel: toggleNotificationPanel,
    refetch,
  };
};

export default useNotifications;
