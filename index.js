import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import Player from './routers/Player.js';
import connection from './db.js';

const app = express();
const port = 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', Player);

// Connect to MySQL (This step is already done in db.js)
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL!');
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
