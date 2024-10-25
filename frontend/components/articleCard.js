import React from 'react';

function ArticleCard({ article }) {
  const handleLike = () => {
    // Implement like functionality
  };

  const handleReadMore = () => {
    // Implement read more functionality
  };

  return (
    <div className="article-card">
      <h3>{article.title}</h3>
      <p>{article.description}</p>
      <p>Source: {article.source}</p>
      <p>Published: {new Date(article.publishedAt).toLocaleString()}</p>
      <p>Sentiment: {article.sentiment}</p>
      <p>Topics: {article.topics.map(t => t.topic).join(', ')}</p>
      <button onClick={handleLike}>Like</button>
      <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={handleReadMore}>Read more</a>
    </div>
  );
}

export default ArticleCard;