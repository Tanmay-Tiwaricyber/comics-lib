const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Using promises version of fs
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./users.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, email TEXT, password TEXT)");
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Set view engine and layouts
app.use(expressLayouts);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout'); // This sets layout.ejs as your default layout
app.set("layout extractScripts", true); // Optional: for script extraction
app.set("layout extractStyles", true); // Optional: for style extraction

// Authentication middleware
function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get('/', requireLogin, async (req, res) => {
  try {
    const comicsDir = path.join(__dirname, 'public', 'comics');
    const files = await fs.readdir(comicsDir);
    
    const pdfFiles = await Promise.all(
      files
        .filter(file => file.endsWith('.pdf'))
        .map(async file => {
          const stats = await fs.stat(path.join(comicsDir, file));
          return {
            filename: file,
            name: file.replace('.pdf', '').replace(/_/g, ' '),
            downloadUrl: `/comics/${file}`,
            thumbnail: '/images/pdf-icon.png',
            size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB'
          };
        })
    );
    
    res.render('library', { 
      title: 'Comic Library',
      comics: pdfFiles, 
      user: req.session.user 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading comics directory');
  }
});

app.get('/viewer/:filename', requireLogin, (req, res) => {
  const filePath = path.join(__dirname, 'public', 'comics', req.params.filename);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK)
    .then(() => {
      res.render('viewer', { 
        title: 'Comic Viewer',
        filename: req.params.filename,
        user: req.session.user 
      });
    })
    .catch(() => {
      res.status(404).send('File not found');
    });
});

app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Login',
    error: null,
    user: req.session.user 
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) {
      return res.render('login', { 
        title: 'Login',
        error: 'Invalid username or password',
        user: req.session.user 
      });
    }
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        req.session.user = { id: user.id, username: user.username };
        res.redirect('/');
      } else {
        res.render('login', { 
          title: 'Login',
          error: 'Invalid username or password',
          user: req.session.user 
        });
      }
    });
  });
});

app.get('/register', (req, res) => {
  res.render('register', { 
    title: 'Register',
    error: null,
    user: req.session.user 
  });
});

app.post('/register', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  if (password !== confirmPassword) {
    return res.render('register', { 
      title: 'Register',
      error: 'Passwords do not match',
      user: req.session.user 
    });
  }
  
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (user) {
      return res.render('register', { 
        title: 'Register',
        error: 'Username already exists',
        user: req.session.user 
      });
    }
    
    bcrypt.hash(password, 10, (err, hash) => {
      db.run("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", 
        [username, email, hash], (err) => {
          if (err) {
            return res.render('register', { 
              title: 'Register',
              error: 'Registration failed',
              user: req.session.user 
            });
          }
          res.redirect('/login');
        });
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});