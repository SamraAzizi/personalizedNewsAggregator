import json
import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Download the necessary NLTK resources
nltk.download('stopwords')
nltk.download('punkt')

# Load data
with open('news_data.json', 'r') as file:
    news_data = json.load(file)

# Print the structure of the JSON data
print(json.dumps(news_data, indent=4))

if 'articles' in news_data:
    articles = news_data['articles']
    df = pd.DataFrame(articles)
    df = df[['title', 'description', 'url', 'content', 'category']]
    print("Initial DataFrame:\n", df.head())

    # Preprocess content
    stop_words = set(stopwords.words('english'))

    def preprocess(text):
        if text:
            tokens = word_tokenize(text.lower())
            filtered_tokens = [word for word in tokens if word.isalnum() and word not in stop_words]
            return filtered_tokens
        return []

    df['tokens'] = df['content'].apply(preprocess)
    print("DataFrame after tokenization:\n", df.head())

    # Define keyword-based topic categorization
    def categorize(row):
        category_keywords = {
            'technology': {'technology', 'ai', 'apple', 'google', 'microsoft', 'android', 'iphone', 'software', 'hardware'},
            'sports': {'sports', 'nba', 'soccer', 'football', 'tennis', 'baseball', 'hockey', 'game', 'match'},
            'finance': {'finance', 'stock', 'market', 'investment', 'bank', 'money', 'economy'},
            'business': {'business', 'company', 'corporate', 'entrepreneur', 'industry'},
            'travel': {'travel', 'trip', 'flight', 'vacation', 'hotel', 'tourism'},
            'entertainment': {'entertainment', 'movie', 'film', 'music', 'celebrity', 'show'},
            'health': {'health', 'medicine', 'doctor', 'hospital', 'disease', 'fitness', 'wellness'},
            'science': {'science', 'research', 'study', 'space', 'biology', 'chemistry', 'physics'}
        }

        tokens = row['tokens']
        for category, keywords in category_keywords.items():
            if any(token in keywords for token in tokens):
                return category
        return row['category']  # Default to the category provided by the API

    df['topic'] = df.apply(categorize, axis=1)
    print("DataFrame with topics:\n", df.head())

    # Print distribution of topics to debug
    print(df['topic'].value_counts())

    df.to_csv('processed_news.csv', index=False)
    print("Processed data saved to processed_news.csv")
else:
    print("Key 'articles' not found in the JSON data")
