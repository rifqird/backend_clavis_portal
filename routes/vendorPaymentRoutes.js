import express from 'express';
import { get_vendor_payment, get_total_payment, get_payment_in_process, get_payment_paid, get_amount_paid } from '../controllers/vendorPaymentController.js';

const router = express.Router();
router.get('/master', get_vendor_payment);
router.get('/total_payment', get_total_payment);
router.get('/in_process', get_payment_in_process);
router.get('/payment_paid', get_payment_paid);
router.get('/amount_paid', get_amount_paid);

export default router;