import React, { useState, useEffect } from 'react';

function UserPreferences() {
  const [categories, setCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/preferences', {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      const data = await response.json();
      setCategories(data.categories || []);
      setKeywords(data.keywords || []);
      setSources(data.sources || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setError('Failed to load preferences. Please try again later.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify({ categories, keywords, sources })
      });
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <h3>Categories</h3>
        {['business', 'technology', 'sports', 'entertainment', 'health'].map(cat => (
          <label key={cat}>
            <input
              type="checkbox"
              checked={categories.includes(cat)}
              onChange={(e) => {
                if (e.target.checked) {
                  setCategories([...categories, cat]);
                } else {
                  setCategories(categories.filter(c => c !== cat));
                }
              }}
            />
            {cat}
          </label>
        ))}
      </div>
      <div>
        <h3>Keywords</h3>
        <input
          type="text"
          value={keywords.join(', ')}
          onChange={(e) => setKeywords(e.target.value.split(',').map(k => k.trim()))}
          placeholder="Enter keywords separated by commas"
        />
      </div>
      <div>
        <h3>Preferred Sources</h3>
        <input
          type="text"
          value={sources.join(', ')}
          onChange={(e) => setSources(e.target.value.split(',').map(s => s.trim()))}
          placeholder="Enter news sources separated by commas"
        />
      </div>
      <button type="submit">Save Preferences</button>
    </form>
  );
}

export default UserPreferences;