<<<<<<< HEAD

import React, { useState, useEffect } from 'react';
import ArticleList from '../components/ArticleList';

function NewsFeed() {
  const [personalizedArticles, setPersonalizedArticles] = useState([]);
  const [trendingArticles, setTrendingArticles] = useState([]);
  const [collaborativeRecommendations, setCollaborativeRecommendations] = useState([]);
  const [contentBasedRecommendations, setContentBasedRecommendations] = useState([]);
  const [sentimentArticles, setSentimentArticles] = useState([]);
  const [topicArticles, setTopicArticles] = useState([]);
  const [selectedSentiment, setSelectedSentiment] = useState('POSITIVE');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPersonalizedNews();
    fetchTrendingNews();
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchSentimentArticles(selectedSentiment);
    if (selectedTopic) {
      fetchTopicArticles(selectedTopic);
    }
  }, [selectedSentiment, selectedTopic]);

  const fetchPersonalizedNews = async () => {
    try {
      const response = await fetch('/api/news', {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch personalized news');
      }
      const data = await response.json();
      setPersonalizedArticles(data);
    } catch (error) {
      console.error('Error fetching personalized news:', error);
      setError('Failed to load personalized news. Please try again later.');
    }
  };

  const fetchTrendingNews = async () => {
    try {
      const response = await fetch('/api/trending-news', {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch trending news');
      }
      const data = await response.json();
      setTrendingArticles(data);
    } catch (error) {
      console.error('Error fetching trending news:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/topics', {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      const data = await response.json();
      setTopics(data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchSentimentArticles = async (sentiment) => {
    try {
      const response = await fetch(`/api/articles/sentiment/${sentiment}`, {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment articles');
      }
      const data = await response.json();
      setSentimentArticles(data);
    } catch (error) {
      console.error('Error fetching sentiment articles:', error);
    }
  };

  const fetchTopicArticles = async (topic) => {
    try {
      const response = await fetch(`/api/articles/topic/${topic}`, {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch topic-based articles');
      }
      const data = await response.json();
      setTopicArticles(data);
    } catch (error) {
      console.error('Error fetching topic-based articles:', error);
    }
  };

  const handleSentimentChange = (event) => {
    setSelectedSentiment(event.target.value);
  };

  const handleTopicChange = (event) => {
    setSelectedTopic(event.target.value);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Your Personalized News Feed</h2>
      <ArticleList articles={personalizedArticles} />

      <h2>Trending News</h2>
      <ArticleList articles={trendingArticles} />
            <h2>Articles by Sentiment</h2>
      <select value={selectedSentiment} onChange={handleSentimentChange}>
        <option value="POSITIVE">Positive</option>
        <option value="NEGATIVE">Negative</option>
        <option value="NEUTRAL">Neutral</option>
      </select>
      {sentimentArticles.map((article, index) => (
        <div key={index}>
          <h3>{article.title}</h3>
          <p>{article.description}</p>
          <p>Source: {article.source}</p>
          <p>Published: {new Date(article.publishedAt).toLocaleString()}</p>
          <p>Sentiment: {article.sentiment}</p>
          <button onClick={() => handleLike(article._id)}>Like</button>
          <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={() => handleReadMore(article._id)}>Read more</a>
        </div>
      ))}

      <h2>Articles by Topic</h2>
      <select value={selectedTopic} onChange={handleTopicChange}>
        <option value="">Select a topic</option>
        {topics.map((topic, index) => (
          <option key={index} value={topic}>{topic}</option>
        ))}
      </select>
      {topicArticles.map((article, index) => (
        <div key={index}>
          <h3>{article.title}</h3>
          <p>{article.description}</p>
          <p>Source: {article.source}</p>
          <p>Published: {new Date(article.publishedAt).toLocaleString()}</p>
          <p>Topics: {article.topics.map(t => t.topic).join(', ')}</p>
          <button onClick={() => handleLike(article._id)}>Like</button>
          <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={() => handleReadMore(article._id)}>Read more</a>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;


=======

import React, { useState, useEffect } from 'react';
import ArticleList from '../components/ArticleList';

function NewsFeed() {
  const [personalizedArticles, setPersonalizedArticles] = useState([]);
  const [trendingArticles, setTrendingArticles] = useState([]);
  const [collaborativeRecommendations, setCollaborativeRecommendations] = useState([]);
  const [contentBasedRecommendations, setContentBasedRecommendations] = useState([]);
  const [sentimentArticles, setSentimentArticles] = useState([]);
  const [topicArticles, setTopicArticles] = useState([]);
  const [selectedSentiment, setSelectedSentiment] = useState('POSITIVE');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPersonalizedNews();
    fetchTrendingNews();
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchSentimentArticles(selectedSentiment);
    if (selectedTopic) {
      fetchTopicArticles(selectedTopic);
    }
  }, [selectedSentiment, selectedTopic]);

  const fetchPersonalizedNews = async () => {
    try {
      const response = await fetch('/api/news', {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch personalized news');
      }
      const data = await response.json();
      setPersonalizedArticles(data);
    } catch (error) {
      console.error('Error fetching personalized news:', error);
      setError('Failed to load personalized news. Please try again later.');
    }
  };

  const fetchTrendingNews = async () => {
    try {
      const response = await fetch('/api/trending-news', {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch trending news');
      }
      const data = await response.json();
      setTrendingArticles(data);
    } catch (error) {
      console.error('Error fetching trending news:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/topics', {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      const data = await response.json();
      setTopics(data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchSentimentArticles = async (sentiment) => {
    try {
      const response = await fetch(`/api/articles/sentiment/${sentiment}`, {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment articles');
      }
      const data = await response.json();
      setSentimentArticles(data);
    } catch (error) {
      console.error('Error fetching sentiment articles:', error);
    }
  };

  const fetchTopicArticles = async (topic) => {
    try {
      const response = await fetch(`/api/articles/topic/${topic}`, {
        headers: {
          'Authorization': localStorage.getItem('token'),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch topic-based articles');
      }
      const data = await response.json();
      setTopicArticles(data);
    } catch (error) {
      console.error('Error fetching topic-based articles:', error);
    }
  };

  const handleSentimentChange = (event) => {
    setSelectedSentiment(event.target.value);
  };

  const handleTopicChange = (event) => {
    setSelectedTopic(event.target.value);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Your Personalized News Feed</h2>
      <ArticleList articles={personalizedArticles} />

      <h2>Trending News</h2>
      <ArticleList articles={trendingArticles} />
            <h2>Articles by Sentiment</h2>
      <select value={selectedSentiment} onChange={handleSentimentChange}>
        <option value="POSITIVE">Positive</option>
        <option value="NEGATIVE">Negative</option>
        <option value="NEUTRAL">Neutral</option>
      </select>
      {sentimentArticles.map((article, index) => (
        <div key={index}>
          <h3>{article.title}</h3>
          <p>{article.description}</p>
          <p>Source: {article.source}</p>
          <p>Published: {new Date(article.publishedAt).toLocaleString()}</p>
          <p>Sentiment: {article.sentiment}</p>
          <button onClick={() => handleLike(article._id)}>Like</button>
          <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={() => handleReadMore(article._id)}>Read more</a>
        </div>
      ))}

      <h2>Articles by Topic</h2>
      <select value={selectedTopic} onChange={handleTopicChange}>
        <option value="">Select a topic</option>
        {topics.map((topic, index) => (
          <option key={index} value={topic}>{topic}</option>
        ))}
      </select>
      {topicArticles.map((article, index) => (
        <div key={index}>
          <h3>{article.title}</h3>
          <p>{article.description}</p>
          <p>Source: {article.source}</p>
          <p>Published: {new Date(article.publishedAt).toLocaleString()}</p>
          <p>Topics: {article.topics.map(t => t.topic).join(', ')}</p>
          <button onClick={() => handleLike(article._id)}>Like</button>
          <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={() => handleReadMore(article._id)}>Read more</a>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;


>>>>>>> 06edc16 (news)
