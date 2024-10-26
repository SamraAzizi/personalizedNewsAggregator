
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
      

