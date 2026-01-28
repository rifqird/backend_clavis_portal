import express from 'express';
import { get_account_moves, getRevenue, get_top_customer, get_revenue_vs_expense, get_vat_summary,aging_bucket } from '../controllers/accountMoveController.js';

const router = express.Router();
router.get('/master', get_account_moves);
router.get('/revenue', getRevenue);
router.get('/top_customer', get_top_customer);
router.get('/get_revenue_vs_expense', get_revenue_vs_expense);
router.get('/get_vat_summary', get_vat_summary);
router.get('/get_aging_bucket', aging_bucket);

export default router;