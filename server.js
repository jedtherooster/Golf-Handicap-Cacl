const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Open the SQLite database
async function openDb() {
  return open({
    filename: './scorecards.db',
    driver: sqlite3.Database
  });
}

// Function to create the scorecards table
async function createTable() {
  const db = await openDb();
  await db.run(`
    CREATE TABLE IF NOT EXISTS scorecards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER NOT NULL,
      courseRating REAL NOT NULL,
      slopeRating INTEGER NOT NULL,
      date TEXT NOT NULL
    )
  `);
}

// Create the table on server start
createTable().catch(err => {
  console.error('Error creating table:', err);
});

// Endpoint to submit a scorecard
app.post('/submit', async (req, res) => {
  const { score, courseRating, slopeRating, date } = req.body;

  try {
    const db = await openDb();
    if (!score || !courseRating || !slopeRating || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.run(`
      INSERT INTO scorecards (score, courseRating, slopeRating, date)
      VALUES (?, ?, ?, ?)
    `, [score, courseRating, slopeRating, date]);

    res.status(201).json({ message: 'Scorecard added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add scorecard' });
  }
});

// Endpoint to fetch all scorecards
app.get('/all-scorecards', async (req, res) => {
  try {
    const db = await openDb();
    const scorecards = await db.all('SELECT * FROM scorecards');
    res.json({ scorecards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch scorecards' });
  }
});

// Endpoint to calculate handicap
app.get('/best6', async (req, res) => {
  try {
    const db = await openDb();
    const scorecards = await db.all('SELECT score, courseRating, slopeRating FROM scorecards ORDER BY date DESC LIMIT 6');
    if (scorecards.length === 0) {
      return res.status(400).json({ handicap: 'No scorecards available for calculation.' });
    }

    // Calculate the average of the best 6 scorecards for handicap calculation
    const total = scorecards.reduce((acc, card) => acc + card.score, 0);
    const average = total / scorecards.length;

    // Assuming some logic to convert average to handicap here
    const handicap = average - (scorecards[0].courseRating * 113 / scorecards[0].slopeRating);
    res.json({ handicap: handicap.toFixed(2) }); // Respond with calculated handicap
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate handicap' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
