import express from 'express';
import { get_payments, get_total_payment, get_unique_customer, get_average_payment, get_customer_payment, get_top_customer, get_method_distribution,get_recent_payment } from '../controllers/paymentController.js';
import { get_vendor_bill } from '../controllers/VendorBillController.js';
const router=express.Router();

router.get('/master', get_payments);
router.get('/total_payment', get_total_payment);
router.get('/unique_customer', get_unique_customer);
router.get('/average_payment', get_average_payment);
router.get('/customer_payment', get_customer_payment);
router.get('/top_customer', get_top_customer);
router.get('/method_distribution', get_method_distribution);
router.get('/recent_payment', get_recent_payment);
router.get('/vendor_bill', get_vendor_bill);
export default router;