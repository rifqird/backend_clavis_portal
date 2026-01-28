import express from 'express';
import { get_total_sales, get_average_order,get_margin_percent,get_order_invoice,get_total_margin,get_total_orders,get_sales_trend,top_customers,sales_person } from '../controllers/saleOrderController.js';
const router = express.Router();

router.get('/total_sales',get_total_sales);
router.get('/total_orders',get_total_orders);
router.get('/average_order',get_average_order);
router.get('/total_margin',get_total_margin);
router.get('/margin_percent',get_margin_percent);
router.get('/order_invoice',get_order_invoice);
router.get('/sales_trend',get_sales_trend);
router.get('/top_customers',top_customers);
router.get('/sales_person',sales_person);
export default router;