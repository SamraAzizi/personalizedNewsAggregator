import React, { useState, useEffect } from 'react';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      setNotifications(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications. Please try again later.');
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Notifications</h2>
      <button onClick={markAsRead}>Mark all as read</button>
      <ul>
        {notifications.map((notification, index) => (
          <li key={index} style={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
            {notification.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Notifications;