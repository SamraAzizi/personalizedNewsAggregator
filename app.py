from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import logging
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///news.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Setup logging
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/news_aggregator.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('News Aggregator startup')

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

recommender = RecommendationEngine()

def initialize_recommender():
    try:
        df = pd.read_csv('processed_news.csv')
        recommender.train(df)
        app.logger.info('Recommendation engine initialized successfully')
    except Exception as e:
        app.logger.error(f'Error initializing recommendation engine: {str(e)}')

# API Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/saved')
@jwt_required()
def saved_articles():
    return render_template('saved_articles.html')

@app.route('/recommendations')
@jwt_required()
def recommendations():
    return render_template('recommendations.html')

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']):
            access_token = create_access_token(identity=user.id)
            return jsonify({
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'preferences': user.preferences
                }
            }), 200
        return jsonify({'error': 'Invalid credentials'}), 401
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
        user.preferences = data.get('preferences', [])
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
def recommend_api():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        preferences = data.get('preferences', [])
        if not preferences:
            return jsonify({'error': 'No preferences provided'}), 400

        # Load news data
        try:
            df = pd.read_csv('processed_news.csv')
        except Exception as e:
            app.logger.error(f'Error loading news data: {str(e)}')
            return jsonify({'error': 'Could not load news data'}), 500

        # Get recommendations
        recommended_articles = recommender.get_recommendations(preferences)
        
        # Convert to dictionary format
        articles = recommended_articles.to_dict('records')
        
        # Format the response
        formatted_articles = []
        for article in articles:
            formatted_articles.append({
                'id': str(article.get('id', '')),
                'title': article.get('title', ''),
                'description': article.get('content', '')[:200] + '...' if article.get('content') else '',
                'url': article.get('url', ''),
                'urlToImage': article.get('image_url', ''),
                'publishedAt': article.get('published_at', ''),
                'source': article.get('source', ''),
                'category': article.get('topic', ''),
                'sentiment': article.get('sentiment', 0)
            })

        return jsonify({
            'articles': formatted_articles
        }), 200

    except Exception as e:
        app.logger.error(f'Recommendation error: {str(e)}')
        return jsonify({'error': 'Failed to get recommendations'}), 500

# Run the app
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        initialize_recommender()  # Initialize the recommender when starting the app
    app.run(debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true')