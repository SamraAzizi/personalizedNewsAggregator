<<<<<<< HEAD
import React from 'react';
import ArticleCard from './ArticleCard';

function ArticleList({ articles }) {
  return (
    <div className="article-list">
      {articles.map((article, index) => (
        <ArticleCard key={index} article={article} />
      ))}
    </div>
  );
}

=======
import React from 'react';
import ArticleCard from './ArticleCard';

function ArticleList({ articles }) {
  return (
    <div className="article-list">
      {articles.map((article, index) => (
        <ArticleCard key={index} article={article} />
      ))}
    </div>
  );
}

>>>>>>> 06edc16 (news)
export default ArticleList;