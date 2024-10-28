<<<<<<< HEAD
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json());

// Mock user data
const users = [];

// Signup route
app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  const userExists = users.find(user => user.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }
  users.push({ email, password });
  res.status(201).json({ message: 'User registered successfully' });
});

// Login route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(user => user.email === email && user.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Middleware to verify token
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Protected route example
app.get('/api/protected', authenticateJWT, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
=======
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json());

// Mock user data
const users = [];

// Signup route
app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  const userExists = users.find(user => user.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }
  users.push({ email, password });
  res.status(201).json({ message: 'User registered successfully' });
});

// Login route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(user => user.email === email && user.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Middleware to verify token
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Protected route example
app.get('/api/protected', authenticateJWT, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
>>>>>>> 06edc16 (news)
});