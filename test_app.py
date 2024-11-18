import unittest
import json
from app import app, db, User, Article, UserInteraction
from datetime import datetime
import jwt

class FlaskTestCase(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        self.client = app.test_client()

        # Create tables
        with app.app_context():
            db.create_all()
            self._create_test_data()

    def tearDown(self):
        """Clean up after each test."""
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def _create_test_data(self):
        """Create test data in the database."""
        # Create test user
        test_user = User(
            username='testuser',
            email='test@example.com',
            preferences=['technology', 'science']
        )
        db.session.add(test_user)

        # Create test articles
        test_articles = [
            Article(
                title='Test Tech Article',
                content='This is a test technology article',
                url='http://example.com/tech',
                topic='technology',
                sentiment=0.5,
                published_at=datetime.utcnow(),
                source='Test Source'
            ),
            Article(
                title='Test Science Article',
                content='This is a test science article',
                url='http://example.com/science',
                topic='science',
                sentiment=-0.2,
                published_at=datetime.utcnow(),
                source='Test Source'
            )
        ]
        db.session.bulk_save_objects(test_articles)
        db.session.commit()

    def _get_test_token(self, user_id=1):
        """Generate a test JWT token."""
        return jwt.encode(
            {'identity': user_id},
            app.config['JWT_SECRET_KEY'],
            algorithm='HS256'
        )

    def test_home(self):
        """Test home route."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_recommend_unauthorized(self):
        """Test recommendation route without authentication."""
        response = self.client.post('/api/recommend')
        self.assertEqual(response.status_code, 401)

    def test_recommend_authorized(self):
        """Test recommendation route with authentication."""
        token = self._get_test_token()
        headers = {'Authorization': f'Bearer {token}'}
        
        response = self.client.post(
            '/api/recommend',
            headers=headers,
            json={'preferences': ['technology']}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('articles', data)

    def test_search_articles(self):
        """Test article search functionality."""
        token = self._get_test_token()
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test search with various parameters
        test_cases = [
            {'q': 'technology', 'expected_count': 1},
            {'category': 'science', 'expected_count': 1},
            {'sentiment': '0.4', 'expected_count': 1},
            {'q': 'nonexistent', 'expected_count': 0}
        ]

        for case in test_cases:
            query_params = {k: v for k, v in case.items() if k != 'expected_count'}
            response = self.client.get(
                '/api/articles/search',
                query_string=query_params,
                headers=headers
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertEqual(len(data), case['expected_count'])

    def test_user_preferences(self):
        """Test user preferences update."""
        token = self._get_test_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        new_preferences = ['sports', 'technology']
        response = self.client.put(
            '/api/user/preferences',
            headers=headers,
            json={'preferences': new_preferences}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify preferences were updated
        with app.app_context():
            user = User.query.get(1)
            self.assertEqual(user.preferences, new_preferences)

    def test_error_handling(self):
        """Test error handling."""
        # Test 404 error
        response = self.client.get('/nonexistent-route')
        self.assertEqual(response.status_code, 404)
        
        # Test invalid token
        headers = {'Authorization': 'Bearer invalid-token'}
        response = self.client.get('/api/articles/search', headers=headers)
        self.assertEqual(response.status_code, 422)

    def test_user_interaction_logging(self):
        """Test user interaction logging."""
        token = self._get_test_token()
        headers = {'Authorization': f'Bearer {token}'}
        
        response = self.client.post(
            '/api/recommend',
            headers=headers,
            json={'preferences': ['technology']}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify interaction was logged
        with app.app_context():
            interactions = UserInteraction.query.filter_by(user_id=1).all()
            self.assertGreater(len(interactions), 0)

    def test_sentiment_analysis(self):
        """Test sentiment analysis results."""
        token = self._get_test_token()
        headers = {'Authorization': f'Bearer {token}'}
        
        response = self.client.get(
            '/api/articles/search',
            query_string={'sentiment': '0.3'},
            headers=headers
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        for article in data:
            self.assertGreaterEqual(article['sentiment'], 0.3)

if __name__ == '__main__':
    unittest.main()