import express from 'express';
import { getPlayerById, login, register } from '../controllers/Player.js';

const router = express.Router();

// GET player by ID
router.get('/getPlayerById/:id', getPlayerById);

// POST register new player
router.post('/register', register);

// POST login player
router.post('/login', login);

export default router;
