<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import ArticleList from '../components/ArticleList';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [readingHistory, setReadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProfile();
    fetchReadingHistory();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user-profile', {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const data = await response.json();
      setUser(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile. Please try again later.');
      setLoading(false);
    }
  };

  const fetchReadingHistory = async () => {
    try {
      const response = await fetch('/api/reading-history', {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reading history');
      }
      const data = await response.json();
      setReadingHistory(data);
    } catch (error) {
      console.error('Error fetching reading history:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>User Profile</h2>
      {user && (
        <div>
          <p>Email: {user.email}</p>
          <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      )}
      
      <h3>Reading History</h3>
      <ArticleList articles={readingHistory} />
    </div>
  );
}

=======
import React, { useState, useEffect } from 'react';
import ArticleList from '../components/ArticleList';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [readingHistory, setReadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProfile();
    fetchReadingHistory();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user-profile', {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const data = await response.json();
      setUser(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile. Please try again later.');
      setLoading(false);
    }
  };

  const fetchReadingHistory = async () => {
    try {
      const response = await fetch('/api/reading-history', {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reading history');
      }
      const data = await response.json();
      setReadingHistory(data);
    } catch (error) {
      console.error('Error fetching reading history:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>User Profile</h2>
      {user && (
        <div>
          <p>Email: {user.email}</p>
          <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      )}
      
      <h3>Reading History</h3>
      <ArticleList articles={readingHistory} />
    </div>
  );
}

>>>>>>> 06edc16 (news)
export default UserProfile;