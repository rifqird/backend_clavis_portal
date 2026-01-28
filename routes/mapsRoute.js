import express from 'express';
import { get_area,get_realtime_area } from '../controllers/mapsController.js';

const router = express.Router();
router.get('/', get_area);
router.get('/realtime', get_realtime_area);

export default router;