import express from 'express';

const router = express.Router();
const rooms = {}; // Dùng chung rooms với WebSocket server

// API lấy danh sách phòng chơi
router.get('/', (req, res) => {
    res.json(Object.keys(rooms));
});

// API lấy thông tin chi tiết của phòng
router.get('/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    if (rooms[roomId]) {
        res.json(rooms[roomId]);
    } else {
        res.status(404).json({ error: 'Room not found' });
    }
});

export default router;
