const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Create or open the SQLite database
const db = new sqlite3.Database('./answers.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create the answers table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            answer INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// API endpoint to submit an answer
app.post('/api/answers', (req, res) => {
    const { answer } = req.body;
    
    // Validate input
    if (typeof answer !== 'number' || answer < 1 || answer > 100000) {
        return res.status(400).json({ error: 'Answer must be a number between 1 and 100,000' });
    }
    
    // Insert the answer into the database
    const sql = 'INSERT INTO answers (answer) VALUES (?)';
    db.run(sql, [answer], function(err) {
        if (err) {
            console.error('Error inserting answer', err.message);
            return res.status(500).json({ error: 'Failed to save answer' });
        }
        
        res.json({ 
            success: true, 
            message: 'Answer saved successfully',
            id: this.lastID 
        });
    });
});

// API endpoint to get stats (average and count)
app.get('/api/stats', (req, res) => {
    const sql = 'SELECT AVG(answer) as average, COUNT(*) as count FROM answers';
    
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error getting stats', err.message);
            return res.status(500).json({ error: 'Failed to get stats' });
        }
        
        // If no answers yet, set average to 0
        const average = row.average || 0;
        
        res.json({ 
            average: average, 
            count: row.count 
        });
    });
});

// Serve the questions JSON file
app.get('/api/questions', (req, res) => {
    const filePath = path.join(__dirname, 'questions.json');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading questions.json', err.message);
            return res.status(500).json({ error: 'Failed to load questions' });
        }
        
        try {
            const questions = JSON.parse(data);
            res.json(questions);
        } catch (parseErr) {
            console.error('Error parsing questions.json', parseErr.message);
            res.status(500).json({ error: 'Failed to parse questions' });
        }
    });
});
// Serve the static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get past questions
app.get('/api/past-questions', (req, res) => {
    try {
        // Read questions.json file
        const questionsFilePath = path.join(__dirname, 'questions.json');
        const questions = JSON.parse(fs.readFileSync(questionsFilePath, 'utf8'));
        
        // Get current date
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to beginning of day
        
        // Find the earliest date to calculate days
        let earliestDate = null;
        questions.forEach(question => {
            const questionDate = new Date(question.date);
            if (!earliestDate || questionDate < earliestDate) {
                earliestDate = questionDate;
            }
        });
        
        // Filter questions that are on or before today and add day number
        const filteredQuestions = questions
            .filter(question => {
                const questionDate = new Date(question.date);
                return questionDate <= currentDate;
            })
            .map(question => {
                const questionDate = new Date(question.date);
                // Calculate days since earliest date (day 1)
                const dayNumber = Math.floor((questionDate - earliestDate) / (1000 * 60 * 60 * 24)) + 1;
                return {
                    ...question,
                    dayNumber: dayNumber
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first
        
        res.json(filteredQuestions);
    } catch (error) {
        console.error('Error reading questions:', error);
        res.status(500).json({ error: 'Failed to get past questions' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Close the database connection when the server is terminated
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});