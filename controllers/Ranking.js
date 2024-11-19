import connection from "../db.js";

// Hàm định dạng ngày thành chuỗi yyyy-MM-dd
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Thêm số 0 nếu tháng có 1 chữ số
    const day = String(d.getDate()).padStart(2, '0');         // Thêm số 0 nếu ngày có 1 chữ số
    return `${year}-${month}-${day}`;
}

// Hàm lấy top 10 player có điểm cao nhất ở level cụ thể
export const getTop10PlayerByLevel = async (req, res) => {
    const { level } = req.params;

    const query = `
        SELECT p.Id AS PlayerId, p.Username, gs.Score, gs.Level, gs.CreatedDate
        FROM Player p
        JOIN GameSession gs ON p.Id = gs.PlayerId
        WHERE gs.Level = ?
        ORDER BY gs.Score DESC, gs.CreatedDate ASC
        LIMIT 10;
    `;

    try {
        const [results] = await connection.promise().query(query, [level]);
        // Định dạng ngày cho từng kết quả
        const formattedResults = results.map(result => ({
            ...result,
            CreatedDate: formatDate(result.CreatedDate)
        }));
        console.log(`Top 10 player level ${level}:`);
        console.log(formattedResults);
        res.status(200).json(formattedResults);
    } catch (error) {
        console.error("Error fetching top 10 players by level:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

// Hàm lấy top 10 lần chơi có điểm cao nhất ở level của player có ID cụ thể
export const getTop10AchievePlayerByLevel = async (req, res) => {
    const { id, level } = req.params;
    console.log(`ID: ${id}, Level: ${level}`);
    const query = `
        SELECT gs.Id AS GameSessionId, gs.Score, gs.Level, gs.CreatedDate
        FROM GameSession gs
        WHERE gs.PlayerId = ? AND gs.Level = ?
        ORDER BY gs.Score DESC, gs.CreatedDate ASC
        LIMIT 10;
    `;

    try {
        const [results] = await connection.promise().query(query, [id, level]);
        // Định dạng ngày cho từng kết quả
        const formattedResults = results.map(result => ({
            ...result,
            CreatedDate: formatDate(result.CreatedDate)
        }));
        console.log(`Top 10 achieve of player with id ${id} level ${level}:`);
        console.log(formattedResults);
        res.status(200).json(formattedResults);
    } catch (error) {
        console.error("Error fetching top 10 achievements by player and level:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

