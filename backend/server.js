const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const axios = require('axios');
const natural = require('natural');
const TfIdf = natural.TfIdf;
const tf = require('@tensorflow/tfjs-node');
const { HfInference } = require('@huggingface/inference');
const lda = require('lda');
const stopword = require('stopword');
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_secret_key';
const NEWS_API_KEY = 'your_news_api_key';
const HF_API_KEY = 'your_huggingface_api_key';

const hf = new HfInference(HF_API_KEY)
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost/news_app', { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  preferences: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPreference' },
  interactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interaction' }]
});

const User = mongoose.model('User', UserSchema);

// UserPreference Schema (assuming it's defined somewhere)
const UserPreferenceSchema = new mongoose.Schema({
  categories: [String],
  keywords: [String]
});

const UserPreference = mongoose.model('UserPreference', UserPreferenceSchema);

// Article Schema
const ArticleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true, unique: true },
    urlToImage: { type: String },
    publishedAt: { type: Date },
    source: { type: String },
    category: { type: String },
    keyword: { type: String },
    sentiment: { type: String },
    topics: [{ topic: String, probability: Number }]
  });
  

  const Article = mongoose.model('Article', ArticleSchema);
// Interaction Schema
const InteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  liked: { type: Boolean, default: false },
  readingTime: { type: Number, default: 0 }, // in seconds
  timestamp: { type: Date, default: Date.now }
});

const Interaction = mongoose.model('Interaction', InteractionSchema);

// Middleware to authenticate JWT (assuming it's defined somewhere)
function authenticateJWT(req, res, next) {
  // JWT authentication logic here
}


// Function to perform sentiment analysis


async function analyzeSentiment(text) {
  try {
    const result = await hf.textClassification({
      model: 'distilbert-base-uncased-finetuned-sst-2-english',
      inputs: text,
    });
    return result[0].label;
  } catch (error) {
    console.error('Error performing sentiment analysis:', error);
    return 'NEUTRAL';
  }
}

function performTopicModeling(articles, numTopics = 5, numTerms = 5) {
    const documents = articles.map(article => {
      const text = `${article.title} ${article.description}`;
      return text.toLowerCase().split(' ');
    });
  
    const filteredDocuments = documents.map(doc => stopword.removeStopwords(doc));
  
    const result = lda(filteredDocuments, numTopics, numTerms);
  
    return result;
  }
  
  // Function to assign topics to articles
  async function assignTopicsToArticles(articles, topics) {
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const articleTopics = topics.map((topic, index) => ({
        topic: `Topic ${index + 1}: ${topic.join(', ')}`,
        probability: 1 / topics.length // Simple equal probability for now
      }));
  
      article.topics = articleTopics;
      await article.save();
    }
  }

// Function to fetch news from NewsAPI and store in database
async function fetchAndStoreNews(query, category) {
    try {
      // ... (previous fetchAndStoreNews code remains the same)
  
      const storedArticles = [];
  
      for (const article of articles) {
        try {
          const sentiment = await analyzeSentiment(article.title + ' ' + article.description);
          const newArticle = new Article({
            title: article.title,
            description: article.description,
            url: article.url,
            urlToImage: article.urlToImage,
            publishedAt: article.publishedAt,
            source: article.source.name,
            category: category,
            keyword: query,
            sentiment: sentiment
          });
  
          await newArticle.save();
          storedArticles.push(newArticle);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`Article already exists: ${article.url}`);
          } else {
            console.error('Error storing article:', error);
          }
        }
      }
  
      // Perform topic modeling on the stored articles
      const topics = performTopicModeling(storedArticles);
      await assignTopicsToArticles(storedArticles, topics);
  
      return storedArticles;
    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }
// Route to get personalized news
app.get('/api/news', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('preferences');
    if (!user || !user.preferences) {
      return res.status(404).json({ message: 'User preferences not found' });
    }

    const { categories, keywords } = user.preferences;
    let allArticles = [];

    // Fetch and store news for each category
    for (const category of categories) {
      const articles = await fetchAndStoreNews(category, category);
      allArticles = allArticles.concat(articles);
    }

    // Fetch and store news for each keyword
    for (const keyword of keywords) {
      const articles = await fetchAndStoreNews(keyword);
      allArticles = allArticles.concat(articles);
    }

    // Remove duplicates and limit the number of articles
    const uniqueArticles = Array.from(new Set(allArticles.map(a => a.url)))
      .map(url => allArticles.find(a => a.url === url))
      .slice(0, 20); // Limit to 20 articles, adjust as needed

    res.json(uniqueArticles);
  } catch (error) {
    console.error('Error fetching personalized news:', error);
    res.status(500).json({ message: 'Error fetching personalized news' });
  }
});

// New route to record user interaction
app.post('/api/interaction', authenticateJWT, async (req, res) => {
  try {
    const { articleId, liked, readingTime } = req.body;
    const user = await User.findById(req.userId);
    const article = await Article.findById(articleId);

    if (!user || !article) {
      return res.status(404).json({ message: 'User or Article not found' });
    }

    let interaction = await Interaction.findOne({ user: user._id, article: article._id });

    if (interaction) {
      // Update existing interaction
      interaction.liked = liked;
      interaction.readingTime += readingTime;
      await interaction.save();
    } else {
      // Create new interaction
      interaction = new Interaction({
        user: user._id,
        article: article._id,
        liked,
        readingTime
      });
      await interaction.save();
      user.interactions.push(interaction._id);
      await user.save();
    }

    res.json({ message: 'Interaction recorded successfully' });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ message: 'Error recording interaction' });
  }
});

// Function to get similar users based on interactions
async function getSimilarUsers(userId) {
  const user = await User.findById(userId).populate('interactions');
  const allUsers = await User.find({}).populate('interactions');

  const similarityScores = allUsers.map(otherUser => {
    if (otherUser._id.toString() === userId.toString()) return { user: otherUser, score: 0 };

    let commonInteractions = 0;
    user.interactions.forEach(userInteraction => {
      const otherUserInteraction = otherUser.interactions.find(
        interaction => interaction.article.toString() === userInteraction.article.toString()
      );
      if (otherUserInteraction) {
        commonInteractions += 1;
        if (userInteraction.liked === otherUserInteraction.liked) {
          commonInteractions += 0.5;
        }
      }
    });

    const similarityScore = commonInteractions / Math.max(user.interactions.length, otherUser.interactions.length);
    return { user: otherUser, score: similarityScore };
  });

  return similarityScores.sort((a, b) => b.score - a.score).slice(0, 5); // Return top 5 similar users
}

// New route to get collaborative recommendations
app.get('/api/recommendations/collaborative', authenticateJWT, async (req, res) => {
  try {
    const similarUsers = await getSimilarUsers(req.userId);
    const user = await User.findById(req.userId).populate('interactions');

    const recommendedArticles = [];
    for (const similarUser of similarUsers) {
      const userInteractions = await Interaction.find({ user: similarUser.user._id, liked: true })
        .populate('article')
        .sort({ timestamp: -1 })
        .limit(5);

      for (const interaction of userInteractions) {
        const alreadyInteracted = user.interactions.some(
          userInteraction => userInteraction.article.toString() === interaction.article._id.toString()
        );
        if (!alreadyInteracted) {
          recommendedArticles.push(interaction.article);
        }
      }
    }

    // Remove duplicates and limit to 10 recommendations
    const uniqueRecommendations = Array.from(new Set(recommendedArticles.map(a => a._id.toString())))
      .map(_id => recommendedArticles.find(a => a._id.toString() === _id))
      .slice(0, 10);

    res.json(uniqueRecommendations);
  } catch (error) {
    console.error('Error getting collaborative recommendations:', error);
    res.status(500).json({ message: 'Error getting recommendations' });
  }
});

// Route to get stored articles
app.get('/api/stored-news', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('preferences');
    if (!user || !user.preferences) {
      return res.status(404).json({ message: 'User preferences not found' });
    }

    const { categories, keywords } = user.preferences;

    // Fetch articles from the database based on user preferences
    const articles = await Article.find({
      $or: [
        { category: { $in: categories } },
        { keyword: { $in: keywords } }
      ]
    }).sort({ publishedAt: -1 }).limit(20);

    res.json(articles);
  } catch (error) {
    console.error('Error fetching stored news:', error);
    res.status(500).json({ message: 'Error fetching stored news' });
  }
});


app.get('/api/articles/topic/:topic', authenticateJWT, async (req, res) => {
    try {
      const { topic } = req.params;
      const articles = await Article.find({ 'topics.topic': { $regex: topic, $options: 'i' } })
        .sort({ publishedAt: -1 })
        .limit(10);
      res.json(articles);
    } catch (error) {
      console.error('Error fetching articles by topic:', error);
      res.status(500).json({ message: 'Error fetching articles' });
    }
  });
  
  // New route to get all topics
  app.get('/api/topics', authenticateJWT, async (req, res) => {
    try {
      const topics = await Article.distinct('topics.topic');
      res.json(topics);
    } catch (error) {
      console.error('Error fetching topics:', error);
      res.status(500).json({ message: 'Error fetching topics' });
    }
  });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
