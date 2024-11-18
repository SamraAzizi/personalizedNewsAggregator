import json
import pandas as pd
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import LatentDirichletAllocation
from textblob import TextBlob
import logging
from typing import List, Dict, Any
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class NewsDataProcessor:
    def __init__(self):
        # Download required NLTK resources
        nltk_resources = ['stopwords', 'punkt', 'wordnet', 'averaged_perceptron_tagger']
        for resource in nltk_resources:
            try:
                nltk.download(resource, quiet=True)
            except Exception as e:
                logger.error(f"Error downloading NLTK resource {resource}: {str(e)}")

        self.stop_words = set(stopwords.words('english'))
        self.lemmatizer = WordNetLemmatizer()
        
        # Category keywords with expanded vocabulary
        self.category_keywords = {
            'technology': {
                'technology', 'ai', 'artificial intelligence', 'machine learning', 'blockchain',
                'cryptocurrency', 'digital', 'software', 'hardware', 'internet', 'cyber',
                'robot', 'automation', 'cloud computing', '5g', 'virtual reality', 'ar',
                'startup', 'innovation', 'tech'
            },
            'sports': {
                'sports', 'athlete', 'tournament', 'championship', 'olympic', 'team',
                'player', 'coach', 'game', 'match', 'competition', 'league', 'stadium',
                'score', 'win', 'record', 'season', 'sport'
            },
            'finance': {
                'finance', 'stock', 'market', 'investment', 'bank', 'trading', 'economy',
                'financial', 'currency', 'investor', 'profit', 'revenue', 'growth',
                'shares', 'portfolio', 'fund', 'asset', 'wealth'
            },
            'business': {
                'business', 'company', 'corporate', 'industry', 'enterprise', 'startup',
                'merger', 'acquisition', 'ceo', 'executive', 'management', 'strategy',
                'market', 'commercial', 'retail', 'trade', 'partnership'
            },
            'health': {
                'health', 'medical', 'healthcare', 'disease', 'treatment', 'hospital',
                'doctor', 'patient', 'medicine', 'research', 'clinical', 'vaccine',
                'wellness', 'therapy', 'mental health', 'nutrition', 'fitness'
            },
            'science': {
                'science', 'research', 'discovery', 'study', 'experiment', 'laboratory',
                'scientist', 'physics', 'chemistry', 'biology', 'space', 'climate',
                'environment', 'innovation', 'technology', 'breakthrough'
            }
        }

    def preprocess_text(self, text: str) -> List[str]:
        """Preprocess text with advanced NLP techniques."""
        if not isinstance(text, str) or not text.strip():
            return []

        try:
            # Tokenization and basic cleaning
            tokens = word_tokenize(text.lower())
            
            # Remove stopwords and non-alphabetic tokens
            tokens = [token for token in tokens if 
                     token.isalpha() and 
                     token not in self.stop_words and 
                     len(token) > 2]
            
            # Lemmatization
            tokens = [self.lemmatizer.lemmatize(token) for token in tokens]
            
            return tokens
        except Exception as e:
            logger.error(f"Error in text preprocessing: {str(e)}")
            return []

    def get_sentiment_scores(self, text: str) -> Dict[str, float]:
        """Analyze sentiment using TextBlob."""
        try:
            if not isinstance(text, str) or not text.strip():
                return {'polarity': 0.0, 'subjectivity': 0.0}

            analysis = TextBlob(text)
            return {
                'polarity': float(analysis.sentiment.polarity),
                'subjectivity': float(analysis.sentiment.subjectivity)
            }
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {str(e)}")
            return {'polarity': 0.0, 'subjectivity': 0.0}

    def categorize_article(self, tokens: List[str], text: str) -> str:
        """Categorize article using both keyword matching and content analysis."""
        try:
            # Convert tokens to set for faster lookup
            token_set = set(tokens)
            
            # Calculate category scores based on keyword matches
            category_scores = {}
            for category, keywords in self.category_keywords.items():
                score = len(token_set.intersection(keywords))
                category_scores[category] = score

            # Get the category with the highest score
            if any(score > 0 for score in category_scores.values()):
                return max(category_scores.items(), key=lambda x: x[1])[0]
            
            return 'general'  # Default category if no strong matches

        except Exception as e:
            logger.error(f"Error in article categorization: {str(e)}")
            return 'general'

    def process_data(self, input_file: str) -> pd.DataFrame:
        """Process news data with advanced analysis."""
        try:
            logger.info(f"Starting data processing from {input_file}")

            # Load data
            with open(input_file, 'r', encoding='utf-8') as file:
                news_data = json.load(file)

            if 'articles' not in news_data:
                raise KeyError("No 'articles' key found in the JSON data")

            # Create DataFrame
            df = pd.DataFrame(news_data['articles'])
            
            # Basic cleaning
            required_columns = ['title', 'description', 'content', 'url', 'category']
            df = df.reindex(columns=required_columns)
            
            # Combine text fields for analysis
            df['full_text'] = df['title'].fillna('') + ' ' + \
                             df['description'].fillna('') + ' ' + \
                             df['content'].fillna('')

            # Process text and extract features
            logger.info("Processing text and extracting features...")
            df['tokens'] = df['full_text'].apply(self.preprocess_text)
            
            # Categorization
            logger.info("Categorizing articles...")
            df['topic'] = df.apply(lambda row: 
                self.categorize_article(row['tokens'], row['full_text']), axis=1)

            # Sentiment Analysis
            logger.info("Performing sentiment analysis...")
            sentiments = df['full_text'].apply(self.get_sentiment_scores)
            df['sentiment_polarity'] = sentiments.apply(lambda x: x['polarity'])
            df['sentiment_subjectivity'] = sentiments.apply(lambda x: x['subjectivity'])

            # Generate statistics
            self._log_statistics(df)

            return df

        except Exception as e:
            logger.error(f"Error in data processing: {str(e)}")
            raise

    def _log_statistics(self, df: pd.DataFrame) -> None:
        """Log processing statistics."""
        stats = {
            'total_articles': len(df),
            'articles_per_topic': df['topic'].value_counts().to_dict(),
            'sentiment_distribution': {
                'positive': len(df[df['sentiment_polarity'] > 0]),
                'neutral': len(df[df['sentiment_polarity'] == 0]),
                'negative': len(df[df['sentiment_polarity'] < 0])
            },
            'average_sentiment': float(df['sentiment_polarity'].mean())
        }
        logger.info(f"Processing Statistics:\n{json.dumps(stats, indent=2)}")

def main():
    try:
        processor = NewsDataProcessor()
        
        # Process the latest news data file
        news_files = [f for f in os.listdir('.') if f.startswith('news_data_') and f.endswith('.json')]
        if not news_files:
            raise FileNotFoundError("No news data files found")
        
        latest_file = max(news_files)
        logger.info(f"Processing latest news file: {latest_file}")
        
        # Process data
        df = processor.process_data(latest_file)
        
        # Save processed data
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        processed_file = f'processed_news_{timestamp}.csv'
        df.to_csv(processed_file, index=False)
        
        # Also save as the standard processed_news.csv for the app
        df.to_csv('processed_news.csv', index=False)
        
        logger.info(f"Data processing completed. Results saved to {processed_file}")

    except Exception as e:
        logger.error(f"Error in main process: {str(e)}", exc_info=True)

if __name__ == "__main__":
    main()

        
        # Also save as the standard processed_news.csv for the app
        df.to_csv('processed_news.csv', index=False)
        
        logger.info(f"Data processing completed. Results saved to {processed_file}")

    except Exception as e:
        logger.error(f"Error in main process: {str(e)}", exc_info=True)

if __name__ == "__main__":
    main()