import requests
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class NewsFetcher:
    def __init__(self, api_key: str = 'ad7ee1cd08f5478ba96797993a1a66be'):
        self.api_key = api_key
        self.base_url = 'https://newsapi.org/v2/top-headlines'
        self.categories = [
            'technology', 'sports', 'business', 'entertainment',
            'health', 'science', 'travel', 'finance'
        ]

    def fetch_category(self, category: str) -> List[Dict]:
        """Fetch news for a specific category."""
        try:
            url = f'{self.base_url}?country=us&category={category}&apiKey={self.api_key}'
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            news_data = response.json()
            if 'articles' not in news_data:
                logger.error(f"Unexpected response structure for {category}: {news_data}")
                return []
            
            articles = news_data['articles']
            for article in articles:
                article['category'] = category
                article['fetched_at'] = datetime.utcnow().isoformat()
            
            logger.info(f"Successfully fetched {len(articles)} articles for {category}")
            return articles
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {category} news: {str(e)}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing response for {category}: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error for {category}: {str(e)}")
            return []

    def fetch_all_news(self) -> List[Dict]:
        """Fetch news for all categories."""
        all_articles = []
        
        for category in self.categories:
            articles = self.fetch_category(category)
            all_articles.extend(articles)
        
        logger.info(f"Total articles fetched: {len(all_articles)}")
        return all_articles

    def save_to_file(self, articles: List[Dict], filename: str = 'news_data.json'):
        """Save fetched articles to a JSON file."""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump({'articles': articles}, f, ensure_ascii=False, indent=2)
            logger.info(f"Successfully saved {len(articles)} articles to {filename}")
        except Exception as e:
            logger.error(f"Error saving to {filename}: {str(e)}")

def newsFetcher() -> List[Dict]:
    """Main function to fetch news articles."""
    fetcher = NewsFetcher()
    return fetcher.fetch_all_news()

if __name__ == '__main__':
    # When run directly, fetch articles and save them to a file
    fetcher = NewsFetcher()
    articles = fetcher.fetch_all_news()
    fetcher.save_to_file(articles)
