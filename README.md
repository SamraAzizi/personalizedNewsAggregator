# Personalized News Aggregator

This is a Personalized News Aggregator project built using Python, Flask, Pandas, and the News API. The application allows users to get personalized news recommendations based on their preferences in various categories such as technology, sports, business, entertainment, health, science, travel, and finance.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup Instructions](#setup-instructions)
- [Usage Instructions](#usage-instructions)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Personalized News Aggregator fetches news articles from the News API and processes them to provide personalized recommendations based on user preferences. The application is built using Flask for the web interface, Pandas for data processing, and JSON for handling data interchange. 

## Features

- Fetches news articles from the News API.
- Processes and categorizes news articles.
- Provides personalized news recommendations.
- Easy-to-use web interface.

## Technologies Used

- **Python**: The primary programming language used for the project.
- **Flask**: A micro web framework used to build the web application.
- **Pandas**: A data manipulation and analysis library used for processing news articles.
- **JSON**: A lightweight data-interchange format used for handling data between the application and the News API.
- **News API**: An API used to fetch the latest news articles.

## Setup Instructions

1. **Clone the Repository**:
    ```sh
    git clone https://github.com/your_username/personalized-news-aggregator.git
    cd personalized-news-aggregator
    ```

2. **Create a Virtual Environment**:
    ```sh
    python3 -m venv myenv
    source myenv/bin/activate  # On Windows use `myenv\Scripts\activate`
    ```

3. **Install Dependencies**:
    ```sh
    pip install -r requirements.txt
    ```

4. **Set Up Your News API Key**:
    - Sign up at [News API](https://newsapi.org/) and get your API key.
    - Create a file named `config.py` in the project directory and add your API key:
      ```python
      NEWS_API_KEY = 'your_api_key_here'
      ```

5. **Run the Application**:
    ```sh
    python fetch_news.py
    python process_data.py
    python app.py
    ```

## Usage Instructions

1. **Fetch News**:
    - Run the `fetch_news.py` script to fetch the latest news articles:
      ```sh
      python fetch_news.py
      ```

2. **Process News Data**:
    - Run the `process_data.py` script to process and categorize the news articles:
      ```sh
      python process_data.py
      ```

3. **Start the Flask Application**:
    - Run the Flask application to start the web server:
      ```sh
      python app.py
      ```
    - Open your web browser and go to `http://127.0.0.1:5000` to access the application.

## Project Structure
personalized-news-aggregator/
├── app.py # Main Flask application
├── fetch_news.py # Script to fetch news from News API
├── process_data.py # Script to process fetched news data
├── requirements.txt # Project dependencies
├── templates/ # HTML templates for Flask
│ ├── index.html
│ └── recommendations.html
├── static/ # Static files (CSS, JS, images)
├── news_data.json # Fetched news data
├── processed_news.csv # Processed news data
└── config.py # Configuration file for API keys


## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License.

---

## Additional Knowledge

### Flask

Flask is a micro web framework written in Python. It is designed to be simple and easy to use, making it a popular choice for web development. In this project, Flask is used to create a web interface for the Personalized News Aggregator.

### Pandas

Pandas is a powerful data manipulation and analysis library for Python. It provides data structures like DataFrames, which are used in this project to process and analyze news articles.

### JSON

JSON (JavaScript Object Notation) is a lightweight data-interchange format that is easy to read and write for humans and easy to parse and generate for machines. In this project, JSON is used to handle data fetched from the News API.

### APIs

An API (Application Programming Interface) is a set of rules that allows different software entities to communicate with each other. The News API used in this project allows us to fetch the latest news articles programmatically.



