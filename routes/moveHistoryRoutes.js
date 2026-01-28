import express from 'express';
const router = express.Router();
import { get_move_history } from '../controllers/moveHistoryController.js';
router.get('/master',get_move_history);

export default router;