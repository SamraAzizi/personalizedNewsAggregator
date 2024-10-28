<<<<<<< HEAD
import React, { useState } from 'react';
import ArticleList from './ArticleList';

function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/search?q=${searchTerm}&category=${category}&sentiment=${sentiment}`, {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching articles:', error);
    }
  };

  return (
    <div>
      <h2>Search Articles</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search keywords"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="business">Business</option>
          <option value="technology">Technology</option>
          <option value="sports">Sports</option>
          {/* Add more categories as needed */}
        </select>
        <select value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
          <option value="">All Sentiments</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEGATIVE">Negative</option>
          <option value="NEUTRAL">Neutral</option>
        </select>
        <button type="submit">Search</button>
      </form>
      
      <h3>Search Results</h3>
      <ArticleList articles={searchResults} />
    </div>
  );
}

=======
import React, { useState } from 'react';
import ArticleList from './ArticleList';

function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/search?q=${searchTerm}&category=${category}&sentiment=${sentiment}`, {
        headers: {
          'Authorization': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching articles:', error);
    }
  };

  return (
    <div>
      <h2>Search Articles</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search keywords"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="business">Business</option>
          <option value="technology">Technology</option>
          <option value="sports">Sports</option>
          {/* Add more categories as needed */}
        </select>
        <select value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
          <option value="">All Sentiments</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEGATIVE">Negative</option>
          <option value="NEUTRAL">Neutral</option>
        </select>
        <button type="submit">Search</button>
      </form>
      
      <h3>Search Results</h3>
      <ArticleList articles={searchResults} />
    </div>
  );
}

>>>>>>> 06edc16 (news)
export default SearchPage;