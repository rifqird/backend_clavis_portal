import express from 'express';
import { get_area,get_realtime_area,get_sales_area } from '../controllers/mapsController.js';

const router = express.Router();
router.get('/', get_area);
router.get('/realtime', get_realtime_area);
router.get('/get_sales_area', get_sales_area);

export default router;