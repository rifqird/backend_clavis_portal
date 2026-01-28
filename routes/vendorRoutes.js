import express from 'express';
import { get_vendor } from '../controllers/vendorController.js';

const router = express.Router();
router.get('/master', get_vendor);

export default router;