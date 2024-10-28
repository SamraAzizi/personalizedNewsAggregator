<<<<<<< HEAD
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

const RecommendationEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: String, required: true },
  recommendations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const UserPreference = mongoose.model('UserPreference', UserPreferenceSchema);
const Article = mongoose.model('Article', ArticleSchema);
const Interaction = mongoose.model('Interaction', InteractionSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const RecommendationEvent = mongoose.model('RecommendationEvent', RecommendationEventSchema);

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

app.get('/api/recommendations', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Assign user to group A or B based on user ID
    const group = user._id.toString().charAt(0) < '8' ? 'A' : 'B';
    
    let recommendations;
    if (group === 'A') {
      recommendations = await generateRecommendationsA(user);
    } else {
      recommendations = await generateRecommendationsB(user);
    }
    
    // Log the recommendation event for analysis
    await logRecommendationEvent(user._id, group, recommendations.map(r => r._id));
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
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

app.get('/api/evaluate-model', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('interactions');
    const userInteractions = await Interaction.find({ user: req.userId }).populate('article');
    
    // Split interactions into training and test sets
    const splitIndex = Math.floor(userInteractions.length * 0.8);
    const trainingSet = userInteractions.slice(0, splitIndex);
    const testSet = userInteractions.slice(splitIndex);
    
    // Generate recommendations based on training set
    const recommendations = await generateRecommendations(user, trainingSet);
    
    // Calculate precision and recall
    const relevantRecommendations = recommendations.filter(rec => 
      testSet.some(interaction => interaction.article._id.toString() === rec._id.toString() && interaction.liked)
    );
    
    const precision = relevantRecommendations.length / recommendations.length;
    const recall = relevantRecommendations.length / testSet.filter(interaction => interaction.liked).length;
    
    res.json({ precision, recall });
  } catch (error) {
    console.error('Error evaluating model:', error);
    res.status(500).json({ message: 'Error evaluating model' });
  }
});

app.get('/api/ab-test-results', authenticateJWT, async (req, res) => {
  try {
    const groupAEvents = await RecommendationEvent.find({ group: 'A' }).populate('user').populate('recommendations');
    const groupBEvents = await RecommendationEvent.find({ group: 'B' }).populate('user').populate('recommendations');
    
    const groupAEngagement = await calculateEngagement(groupAEvents);
    const groupBEngagement = await calculateEngagement(groupBEvents);
    
    res.json({
      groupA: groupAEngagement,
      groupB: groupBEngagement
    });
  } catch (error) {
    console.error('Error analyzing A/B test results:', error);
    res.status(500).json({ message: 'Error analyzing A/B test results' });
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

async function generateRecommendations(user, interactions) {
  // Implement your recommendation logic here
  // This should be a combination of collaborative and content-based filtering
  // For simplicity, we'll just return a random set of articles
  const allArticles = await Article.find({});
  return allArticles.sort(() => 0.5 - Math.random()).slice(0, 10);
}

async function generateRecommendationsA(user) {
  // Implement your current recommendation algorithm here
  // For simplicity, we'll just return a random set of articles
  const allArticles = await Article.find({});
  return allArticles.sort(() => 0.5 - Math.random()).slice(0, 10);
}

async function generateRecommendationsB(user) {
  // Implement a slightly modified version of your recommendation algorithm here
  // For this example, we'll just return articles sorted by publish date
  return await Article.find({}).sort({ publishedAt: -1 }).limit(10);
}

async function logRecommendationEvent(userId, group, recommendationIds) {
  const event = new RecommendationEvent({
    user: userId,
    group: group,
    recommendations: recommendationIds
  });
  await event.save();
}

async function calculateEngagement(events) {
  let totalClicks = 0;
  let totalRecommendations = 0;
  
  for (const event of events) {
    totalRecommendations += event.recommendations.length;
    const userInteractions = await Interaction.find({
      user: event.user._id,
      article: { $in: event.recommendations },
      timestamp: { $gte: event.timestamp }
    });
    totalClicks += userInteractions.length;
  }
  
  return {
    clickThroughRate: totalClicks / totalRecommendations,
    totalEvents: events.length
  };
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


app.post('/api/signup', async (req, res) => {
    const start = performance.now();
    try {
      const { email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();
      
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ message: 'Error registering user' });
    } finally {
      const end = performance.now();
      console.log(`Signup process took ${end - start} milliseconds`);
    }
  });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
=======
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

const RecommendationEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: String, required: true },
  recommendations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const UserPreference = mongoose.model('UserPreference', UserPreferenceSchema);
const Article = mongoose.model('Article', ArticleSchema);
const Interaction = mongoose.model('Interaction', InteractionSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const RecommendationEvent = mongoose.model('RecommendationEvent', RecommendationEventSchema);

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

app.get('/api/recommendations', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Assign user to group A or B based on user ID
    const group = user._id.toString().charAt(0) < '8' ? 'A' : 'B';
    
    let recommendations;
    if (group === 'A') {
      recommendations = await generateRecommendationsA(user);
    } else {
      recommendations = await generateRecommendationsB(user);
    }
    
    // Log the recommendation event for analysis
    await logRecommendationEvent(user._id, group, recommendations.map(r => r._id));
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
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

app.get('/api/evaluate-model', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('interactions');
    const userInteractions = await Interaction.find({ user: req.userId }).populate('article');
    
    // Split interactions into training and test sets
    const splitIndex = Math.floor(userInteractions.length * 0.8);
    const trainingSet = userInteractions.slice(0, splitIndex);
    const testSet = userInteractions.slice(splitIndex);
    
    // Generate recommendations based on training set
    const recommendations = await generateRecommendations(user, trainingSet);
    
    // Calculate precision and recall
    const relevantRecommendations = recommendations.filter(rec => 
      testSet.some(interaction => interaction.article._id.toString() === rec._id.toString() && interaction.liked)
    );
    
    const precision = relevantRecommendations.length / recommendations.length;
    const recall = relevantRecommendations.length / testSet.filter(interaction => interaction.liked).length;
    
    res.json({ precision, recall });
  } catch (error) {
    console.error('Error evaluating model:', error);
    res.status(500).json({ message: 'Error evaluating model' });
  }
});

app.get('/api/ab-test-results', authenticateJWT, async (req, res) => {
  try {
    const groupAEvents = await RecommendationEvent.find({ group: 'A' }).populate('user').populate('recommendations');
    const groupBEvents = await RecommendationEvent.find({ group: 'B' }).populate('user').populate('recommendations');
    
    const groupAEngagement = await calculateEngagement(groupAEvents);
    const groupBEngagement = await calculateEngagement(groupBEvents);
    
    res.json({
      groupA: groupAEngagement,
      groupB: groupBEngagement
    });
  } catch (error) {
    console.error('Error analyzing A/B test results:', error);
    res.status(500).json({ message: 'Error analyzing A/B test results' });
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

async function generateRecommendations(user, interactions) {
  // Implement your recommendation logic here
  // This should be a combination of collaborative and content-based filtering
  // For simplicity, we'll just return a random set of articles
  const allArticles = await Article.find({});
  return allArticles.sort(() => 0.5 - Math.random()).slice(0, 10);
}

async function generateRecommendationsA(user) {
  // Implement your current recommendation algorithm here
  // For simplicity, we'll just return a random set of articles
  const allArticles = await Article.find({});
  return allArticles.sort(() => 0.5 - Math.random()).slice(0, 10);
}

async function generateRecommendationsB(user) {
  // Implement a slightly modified version of your recommendation algorithm here
  // For this example, we'll just return articles sorted by publish date
  return await Article.find({}).sort({ publishedAt: -1 }).limit(10);
}

async function logRecommendationEvent(userId, group, recommendationIds) {
  const event = new RecommendationEvent({
    user: userId,
    group: group,
    recommendations: recommendationIds
  });
  await event.save();
}

async function calculateEngagement(events) {
  let totalClicks = 0;
  let totalRecommendations = 0;
  
  for (const event of events) {
    totalRecommendations += event.recommendations.length;
    const userInteractions = await Interaction.find({
      user: event.user._id,
      article: { $in: event.recommendations },
      timestamp: { $gte: event.timestamp }
    });
    totalClicks += userInteractions.length;
  }
  
  return {
    clickThroughRate: totalClicks / totalRecommendations,
    totalEvents: events.length
  };
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


app.post('/api/signup', async (req, res) => {
    const start = performance.now();
    try {
      const { email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();
      
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ message: 'Error registering user' });
    } finally {
      const end = performance.now();
      console.log(`Signup process took ${end - start} milliseconds`);
    }
  });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
>>>>>>> 06edc16 (news)
