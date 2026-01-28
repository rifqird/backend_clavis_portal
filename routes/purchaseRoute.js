import express from 'express';
import { get_purchase, get_total_purchase } from '../controllers/purchaseController.js';

const router = express.Router();
router.get('/master', get_purchase);
router.get('/total_purchase', get_total_purchase);

export default router;