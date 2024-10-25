const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const axios = require('axios');
const natural = require('natural');
const TfIdf = natural.TfIdf;
const { HfInference } = require('@huggingface/inference');
const lda = require('lda');
const stopword = require('stopword');
const sgMail = require('@sendgrid/mail');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_secret_key';
const NEWS_API_KEY = 'your_news_api_key';
const HF_API_KEY = 'your_huggingface_api_key';
const SENDGRID_API_KEY = 'your_sendgrid_api_key';

const hf = new HfInference(HF_API_KEY);
sgMail.setApiKey(SENDGRID_API_KEY);

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost/news_app', { useNewUrlParser: true, useUnifiedTopology: true });

// Define schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  preferences: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPreference' },
  interactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interaction' }]
});

const UserPreferenceSchema = new mongoose.Schema({
  categories: [String],
  keywords: [String],
  sources: [String]
});

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

const InteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  liked: { type: Boolean, default: false },
  readingTime: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const UserPreference = mongoose.model('UserPreference', UserPreferenceSchema);
const Article = mongoose.model('Article', ArticleSchema);
const Interaction = mongoose.model('Interaction', InteractionSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.post('/api/preferences', authenticateJWT, async (req, res) => {
  try {
    const { categories, keywords, sources } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    let preferences;
    if (user.preferences) {
      preferences = await UserPreference.findByIdAndUpdate(
        user.preferences,
        { categories, keywords, sources },
        { new: true }
      );
    } else {
      preferences = new UserPreference({ categories, keywords, sources });
      await preferences.save();
      user.preferences = preferences._id;
      await user.save();
    }
    
    res.json({ message: 'Preferences updated successfully', preferences });
  } catch (error) {
    res.status(500).json({ message: 'Error updating preferences' });
  }
});

app.get('/api/preferences', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('preferences');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json(user.preferences || {});
  } catch (error) {
    res.status(500).json({ message: 'Error fetching preferences' });
  }
});

app.get('/api/news', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('preferences');
    if (!user || !user.preferences) return res.status(404).json({ message: 'User preferences not found' });
    
    const { categories, keywords } = user.preferences;
    let allArticles = [];
    
    for (const category of categories) {
      const articles = await fetchAndStoreNews(category, category);
      allArticles = allArticles.concat(articles);
    }
    
    for (const keyword of keywords) {
      const articles = await fetchAndStoreNews(keyword);
      allArticles = allArticles.concat(articles);
    }
    
    const uniqueArticles = Array.from(new Set(allArticles.map(a => a.url)))
      .map(url => allArticles.find(a => a.url === url))
      .slice(0, 20);
    
    res.json(uniqueArticles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching personalized news' });
  }
});

app.post('/api/interaction', authenticateJWT, async (req, res) => {
  try {
    const { articleId, liked, readingTime } = req.body;
    const user = await User.findById(req.userId);
    const article = await Article.findById(articleId);
    
    if (!user || !article) return res.status(404).json({ message: 'User or Article not found' });
    
    let interaction = await Interaction.findOne({ user: user._id, article: article._id });
    
    if (interaction) {
      interaction.liked = liked;
      interaction.readingTime += readingTime;
      await interaction.save();
    } else {
      interaction = new Interaction({ user: user._id, article: article._id, liked, readingTime });
      await interaction.save();
      user.interactions.push(interaction._id);
      await user.save();
    }
    
    res.json({ message: 'Interaction recorded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error recording interaction' });
  }
});

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
    
    const uniqueRecommendations = Array.from(new Set(recommendedArticles.map(a => a._id.toString())))
      .map(_id => recommendedArticles.find(a => a._id.toString() === _id))
      .slice(0, 10);
    
    res.json(uniqueRecommendations);
  } catch (error) {
    res.status(500).json({ message: 'Error getting recommendations' });
  }
});

app.get('/api/recommendations/content-based', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('interactions');
    const userInteractions = await Interaction.find({ user: req.userId, liked: true }).populate('article');
    
    if (userInteractions.length === 0) return res.json([]);
    
    const allArticles = await Article.find({});
    const allArticleTexts = allArticles.map(article => `${article.title} ${article.description}`);
    
    const userLikedArticles = userInteractions.map(interaction => interaction.article);
    const userLikedTexts = userLikedArticles.map(article => `${article.title} ${article.description}`);
    
    const userProfile = calculateTfIdfVector(userLikedTexts.join(' '), allArticleTexts);
    
    const articleScores = allArticles.map(article => {
      const articleVector = calculateTfIdfVector(`${article.title} ${article.description}`, allArticleTexts);
      const similarity = cosineSimilarity(userProfile, articleVector);
      return { article, similarity };
    });
    
    const sortedRecommendations = articleScores
      .sort((a, b) => b.similarity - a.similarity)
      .filter(item => !userLikedArticles.some(likedArticle => likedArticle._id.toString() === item.article._id.toString()))
      .slice(0, 10);
    
    res.json(sortedRecommendations.map(item => item.article));
  } catch (error) {
    res.status(500).json({ message: 'Error getting recommendations' });
  }
});

app.get('/api/notifications', authenticateJWT, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.userId }).sort({ timestamp: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

app.post('/api/notifications/read', authenticateJWT, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.userId, read: false }, { read: true });
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Helper functions
async function fetchAndStoreNews(query, category) {
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        category: category,
        apiKey: NEWS_API_KEY,
        language: 'en',
        pageSize: 10,
      },
    });
    
    const articles = response.data.articles;
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
        if (error.code !== 11000) {
          console.error('Error storing article:', error);
        }
      }
    }
    
    const topics = performTopicModeling(storedArticles);
    await assignTopicsToArticles(storedArticles, topics);
    
    return storedArticles;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

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
  return lda(filteredDocuments, numTopics, numTerms);
}

async function assignTopicsToArticles(articles, topics) {
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const articleTopics = topics.map((topic, index) => ({
      topic: `Topic ${index + 1}: ${topic.join(', ')}`,
      probability: 1 / topics.length
    }));
    
    article.topics = articleTopics;
    await article.save();
  }
}

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
  
  return similarityScores.sort((a, b) => b.score - a.score).slice(0, 5);
}

function calculateTfIdfVector(text, allDocuments) {
  const tfidf = new TfIdf();
  allDocuments.forEach(doc => tfidf.addDocument(doc));
  tfidf.addDocument(text);
  
  const vector = {};
  tfidf.listTerms(allDocuments.length).forEach(item => {
    vector[item.term] = item.tfidf;
  });
  
  return vector;
}

function cosineSimilarity(vec1, vec2) {
  const intersection = Object.keys(vec1).filter(key => key in vec2);
  const dotProduct = intersection.reduce((sum, key) => sum + vec1[key] * vec2[key], 0);
  const mag1 = Math.sqrt(Object.values(vec1).reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(Object.values(vec2).reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (mag1 * mag2);
}

async function sendEmailDigest(user) {
  try {
    const articles = await Article.find({
      $or: [
        { category: { $in: user.preferences.categories } },
        { keyword: { $in: user.preferences.keywords } }
      ]
    }).sort({ publishedAt: -1 }).limit(10);
    
    const articleList = articles.map(article => `<li>${article.title} - <a href="${article.url}">Read more</a></li>`).join('');
    
    const msg = {
      to: user.email,
      from: 'your_email@example.com',
      subject: 'Your Daily News Digest',
      html: `<h1>Your Daily News Digest</h1><ul>${articleList}</ul>`,
    };
    
    await sgMail.send(msg);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending email digest:', error);
  }
}

async function sendDailyDigests() {
  const users = await User.find({}).populate('preferences');
  for (const user of users) {
    await sendEmailDigest(user);
  }
}

// Schedule daily email digest
cron.schedule('0 8 * * *', () => {
  console.log('Running daily email digest...');
  sendDailyDigests();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});