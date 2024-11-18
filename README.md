
# News Aggregator Application

## Overview

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

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/news-aggregator.git
   cd news-aggregator
