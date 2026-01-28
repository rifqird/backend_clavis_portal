import express from 'express';
import { get_analytic_items,get_distribution_project,get_partner_distribution,get_revenue,get_total_revenue,get_transaction_count } from '../controllers/analyticItemController.js';

const router = express.Router();
router.get('/master', get_analytic_items);
router.get('/distribution_project', get_distribution_project);
router.get('/partner_distribution', get_partner_distribution);
router.get('/revenue', get_revenue);
router.get('/total_revenue', get_total_revenue);
router.get('/get_transaction_account', get_transaction_count);

export default router;