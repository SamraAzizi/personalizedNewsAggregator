import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Notification } from './notification';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
    // Set up polling for new notifications every 30 seconds
    const pollInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
      setError(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId = null) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = notificationId 
        ? `/api/notifications/${notificationId}/read`
        : '/api/notifications/read';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update notifications');
      }

      await fetchNotifications();
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner>Loading notifications...</LoadingSpinner>;
  }

  return (
    <NotificationsContainer>
      <NotificationsHeader>
        <Title>Notifications</Title>
        {notifications.length > 0 && (
          <MarkAllButton onClick={() => markAsRead()}>
            Mark all as read
          </MarkAllButton>
        )}
      </NotificationsHeader>

      {error && <Notification type="error" message={error} />}

      {notifications.length === 0 ? (
        <EmptyState>No notifications to display</EmptyState>
      ) : (
        <NotificationsList>
          {notifications.map((notification) => (
            <NotificationItem 
              key={notification._id} 
              read={notification.read}
              onClick={() => !notification.read && markAsRead(notification._id)}
            >
              <NotificationContent>
                <NotificationMessage>{notification.message}</NotificationMessage>
                <NotificationTime>
                  {new Date(notification.createdAt).toLocaleDateString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short'
                  })}
                </NotificationTime>
              </NotificationContent>
              {!notification.read && <UnreadDot />}
            </NotificationItem>
          ))}
        </NotificationsList>
      )}
    </NotificationsContainer>
  );
}

// Styled Components
const NotificationsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const NotificationsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #333;
  margin: 0;
`;

const MarkAllButton = styled.button`
  background: none;
  border: none;
  color: #0066cc;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;

  &:hover {
    text-decoration: underline;
  }
`;

const NotificationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const NotificationItem = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: ${props => props.read ? '#ffffff' : '#f8f9fa'};
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: ${props => props.read ? 'default' : 'pointer'};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.read ? '#ffffff' : '#f1f3f5'};
  }
`;

const NotificationContent = styled.div`
  flex: 1;
`;

const NotificationMessage = styled.p`
  margin: 0;
  color: #333;
  font-size: 0.95rem;
`;

const NotificationTime = styled.span`
  display: block;
  color: #6c757d;
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

const UnreadDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #0066cc;
  margin-left: 1rem;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

export default Notifications;
