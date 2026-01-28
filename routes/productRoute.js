import express from 'express';
import { get_products,get_master_products,add_master_product,get_master_products_by_id,update_master_products,delete_master_products_by_id,post_products } from '../controllers/productController.js';

const router = express.Router();
router.get('/', get_products);
router.get('/master', get_master_products);
router.post("/master", add_master_product);
router.get('/master/:id', get_master_products_by_id);
router.put('/master/:id', update_master_products);
router.delete('/master/:id', delete_master_products_by_id);
router.post('/', post_products);

export default router;