import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;
export const get_vendor_payment=async(req,res)=>{
    let query = 'SELECT * FROM account_moves where payment_method_line_id is not null';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_total_payment=async(req,res)=>{
    let query = `SELECT COUNT(*) AS total_payments FROM account_moves WHERE payment_type = 'outbound' AND partner_type = 'supplier'`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_payment_in_process=async(req,res)=>{
    let query=`SELECT COUNT(*) AS in_process_count
    FROM account_moves
    WHERE payment_type = 'outbound' AND partner_type = 'supplier' AND state = 'in_process'`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_payment_paid=async(req,res)=>{
    let query=`SELECT COUNT(*) AS paid_count
    FROM account_moves
    WHERE payment_type = 'outbound' AND partner_type = 'supplier' AND state = 'paid'`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_amount_paid=async(req,res)=>{
    let query=`SELECT SUM(amount) AS total_amount
    FROM account_moves
    WHERE payment_type = 'outbound' AND partner_type = 'supplier'`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const truncateInsertVendorPayment=async(req,res)=>{
    try {
        const response = await fetch(
            `${BASE_URL}/api/account/vendor_get_payment`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                message: "Gagal mengambil data dari API external",
            });
        }

        const api = await response.json();
        const rows = api?.data ?? [];
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "Data kosong" });
        }
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1️⃣ TRUNCATE TABLE
            for (const r of rows) {
                const toJsonArray = (v) => {
                    if (v === null || v === undefined) return null;

                    // jika sudah array objekt js → stringify
                    if (Array.isArray(v) || typeof v === "object") {
                        return JSON.stringify(v);
                    }

                    // jika format string {2,"Name"} → perbaiki jadi ["2","Name"]
                    if (typeof v === "string") {
                        const fixed = v
                        .replace(/^{/, "[")
                        .replace(/}$/, "]")
                        .replace(/""/g, '"');

                        try {
                            return JSON.stringify(JSON.parse(fixed));
                        } catch {
                            return JSON.stringify([]);
                        }
                    }

                    return JSON.stringify(v);
                };
                await client.query(
                    `INSERT INTO account_moves (
                    id,
                    name,
                    state,
                    date,
                    partner_id,
                    company_id,
                    currency_id,
                    journal_id,
                    country_code,
                    amount,
                    available_journal_ids,
                    available_partner_bank_ids,
                    available_payment_method_line_ids,
                    duplicate_payment_ids,
                    is_matched,
                    is_reconciled,
                    is_sent,
                    memo,
                    move_id,
                    need_cancel_request,
                    paired_internal_transfer_payment_id,
                    partner_bank_id,
                    partner_type,
                    payment_method_code,
                    payment_method_line_id,
                    payment_type,
                    qr_code,
                    reconciled_bills_count,
                    reconciled_invoices_count,
                    reconciled_invoices_type,
                    reconciled_statement_lines_count,
                    require_partner_bank_account,
                    show_partner_bank_account
                    )
                    VALUES (
                        $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,
                        $11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,
                        $21,$22,$23,$24,$25::jsonb,$26,$27,$28,$29,$30,
                        $31,$32,$33
                    )`,
                    [
                        r.id,
                        r.name,
                        r.state,
                        r.date ? new Date(r.date) : null,
                        toJsonArray(r.partner_id),
                        toJsonArray(r.company_id),
                        toJsonArray(r.currency_id),
                        toJsonArray(r.journal_id),
                        r.country_code,
                        r.amount,

                        [r.available_journal_ids],
                        [r.available_partner_bank_ids],
                        [r.available_payment_method_line_ids],
                        [r.duplicate_payment_ids],
                        r.is_matched,
                        r.is_reconciled,
                        r.is_sent,
                        r.memo,
                        toJsonArray(r.move_id),
                        r.need_cancel_request,

                        r.paired_internal_transfer_payment_id,
                        r.partner_bank_id,
                        r.partner_type,
                        r.payment_method_code,
                        toJsonArray(r.payment_method_line_id),
                        r.payment_type,
                        r.qr_code,
                        r.reconciled_bills_count,
                        r.reconciled_invoices_count,
                        r.reconciled_invoices_type,

                        r.reconciled_statement_lines_count,
                        r.require_partner_bank_account,
                        r.show_partner_bank_account
                    ]
                );
            }
            await client.query("COMMIT");

            console.log({
                message: "SYNC SUCCESS — insert account moves table for vendor payment",
                inserted: rows.length,
            });
        } catch (err) {
            await client.query("ROLLBACK");
            console.error("DB Error:", err);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({
            message: "Server Error",
            error: err.message,
        });
    }
}