import express from 'express';
import { get_partner } from '../controllers/partnerController.js';

const router = express.Router();
router.get('/master', get_partner);

export default router;