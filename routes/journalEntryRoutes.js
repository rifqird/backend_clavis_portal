import express from 'express';
import { get_journal_entry, get_total_net_revenue, get_total_open_amount,get_sum_of_debit,get_sum_of_credit,average_net_revenue_per_partner } from '../controllers/journalEntryController.js';

const router = express.Router();
router.get('/master', get_journal_entry);
router.get('/net_revenue', get_total_net_revenue);
router.get('/open_amount', get_total_open_amount);
router.get('/debit', get_sum_of_debit);
router.get('/credit', get_sum_of_credit);
router.get('/average_net_revenue_per_partner', get_sum_of_credit);

export default router;