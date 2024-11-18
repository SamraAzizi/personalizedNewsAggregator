


This is a Flask-based web application that aggregates news articles from various categories and provides personalized news recommendations to users. The application uses JWT for authentication, SQLAlchemy for database management, and incorporates machine learning techniques for recommending articles based on user preferences.

## Features

- **User  Authentication**: Register and log in using email and password.
- **Personalized News Recommendations**: Users can set preferences for news categories, and the application will recommend articles based on these preferences.
- **News Fetching**: Articles are fetched from the News API and categorized into various topics.
- **Logging**: The application logs important events and errors for monitoring and debugging.
- **Frontend**: A simple web interface to display news articles.

## Technologies Used

- **Flask**: Web framework for building the application.
- **Flask-CORS**: For handling Cross-Origin Resource Sharing.
- **Flask-JWT-Extended**: For JWT authentication.
- **Flask-SQLAlchemy**: ORM for database interactions.
- **Pandas**: Data manipulation and analysis.
- **Scikit-learn**: For implementing the recommendation engine using TF-IDF and cosine similarity.
- **Requests**: For making HTTP requests to fetch news articles.
- **BeautifulSoup**: For web scraping (if needed).
- **SQLite**: Database for storing user and article data.
- **HTML/CSS**: For the frontend template.

## Setup Instructions

### Prerequisites

- Python 3.6 or higher
- pip (Python package manager)
- A valid API key from [News API](https://newsapi.org/)

## Usage

1. **User  Registration and Login**:
   - Users can register for an account by providing their email and password.
   - After registration, users can log in using their credentials.

2. **Setting User Preferences**:
   - Once logged in, users can update their preferences for news categories (e.g., Technology, Sports, Health).
   - This can be done via the user preferences endpoint.

3. **Fetching Recommended Articles**:
   - The application will provide personalized news recommendations based on the user's preferences.
   - Users can view recommended articles on their dashboard.

4. **Viewing News Articles**:
   - Users can browse through the aggregated news articles from various categories.
   - Clicking on an article will take the user to the full article on the original source.

5. **Logging Out**:
   - Users can log out to end their session, which will invalidate their JWT token.


