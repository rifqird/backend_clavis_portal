import express from 'express';
import { get_sales, get_total_sales } from '../controllers/salesController.js';

const router = express.Router();
router.get('/master', get_sales);
router.get('/total_sales', get_total_sales);

export default router;