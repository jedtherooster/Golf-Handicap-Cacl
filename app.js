const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(cors());
app.use(express.json());

// Create or connect to SQLite database
const db = new sqlite3.Database('./golf-handicap.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the golf-handicap database.');
  }
});

// Create the scorecards table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS scorecards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    score INTEGER,
    courseRating REAL,
    slopeRating INTEGER,
    date TEXT
  )
`);

// Add a new scorecard
app.post('/submit', (req, res) => {
  const { score, courseRating, slopeRating } = req.body;
  const date = new Date().toISOString();

  const query = `
    INSERT INTO scorecards (score, courseRating, slopeRating, date)
    VALUES (?, ?, ?, ?)
  `;
  db.run(query, [score, courseRating, slopeRating, date], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Scorecard added successfully', id: this.lastID });
  });
});

// Get the best 6 scorecards for handicap calculation
app.get('/best6', (req, res) => {
  const query = `
    SELECT * FROM scorecards
    ORDER BY (score - courseRating) * 113 / slopeRating
    LIMIT 6
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate the handicap based on the best 6 scorecards
    const handicapDifferentials = rows.map(row => ((row.score - row.courseRating) * 113) / row.slopeRating);
    const averageHandicap = handicapDifferentials.reduce((acc, val) => acc + val, 0) / handicapDifferentials.length;
    res.json({ handicap: averageHandicap.toFixed(2), scorecards: rows });
  });
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
