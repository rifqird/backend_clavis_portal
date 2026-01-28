import cron from "node-cron";
import { selfReminder } from "../controllers/userController.js";
import { truncateInsert } from "../controllers/purchaseController.js";
import { truncateInsertPartnerReports } from "../controllers/partnerController.js";
import { truncateInsertVendor } from "../controllers/vendorController.js";
import { truncateInsertAccountMove } from "../controllers/accountMoveController.js";
import { truncateInsertInvoices } from "../controllers/invoiceController.js";
import { truncateInsertPayments } from "../controllers/paymentController.js";
import { truncateInsertVendorPayment } from "../controllers/vendorPaymentController.js";
import { truncateInsertJournalEntry } from "../controllers/journalEntryController.js";
import { truncateInsertJournalItem } from "../controllers/JournalItemController.js";
import { truncateInsertMoveHistory } from "../controllers/moveHistoryController.js";
import { truncateInsertSaleOrders } from "../controllers/saleOrderController.js";
import { truncateInsertAnalyticItem } from "../controllers/analyticItemController.js";
export const startUserIcon=()=>{
    cron.schedule("* * * * *",async()=>{
        await selfReminder();
        await truncateInsert();
        await truncateInsertPartnerReports();
        await truncateInsertVendor();
        await truncateInsertAccountMove();
        await truncateInsertInvoices();
        await truncateInsertPayments();
        await truncateInsertVendorPayment();
        await truncateInsertJournalEntry();
        await truncateInsertJournalItem();
        await truncateInsertMoveHistory();
        await truncateInsertSaleOrders();
        await truncateInsertAnalyticItem();
    });
}