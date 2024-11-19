import express from 'express'
import { getTop10AchievePlayerByLevel, getTop10PlayerByLevel } from '../controllers/Ranking.js';

const router = express.Router();

// GET top 10 player by level
router.get('/getTop10PlayerByLevel/:level', getTop10PlayerByLevel);

// GET top 10 achievement of player by level
router.get('/getTop10AchievePlayerByLevel/:id/:level', getTop10AchievePlayerByLevel)

export default router;