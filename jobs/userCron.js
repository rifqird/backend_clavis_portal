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
    cron.schedule("* * * * *", async () => {

        try {
            await selfReminder();
        } catch (err) {
            console.log("selfReminder gagal, skip:", err.message);
        }

        try {
            await truncateInsert();
        } catch (err) {
            console.log("truncateInsert gagal:", err.message);
        }

        try {
            await truncateInsertPartnerReports();
        } catch (err) {
            console.log("partner report gagal:", err.message);
        }

        try {
            await truncateInsertVendor();
        } catch (err) {
            console.log("vendor report gagal:", err.message);
        }

        try {
            await truncateInsertAccountMove();
        } catch (err) {
            console.log("account move gagal:", err.message);
        }

        try {
            await truncateInsertInvoices();
        } catch (err) {
            console.log("invoice gagal:", err.message);
        }

        try {
            await truncateInsertPayments();
        } catch (err) {
            console.log("payment gagal:", err.message);
        }

        try {
            await truncateInsertVendorPayment();
        } catch (err) {
            console.log("vendor payment gagal:", err.message);
        }

        try {
            await truncateInsertJournalEntry();
        } catch (err) {
            console.log("journal entry gagal:", err.message);
        }

        try {
            await truncateInsertJournalItem();
        } catch (err) {
            console.log("journal item gagal:", err.message);
        }

        try {
            await truncateInsertMoveHistory();
        } catch (err) {
            console.log("move history gagal:", err.message);
        }

        try {
            await truncateInsertSaleOrders();
        } catch (err) {
            console.log("sale orders gagal:", err.message);
        }

        try {
            await truncateInsertAnalyticItem();
        } catch (err) {
            console.log("analytic item gagal:", err.message);
        }
    });
}