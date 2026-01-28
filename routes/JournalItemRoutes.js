import express from 'express';
import {get_journal_item, get_total_debit, get_total_credit, get_net_balance, get_residual_amount, get_invoice_posted, get_payment_matched, get_residual_aging, get_top_partner_residual, get_journal_distribution} from '../controllers/JournalItemController.js';

const router = express.Router();

router.get('/master',get_journal_item);
router.get('/total_debit', get_total_debit);
router.get('/total_credit', get_total_credit);
router.get('/net_balance', get_net_balance);
router.get('/residual_amount', get_residual_amount);
router.get('/invoice_posted', get_invoice_posted);
router.get('/payment_matched', get_payment_matched);
router.get('/residual_aging', get_residual_aging);
router.get('/top_partner_residual', get_top_partner_residual);
router.get('/journal_distribution', get_journal_distribution);
export default router;