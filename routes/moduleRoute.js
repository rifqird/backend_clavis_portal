import express from 'express';
import { get_module_expenses, post_module_expense } from '../controllers/moduleController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
router.get('/expense',get_module_expenses);
router.post('/expense',upload.single('image'), post_module_expense);

export default router;