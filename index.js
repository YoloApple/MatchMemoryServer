import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';

// Routers
import Player from './routers/Player.js';
import Ranking from './routers/Ranking.js';
import Room from './routers/Room.js';

// MySQL connection
import connection from './db.js';

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/player', Player);
app.use('/api/ranking', Ranking);
app.use('/api/rooms', Room);

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL!');
});

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = {}; // Lưu danh sách phòng chơi

// WebSocket connection
wss.on('connection', (ws) => {
    console.log('A new client connected.');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message); // Chuyển tin nhắn thành object
            console.log('Message received:', data);

            switch (data.type) {
                case 'CREATE_ROOM': {
                    const roomId = Date.now().toString(); // Tạo ID phòng
                    rooms[roomId] = { players: [ws] };
                    ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId }));
                    break;
                }

                case 'JOIN_ROOM': {
                    const room = rooms[data.roomId];
                    if (!room) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
                    } else if (room.players.length >= 2) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' }));
                    } else {
                        room.players.push(ws);
                        room.players.forEach((player) => {
                            player.send(JSON.stringify({ type: 'START_GAME', roomId: data.roomId }));
                        });
                    }
                    break;
                }
                case 'START_GAME': {
                    const { roomId } = data;
                    const currentRoom = rooms[roomId];
                    if (!currentRoom) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
                    } else {
                        // Gửi thông báo đến tất cả người chơi trong phòng
                        currentRoom.players.forEach((player) => {
                            player.send(JSON.stringify({ type: 'GAME_STARTED', roomId }));
                        });
                        console.log(`Game started in room: ${roomId}`);
                    }
                    break;
                }
                
                case 'GAME_RESULT': {
                    const { roomId, status } = data; // status: 'WIN' hoặc 'LOSE'
                    const currentRoom = rooms[roomId];
                    if (!currentRoom) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
                    } else {
                        currentRoom.players.forEach((player) => {
                            player.send(JSON.stringify({ type: 'GAME_END', status }));
                        });
                    }
                    break;
                }

                default:
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message type' }));
            }
        } catch (err) {
            console.error('Error processing message:', err);
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log('A client disconnected.');
        // Dọn dẹp phòng khi client rời đi
        for (const [roomId, room] of Object.entries(rooms)) {
            const index = room.players.indexOf(ws);
            if (index !== -1) {
                room.players.splice(index, 1); // Xóa client khỏi phòng
                if (room.players.length === 0) {
                    delete rooms[roomId]; // Xóa phòng nếu không còn người chơi
                }
            }
        }
    });
});

// Start server
server.listen(port, () => {
    console.log(`HTTP server running at http://localhost:${port}/`);
    console.log(`WebSocket server running on ws://localhost:${port}/`);
});
