import connection from "../db.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;


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

export const getPlayerById = async (req, res) => {
    const playerId = req.params.id;
    try {
        // Truy vấn kết hợp thông tin Player và Fullname, không dùng CONCAT
        const query = `
            SELECT 
                Player.Id,
                Player.Username,
                Player.Password,
                Fullname.FirstName,
                Fullname.MiddleName,
                Fullname.LastName,
                Player.Dob,
                Player.Email, 
                Player.Tel,
                Player.Gender 
            FROM Player
            JOIN Fullname ON Player.Id = Fullname.PlayerId
            WHERE Player.Id = ?
        `;

        connection.query(query, [playerId], (error, results) => {
            if (error) {
                return res.status(500).send(error);
            }

            if (results.length > 0) {
                // Lấy dữ liệu của người chơi và chuyển đổi Dob sang chuỗi
                const playerInfo = results[0];
                if (playerInfo.Dob) {
                    const dobDate = new Date(playerInfo.Dob); // Đảm bảo sử dụng Date để xử lý
                    playerInfo.Dob = dobDate.toLocaleDateString('en-GB'); // Dùng 'en-GB' để định dạng 'DD/MM/YYYY'
                }
                
                console.log(playerInfo);
                res.json(playerInfo); 
            } else {
                res.status(404).send({ message: "Player not found" });
            }
        });
    } catch (error) {
        console.error('Error get info player:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const updatePlayer = async (req, res) => {
    const { id } = req.params;
    const { username, password, firstname, middlename, lastname, dob, email, tel, gender } = req.body;
    console.log(req.body);
    try {
        const querySelectPlayer = `SELECT * FROM Player WHERE Id = ?`;
        connection.query(querySelectPlayer, [id], async (error, results) => {
            if (error) return res.status(500).json({ message: "Database error", error });
            if (results.length === 0) return res.status(404).json({ message: "Player not found" });

            // Lấy thông tin hiện tại của player
            const player = results[0];

            // Tạo danh sách các trường cần cập nhật cho bảng Player
            let fieldsToUpdatePlayer = [];
            let valuesPlayer = [];

            if (username && username !== player.Username) {
                fieldsToUpdatePlayer.push("Username = ?");
                valuesPlayer.push(username);
            }
            if (password && password !== player.Password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                fieldsToUpdatePlayer.push("Password = ?");
                valuesPlayer.push(hashedPassword);
            }

            // Chuyển đổi 'dob' từ string thành Date và so sánh
            if (dob && dob !== player.Dob.toISOString().split('T')[0]) { // Chuyển 'dob' của player sang kiểu string (yyyy-mm-dd)
                const dobDate = new Date(dob); // Chuyển 'dob' nhận từ request body sang kiểu Date
                fieldsToUpdatePlayer.push("Dob = ?");
                valuesPlayer.push(dobDate);
            }

            if (email && email !== player.Email) {
                fieldsToUpdatePlayer.push("Email = ?");
                valuesPlayer.push(email);
            }
            if (tel && tel !== player.Tel) {
                fieldsToUpdatePlayer.push("Tel = ?");
                valuesPlayer.push(tel);
            }
            if (gender && gender !== player.Gender) {
                fieldsToUpdatePlayer.push("Gender = ?");
                valuesPlayer.push(gender);
            }

            if (fieldsToUpdatePlayer.length === 0 && !firstname && !middlename && !lastname) {
                return res.status(200).json({ message: "Không có thay đổi nào" });
            }

            // Xây dựng câu truy vấn SQL cho bảng Player
            const queryUpdatePlayer = `UPDATE Player SET ${fieldsToUpdatePlayer.join(", ")} WHERE Id = ?`;
            valuesPlayer.push(id);

            connection.query(queryUpdatePlayer, valuesPlayer, (error, results) => {
                if (error) return res.status(500).json({ message: "Failed to update player", error });
                
                // Cập nhật bảng Fullname nếu có thay đổi firstname, middlename, hoặc lastname
                if (firstname || middlename || lastname) {
                    const querySelectFullname = `SELECT * FROM Fullname WHERE PlayerId = ?`;
                    connection.query(querySelectFullname, [id], (error, fullnameResults) => {
                        if (error) return res.status(500).json({ message: "Database error", error });
                        if (fullnameResults.length > 0) {
                            // Fullname exists, update it
                            const queryUpdateFullname = `UPDATE Fullname SET Firstname = ?, Middlename = ?, Lastname = ? WHERE PlayerId = ?`;
                            const valuesFullname = [firstname || fullnameResults[0].Firstname, 
                                                    middlename || fullnameResults[0].Middlename, 
                                                    lastname || fullnameResults[0].Lastname, 
                                                    id];

                            connection.query(queryUpdateFullname, valuesFullname, (error, updateResults) => {
                                if (error) return res.status(500).json({ message: "Failed to update fullname", error });
                                res.status(200).json({ message: "Player updated successfully" });
                            });
                        } 
                    });
                } else {
                    res.status(200).json({ message: "Player updated successfully" });
                }
            });
        });
        // console.log(`Update profile of Player with Id ${id} successful!`);
    } catch (error) {
        res.status(500).json({ message: "Failed to update player", error });
    }
};





