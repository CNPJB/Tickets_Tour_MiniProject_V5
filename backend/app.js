const express = require("express");
const path = require("path");
const routes = require('./routes');
const bodyParser = require('body-parser');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const app = express();


// Middleware
app.use(session({
  store: new PgSession({
    pool: require('./db'), // ใช้ pool ที่เชื่อมต่อ postgres
    tableName: 'session',   // ตาราง session จะถูกสร้างอัตโนมัติ
  }),
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000// 1 วัน
  } 
}));

// Debugging middleware to log session data
app.use((req, res, next) => {
  console.log('Session:', req.session);
  next();
});
// Middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(routes);

// Static folder to serve HTML, CSS, JS
app.use(express.static(path.join(__dirname, "../public")));


// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});