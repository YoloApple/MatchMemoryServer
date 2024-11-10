import express from 'express';
import { getPlayerById, login, register, updatePlayer } from '../controllers/Player.js';

const router = express.Router();

// GET player by ID
router.get('/getPlayerById/:id', getPlayerById);

// POST register new player
router.post('/register', register);

// POST login player
router.post('/login', login);

//POST update player
router.put('/updatePlayer/:id', updatePlayer)

export default router;
