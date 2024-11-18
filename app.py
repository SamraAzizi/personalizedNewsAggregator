from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
from logging.handlers import RotatingFileHandler
import logging
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from fetch_news import newsFetcher

import requests
from bs4 import BeautifulSoup

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///news.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS', 'False').lower() == 'true'

# JWT Configuration
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)  # Token expires in 1 day
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)  # Refresh token expires in 30 days
app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'error': 'Invalid token',
        'message': 'The token provided is invalid'
    }), 422

@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({
        'error': 'No token provided',
        'message': 'No authorization token was provided'
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_data):
    return jsonify({
        'error': 'Token expired',
        'message': 'The token has expired'
    }), 401

# Setup logging
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/news_aggregator.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('News Aggregator startup')

# Security Headers
@app.after_request
def add_security_headers(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    preferences = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    url = db.Column(db.String(500))
    topic = db.Column(db.String(50))
    sentiment = db.Column(db.Float)
    published_at = db.Column(db.DateTime)
    source = db.Column(db.String(100))

class UserInteraction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'))
    interaction_type = db.Column(db.String(20))  # 'view', 'like', 'bookmark'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Recommendation Engine
class RecommendationEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.content_matrix = None
        self.articles = None

    def train(self, articles_df):
        # Check for NaN values and drop them
        articles_df = articles_df.dropna(subset=['content', 'topic'])
        self.articles = articles_df
        content_features = self.vectorizer.fit_transform(articles_df['content'])
        self.content_matrix = content_features

    def get_recommendations(self, user_preferences, n=10):
        if self.content_matrix is None:
            return []

        user_profile = np.zeros((1 , self.content_matrix.shape[1]))
        for pref in user_preferences:
            pref_articles = self.articles[self.articles['topic'] == pref.lower()]
            if not pref_articles.empty:
                pref_vectors = self.content_matrix[pref_articles.index]
                user_profile += np.mean(pref_vectors.toarray(), axis=0)

        similarity_scores = cosine_similarity(user_profile, self.content_matrix)
        top_indices = similarity_scores[0].argsort()[-n:][::-1]
        
        return self.articles.iloc[top_indices]

# Initialize the global recommender instance
recommender = RecommendationEngine()

def initialize_recommender():
    try:
        # Load the news data
        df = pd.read_csv('processed_news.csv')
        # Clean the data
        df = df.dropna(subset=['content', 'topic'])
        # Train the recommender
        recommender.train(df)
        app.logger.info('Recommender initialized successfully')
    except Exception as e:
        app.logger.error(f'Error initializing recommender: {str(e)}')
        raise

# API Route for /api/auth/login
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Missing email or password'}), 400

        user = User.query.filter_by(email=data['email']).first()
        if user and user.check_password(data['password']):
            access_token = create_access_token(identity=user.id)
            return jsonify({
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'preferences': user.preferences or []
                }
            }), 200
        return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        app.logger.error(f'Login error: {str(e)}')
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        user = User(
            username=data['username'],
            email=data['email'],
            preferences=data.get('preferences', [])
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'preferences': user.preferences
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Registration error: {str(e)}')
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/user/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data or 'preferences' not in data:
            return jsonify({'error': 'No preferences provided'}), 400

        preferences = data.get('preferences', [])
        if not isinstance(preferences, list):
            return jsonify({'error': 'Preferences must be a list'}), 400

        user.preferences = preferences
        db.session.commit()

        return jsonify({
            'message': 'Preferences updated successfully',
            'preferences': user.preferences
        }), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Error updating preferences: {str(e)}')
        return jsonify({'error': 'Failed to update preferences'}), 500

@app.route('/api/recommend', methods=['POST'])
def recommend_news():
    try:
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        current_user = None
        if token:
            try:
                user_id = get_jwt_identity()
                current_user = User.query.get(user_id)
            except:
                # Token invalid or expired, but continue with default recommendations
                pass

        data = request.get_json() or {}
        preferences = data.get('preferences', [])
        
        # If user is logged in, merge their stored preferences with current selection
        if current_user and current_user.preferences:
            preferences = list(set(preferences + current_user.preferences))
        
        # If no preferences, use default categories
        if not preferences:
            preferences = ['technology', 'general', 'business']

        # Initialize news fetcher with error handling
        try:
            news_fetcher = NewsFetcher()
            articles = news_fetcher.fetch_news(preferences)
            
            # Ensure articles is a list and has required fields
            if not isinstance(articles, list):
                articles = []
            
            # Format articles to ensure all required fields exist
            formatted_articles = []
            for article in articles:
                formatted_article = {
                    'title': article.get('title', ''),
                    'description': article.get('description', ''),
                    'url': article.get('url', ''),
                    'urlToImage': article.get('urlToImage', ''),
                    'publishedAt': article.get('publishedAt', ''),
                    'source': article.get('source', {}).get('name', ''),
                    'category': article.get('category', 'general')
                }
                formatted_articles.append(formatted_article)
            
            return jsonify({
                'articles': formatted_articles,
                'preferences': preferences
            }), 200
            
        except Exception as e:
            app.logger.error(f'News fetcher error: {str(e)}')
            return jsonify({
                'articles': [],
                'preferences': preferences,
                'error': 'Failed to fetch news'
            }), 200  # Return 200 with empty articles instead of 500
            
    except Exception as e:
        app.logger.error(f'Error in news recommendation: {str(e)}')
        return jsonify({
            'error': 'Failed to fetch news',
            'message': str(e)
        }), 500

@app.route('/api/auth/check', methods=['GET'])
@jwt_required(optional=True)
def check_auth():
    try:
        current_user_id = get_jwt_identity()
        if current_user_id:
            user = User.query.get(current_user_id)
            if user:
                return jsonify({
                    'authenticated': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'preferences': user.preferences or []
                    }
                }), 200
        return jsonify({'authenticated': False}), 200
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 401

# Route for the home page
@app.route('/')
def index():
    def get_news():
        try:
            # Read the CSV file
            df = pd.read_csv('processed_news.csv')
            
            # Convert DataFrame to list of dictionaries
            articles = df[['title', 'description', 'url', 'category']].to_dict('records')
            
            # Group articles by category
            categorized_articles = {}
            for article in articles:
                category = article['category']
                if category not in categorized_articles:
                    categorized_articles[category] = []
                categorized_articles[category].append(article)
            
            return categorized_articles
        except Exception as e:
            print(f"Error reading news data: {e}")
            return {}
    
    news_articles = get_news()
    return render_template('index.html', categorized_news=news_articles)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        initialize_recommender()  # Initialize the recommender when starting the app
    app.run(debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true')