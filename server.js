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
  console.log('Received a scorecard submission:', req.body);
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
    console.error('Error adding scorecard:', err);
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
    console.error('Error fetching scorecards:', err);
    res.status(500).json({ error: 'Failed to fetch scorecards' });
  }
});

// Endpoint to calculate handicap
app.get('/best6', async (req, res) => {
  try {
    const db = await openDb();
    
    // Fetch the last 20 scorecards
    const scorecards = await db.all('SELECT score, courseRating, slopeRating FROM scorecards ORDER BY date DESC LIMIT 20');

    if (scorecards.length === 0) {
      return res.status(400).json({ handicap: 'No scorecards available for calculation.' });
    }

    // Calculate the handicaps for each scorecard
    const handicaps = scorecards.map(card => {
      return ((card.score - card.courseRating) / card.slopeRating) * 113;
    });

    // Sort the calculated handicaps and take the best 8
    handicaps.sort((a, b) => a - b);
    const bestHandicaps = handicaps.slice(0, 8); // Adjusted to take best 8 for WHS

    // Calculate the average of the best handicaps
    const averageHandicap = bestHandicaps.reduce((acc, h) => acc + h, 0) / bestHandicaps.length;

    res.json({ handicap: averageHandicap.toFixed(2) });
  } catch (err) {
    console.error('Error calculating handicap:', err);
    res.status(500).json({ error: 'Failed to calculate handicap' });
  }
});

// Endpoint to delete all scorecards
app.delete('/delete-all-scorecards', async (req, res) => {
  try {
    const db = await openDb();
    await db.run('DELETE FROM scorecards');
    res.status(200).json({ message: 'All scorecards deleted successfully.' });
  } catch (err) {
    console.error('Error deleting scorecards:', err);
    res.status(500).json({ error: 'Failed to delete scorecards' });
  }
});

// Endpoint to delete a scorecard by ID
app.delete('/delete/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const db = await openDb();
    await db.run('DELETE FROM scorecards WHERE id = ?', id);
    res.status(200).json({ message: 'Scorecard deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete scorecard' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
