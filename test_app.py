import unittest
from app import app

class FlaskTestCase(unittest.TestCase):
    def test_home(self):
        tester = app.test_client(self)
        response = tester.get('/')
        self.assertEqual(response.status_code, 200)

    def test_recommend(self):
        tester = app.test_client(self)
        response = tester.post('/recommend', data=dict(preferences="technology"))
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main()
