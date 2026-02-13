import express from 'express';
import { get_purchase_outstanding,get_detail_purchase_outstanding } from '../controllers/purchaseOutstandingController.js';

const router = express.Router();
router.get('/master', get_purchase_outstanding);
router.get('/detail/:id', get_detail_purchase_outstanding);

export default router;