from flask import Flask, render_template, request, send_from_directory
import pandas as pd
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/recommend', methods=['POST'])
def recommend():
    user_preferences = request.form.get('preferences').split(',')
    print("User preferences:", user_preferences)
    articles = recommend_articles(user_preferences)
    print("Recommended articles:", articles)
    return render_template('recommendations.html', articles=articles)

def recommend_articles(preferences):
    df = pd.read_csv('processed_news.csv')
    print("DataFrame loaded from CSV:\n", df.head())

    def match_topic(row, preferences):
        topic = row['topic']
        for pref in preferences:
            if pref.lower() == topic:
                return True
        return False

    recommendations = df[df.apply(lambda row: match_topic(row, preferences), axis=1)]
    print("Recommendations DataFrame:\n", recommendations.head())

    return recommendations.to_dict(orient='records')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico')

if __name__ == '__main__':
    app.run(debug=True)
