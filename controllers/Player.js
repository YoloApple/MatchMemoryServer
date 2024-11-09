import connection from "../db.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const getPlayerById = async (req, res) => {
    const playerId = req.params.id;
    connection.query('SELECT * FROM Player WHERE Id = ?', [playerId], (error, results) => {
        if (error) return res.status(500).send(error);
        res.json(results[0]);
    });
};

export const register = async (req, res) => {
    const { Username, Password, FirstName, MiddleName, LastName, Dob, Email, Tel, Gender } = req.body;
    console.log(req.body);
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Convert the Dob (Date of Birth) from string to Date object
        const dobDate = new Date(Dob);
        if (isNaN(dobDate.getTime())) {
            // If Dob is invalid, return an error
            return res.status(400).json({ error: 'Invalid date format for Dob' });
        }

        // Insert into Player table first
        const queryPlayer = 'INSERT INTO Player (Username, Password, Dob, Email, Tel, Gender) VALUES (?, ?, ?, ?, ?, ?)';
        connection.query(queryPlayer, [Username, hashedPassword, dobDate, Email, Tel, Gender], (error, playerResults) => {
            if (error) return res.status(500).send(error);

            const playerId = playerResults.insertId;

            // Now insert into Fullname table with the generated playerId
            const queryFullname = 'INSERT INTO Fullname (FirstName, MiddleName, LastName, PlayerId) VALUES (?, ?, ?, ?)';
            connection.query(queryFullname, [FirstName, MiddleName, LastName, playerId], (error, fullnameResults) => {
                if (error) return res.status(500).send(error);

                // Update Player table to reference Fullname
                const queryUpdatePlayer = 'UPDATE Player SET Fullname = ? WHERE Id = ?';
                connection.query(queryUpdatePlayer, [fullnameResults.insertId, playerId], (error) => {
                    if (error) return res.status(500).send(error);

                    res.status(201).json({ playerId: playerId });
                    console.log('register successfull')
                });
            });
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: error.message });
    }
};

export const login = async (req, res) => {
    const { Username, Password } = req.body;
    try {
        // Query to get player by Username
        const query = 'SELECT Id, Username, Password FROM Player WHERE Username = ?';
        connection.query(query, [Username], async (error, results) => {
            if (error) return res.status(500).send(error);

            if (results.length === 0) return res.status(401).json({ message: "Invalid username or password" });

            const player = results[0];
            const isPasswordValid = await bcrypt.compare(Password, player.Password);
            if (!isPasswordValid) return res.status(401).json({ message: "Invalid username or password" });

            const token = jwt.sign({ id: player.Id, username: player.Username }, JWT_SECRET, { expiresIn: '1h' });

            // Wrap player and token in a single response object
            res.status(200).json({
                message: "Login successful",
                token: token,
            });
            console.log(`Login successfully with player: ${player.Username}`)
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: error.message });
    }
};

