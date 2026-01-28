import express from 'express';
import { get_invoices, get_total_invoice, get_total_billed, get_billing_trend, get_collection_trend, get_aging_analysis, top_customer, top_customer_outstanding, get_average_days_to_payment, get_percent_paid_on_time } from '../controllers/invoiceController.js';
const router = express.Router();

router.get('/master', get_invoices);
router.get('/total_invoice', get_total_invoice);
router.get('/total_billed', get_total_billed);
router.get('/billing_trend', get_billing_trend);
router.get('/collection_trend', get_collection_trend);
router.get('/aging_analysis', get_aging_analysis);
router.get('/top_customer', top_customer);
router.get('/top_customer_outstanding', top_customer_outstanding);
router.get('/average_days_to_payment', get_average_days_to_payment);
router.get('/percent_paid_on_time', get_percent_paid_on_time);

export default router;