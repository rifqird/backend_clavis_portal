import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoute.js';
import userRoutes from './routes/userRoute.js';
import mapsRoutes from './routes/mapsRoute.js';
import salesRoutes from './routes/salesRoute.js';
import purchaseRoutes from './routes/purchaseRoute.js';
import partnerRoutes from './routes/partnerRoute.js';
import vendorRoutes from './routes/vendorRoutes.js';
import accountMoveRoutes from './routes/accountMoveRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import vendorPaymentRoutes from './routes/vendorPaymentRoutes.js';
import journalEntryRoutes from './routes/journalEntryRoutes.js';
import journalItemRoutes from './routes/JournalItemRoutes.js';
import moveHistoryRoutes from './routes/moveHistoryRoutes.js';
import moduleRoutes from './routes/moduleRoute.js';
import salesOrderRoutes from './routes/saleOrderRoute.js';
import analyticItemRoutes from './routes/analyticItemRoutes.js';
import pkg from 'pg';
import { WebSocketServer } from 'ws';
import multer from 'multer';
import vision from '@google-cloud/vision';
import fs from 'fs';
import { startUserIcon } from './jobs/userCron.js';

dotenv.config();
const app = express();
startUserIcon();
const upload=multer({dest:'uploads/'});
const client_google_vision=new vision.ImageAnnotatorClient({
    keyFilename:'./ocr-test.json'
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/product', productRoutes);
app.use('/sales', salesRoutes);
app.use('/purchase', purchaseRoutes);
app.use('/partner',partnerRoutes);
app.use('/vendor',vendorRoutes);
app.use('/account_moves',accountMoveRoutes);
app.use('/invoices',invoiceRoutes);
app.use('/payment',paymentRoutes);
app.use('/vendor_payment',vendorPaymentRoutes);
app.use('/journal_entry',journalEntryRoutes);
app.use('/journal_item',journalItemRoutes);
app.use('/move_history',moveHistoryRoutes);
app.use('/sale_order',salesOrderRoutes);
app.use('/analytic_item',analyticItemRoutes);
app.use('/user', userRoutes);
app.use('/maps', mapsRoutes);
app.use('/module', moduleRoutes);
app.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    const [result] = await client_google_vision.textDetection(req.file.path);
    fs.unlinkSync(req.file.path); // hapus file

    res.json({
      text: result.fullTextAnnotation.text
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const client = new pkg.Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});
await client.connect();
await client.query('LISTEN maps_changed');
client.on("notification",(msg)=>{
    console.log("Database updated:", msg.payload);
    wss.clients.forEach((ws)=>{
        if(ws.readyState === ws.OPEN){
            ws.send(msg.payload);
        }
    });
})

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
});