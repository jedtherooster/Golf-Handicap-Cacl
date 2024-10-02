const form = document.getElementById('scorecard-form');
const calculateBtn = document.getElementById('calculate-handicap');
const handicapResult = document.getElementById('handicap-result');
const scorecardsTableBody = document.querySelector('#scorecards-table tbody');
const sortOptions = document.getElementById('sort-options');

let scorecards = []; // Store fetched scorecards

// Function to fetch and display all scorecards
async function fetchAndDisplayScorecards() {
  try {
    const response = await fetch('http://localhost:3000/all-scorecards');
    if (!response.ok) {
      throw new Error('Failed to fetch scorecards');
    }
    const data = await response.json();
    scorecards = data.scorecards; // Store scorecards for sorting
    displayScorecards(scorecards); // Show the fetched scorecards
  } catch (error) {
    console.error('Error fetching scorecards:', error);
  }
}

// Function to display scorecards in the table
function displayScorecards(scorecards) {
  scorecardsTableBody.innerHTML = ''; // Clear existing rows
  if (scorecards.length === 0) {
    scorecardsTableBody.innerHTML = '<tr><td colspan="5">No scorecards submitted yet.</td></tr>';
    return;
  }
  scorecards.forEach(card => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${card.score}</td>
      <td>${card.courseRating}</td>
      <td>${card.slopeRating}</td>
      <td>${new Date(card.date).toLocaleDateString()}</td>
      <td><button class="delete-btn" data-id="${card.id}">Delete</button></td>
    `;
    scorecardsTableBody.appendChild(row);
  });
}

// Submit Scorecard Form
form.addEventListener('submit', async (e) => {
  e.preventDefault();  // Prevents the page from refreshing

  const score = document.getElementById('score').value;
  const courseRating = document.getElementById('courseRating').value; // Correct ID
  const slopeRating = document.getElementById('slopeRating').value;   // Correct ID
  const date = document.getElementById('date').value; // Include the date

  // Check for empty values and log them for debugging
  if (!score || !courseRating || !slopeRating || !date) {
    console.error('One or more required fields are empty:', {
      score,
      courseRating,
      slopeRating,
      date,
    });
    alert('Error: Missing required fields');
    return; // Exit if any required field is missing
  }

  try {
    const response = await fetch('http://localhost:3000/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score: parseInt(score),
        courseRating: parseFloat(courseRating),
        slopeRating: parseInt(slopeRating),
        date: date, // Include the date in the request
      }),
    });

    const data = await response.json();
    if (response.ok) {
      // alert('Scorecard submitted successfully!');
      form.reset();
      fetchAndDisplayScorecards(); // Refresh the scorecards table
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error submitting scorecard:', error);
    alert('An error occurred while submitting the scorecard.');
  }
});

// Calculate Handicap Button
calculateBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('http://localhost:3000/best6');
    if (!response.ok) {
      throw new Error('Failed to calculate handicap');
    }
    const data = await response.json();
    handicapResult.innerText = `Your Handicap (Best 8): ${data.handicap}`; // Adjusted text to reflect WHS calculation
  } catch (error) {
    console.error('Error calculating handicap:', error);
    handicapResult.innerText = 'Error calculating handicap.';
  }
});



// Sort Scorecards by Selected Order
sortOptions.addEventListener('change', () => {
  const sortBy = sortOptions.value;

  const sortedScorecards = [...scorecards]; // Create a copy of the scorecards

  sortedScorecards.sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.date) - new Date(b.date); // Sort by date
    } else {
      return a.score - b.score; // Sort by score (lowest first)
    }
  });

  displayScorecards(sortedScorecards); // Display sorted scorecards
});

// Delete Scorecard Functionality
scorecardsTableBody.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-btn')) {
    const scorecardId = e.target.getAttribute('data-id');

    try {
      const response = await fetch(`http://localhost:3000/delete/${scorecardId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        // alert('Scorecard deleted successfully!');
        fetchAndDisplayScorecards(); // Refresh the scorecards table
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting scorecard:', error);
      alert('An error occurred while deleting the scorecard.');
    }
  }
});

// Fetch and display scorecards on page load
fetchAndDisplayScorecards();
