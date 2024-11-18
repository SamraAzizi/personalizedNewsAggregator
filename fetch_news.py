import requests
import json
import pandas as pd
import numpy as np
from datetime import datetime
from textblob import TextBlob
import os
from dotenv import load_dotenv
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any
import time

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('news_fetcher.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class NewsFetcher:
    def __init__(self):
        self.api_key = os.getenv('NEWS_API_KEY', 'f5732e4ba98641e590632055326f6b6b')
        self.base_url = 'https://newsapi.org/v2/top-headlines'
        self.categories = [
            'technology', 'sports', 'business', 'entertainment',
            'health', 'science', 'politics', 'finance'
        ]
        self.countries = ['us', 'gb', 'ca', 'au']  # Multiple countries for diversity
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    def get_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment of text using TextBlob."""
        if not text:
            return {'polarity': 0.0, 'subjectivity': 0.0}
        
        analysis = TextBlob(text)
        return {
            'polarity': float(analysis.sentiment.polarity),
            'subjectivity': float(analysis.sentiment.subjectivity)
        }

    def clean_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and process article data."""
        try:
            # Extract relevant fields
            cleaned = {
                'title': article.get('title', '').strip(),
                'description': article.get('description', '').strip(),
                'content': article.get('content', '').strip(),
                'url': article.get('url', ''),
                'source': article.get('source', {}).get('name', ''),
                'category': article.get('category', '').lower(),
                'published_at': article.get('publishedAt', ''),
                'author': article.get('author', '')
            }

            # Convert published_at to datetime
            if cleaned['published_at']:
                cleaned['published_at'] = datetime.strptime(
                    cleaned['published_at'], '%Y-%m-%dT%H:%M:%SZ'
                ).isoformat()

            # Get sentiment scores
            text_for_sentiment = f"{cleaned['title']} {cleaned['description']} {cleaned['content']}"
            sentiment = self.get_sentiment(text_for_sentiment)
            cleaned.update({
                'sentiment_polarity': sentiment['polarity'],
                'sentiment_subjectivity': sentiment['subjectivity']
            })

            return cleaned
        except Exception as e:
            logger.error(f"Error cleaning article: {str(e)}")
            return None

    def fetch_articles_for_params(self, category: str, country: str) -> List[Dict[str, Any]]:
        """Fetch articles for specific category and country."""
        url = f'{self.base_url}?country={country}&category={category}&apiKey={self.api_key}'
        
        for attempt in range(self.max_retries):
            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                if data.get('status') != 'ok':
                    logger.error(f"API error: {data.get('message', 'Unknown error')}")
                    continue

                articles = data.get('articles', [])
                processed_articles = []
                
                for article in articles:
                    article['category'] = category
                    cleaned_article = self.clean_article(article)
                    if cleaned_article:
                        processed_articles.append(cleaned_article)

                logger.info(f"Successfully fetched {len(processed_articles)} articles for {category} - {country}")
                return processed_articles

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed for {category} - {country}: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                continue

        return []

    def fetch_all_articles(self) -> List[Dict[str, Any]]:
        """Fetch articles for all categories and countries in parallel."""
        all_articles = []
        params_list = [(cat, country) 
                      for cat in self.categories 
                      for country in self.countries]

        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_params = {
                executor.submit(self.fetch_articles_for_params, cat, country): (cat, country)
                for cat, country in params_list
            }

            for future in future_to_params:
                try:
                    articles = future.result()
                    all_articles.extend(articles)
                except Exception as e:
                    cat, country = future_to_params[future]
                    logger.error(f"Error processing {cat} - {country}: {str(e)}")

        return all_articles

    def save_articles(self, articles: List[Dict[str, Any]]) -> None:
        """Save articles to both JSON and CSV formats."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save to JSON
        json_filename = f'news_data_{timestamp}.json'
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump({'articles': articles}, f, ensure_ascii=False, indent=2)

        # Save to CSV
        df = pd.DataFrame(articles)
        csv_filename = f'news_data_{timestamp}.csv'
        df.to_csv(csv_filename, index=False)

        # Save to database format
        processed_filename = 'processed_news.csv'
        df.to_csv(processed_filename, index=False)

        logger.info(f"Saved {len(articles)} articles to {json_filename} and {csv_filename}")

    def generate_statistics(self, articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate statistics about the fetched articles."""
        df = pd.DataFrame(articles)
        stats = {
            'total_articles': len(df),
            'articles_per_category': df['category'].value_counts().to_dict(),
            'articles_per_source': df['source'].value_counts().head(10).to_dict(),
            'average_sentiment': float(df['sentiment_polarity'].mean()),
            'sentiment_distribution': {
                'positive': len(df[df['sentiment_polarity'] > 0]),
                'negative': len(df[df['sentiment_polarity'] < 0]),
                'neutral': len(df[df['sentiment_polarity'] == 0])
            }
        }
        return stats

def main():
    try:
        logger.info("Starting news fetching process")
        fetcher = NewsFetcher()
        
        # Fetch articles
        articles = fetcher.fetch_all_articles()
        
        if not articles:
            logger.error("No articles were fetched")
            return

        # Save articles
        fetcher.save_articles(articles)
        
        # Generate and log statistics
        stats = fetcher.generate_statistics(articles)
        logger.info("Fetch statistics: %s", json.dumps(stats, indent=2))
        
        logger.info("News fetching process completed successfully")

    except Exception as e:
        logger.error(f"Error in main process: {str(e)}", exc_info=True)

if __name__ == "__main__":
    main()