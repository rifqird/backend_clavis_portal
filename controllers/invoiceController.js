import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;

export const get_invoices=async(req,res)=>{
    let query = 'SELECT * FROM invoices';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_total_invoice=async(req,res)=>{
    let query='SELECT COUNT(*) AS total_invoices FROM invoices';
    const result = await pool.query(query);
    res.json(result);
}
export const get_total_billed=async(req,res)=>{
    let query=`SELECT 
    SUM(amount_total) AS total_billed,
    SUM(amount_total - amount_residual) AS total_paid,
    SUM(amount_residual) AS outstanding_balance
    FROM invoices`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_average_days_to_payment=async(req,res)=>{
    let query=`SELECT AVG(next_payment_date - invoice_date) AS avg_days_to_payment
    FROM invoices
    WHERE state = 'Paid' AND next_payment_date IS NOT NULL;`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_percent_paid_on_time=async(req,res)=>{
    let query=`SELECT
    ROUND(SUM(CASE WHEN next_payment_date <= invoice_date_due THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS pct_paid_on_time
    FROM invoices
    WHERE state = 'Paid' AND next_payment_date IS NOT NULL`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_billing_trend=async(req,res)=>{
    let query=`SELECT
                DATE_TRUNC('month', invoice_date) AS month,
                TO_CHAR(DATE_TRUNC('month', invoice_date), 'Mon') AS month_name,
                SUM(amount_total) AS billed_amount
                FROM invoices
                where DATE_TRUNC('month', invoice_date) is not null
                GROUP BY month
                ORDER BY month`;
    const result=await pool.query(query);
    res.json(result);
}
export const get_collection_trend=async(req,res)=>{
    let query=`SELECT
    DATE_TRUNC('month', invoice_date) AS month,
    TO_CHAR(DATE_TRUNC('month', invoice_date), 'Mon') AS month_name,
    SUM(amount_total - amount_residual) AS amount_paid,
    SUM(amount_residual) AS outstanding_amount
    FROM invoices where DATE_TRUNC('month', invoice_date) is not null
    GROUP BY month
    ORDER BY month`;
    const result=await pool.query(query);
    res.json(result);
}
export const get_aging_analysis=async(req,res)=>{
    let query=`SELECT
        CASE
        WHEN CURRENT_DATE - invoice_date_due <= 30 THEN '0-30 Days'
        WHEN CURRENT_DATE - invoice_date_due BETWEEN 31 AND 60 THEN '31-60 Days'
        WHEN CURRENT_DATE - invoice_date_due BETWEEN 61 AND 90 THEN '61-90 Days'
        ELSE '>90 Days'
        END AS aging_bucket,
        SUM(amount_residual) AS outstanding_balance
        FROM invoices
        WHERE state = 'Not Paid'
        GROUP BY aging_bucket
        ORDER BY aging_bucket`;
    const result=await pool.query(query);
    res.json(result);
}
export const top_customer=async(req,res)=>{
    let query=`SELECT
    partner_id,
    SUM(amount_total) AS total_billed
    FROM invoices
    GROUP BY partner_id
    ORDER BY total_billed DESC
    LIMIT 5`;
    const result=await pool.query(query);
    res.json(result);
}
export const top_customer_outstanding=async(req,res)=>{
    let query=`SELECT
    partner_id,
    SUM(amount_residual) AS outstanding_balance
    FROM invoices
    GROUP BY partner_id
    ORDER BY outstanding_balance DESC
    LIMIT 5`;
    const result=await pool.query(query);
    res.json(result);
}
export const truncateInsertInvoices=async(req,res)=>{
    const response = await fetch(
        `${BASE_URL}/api/account/invoice`
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
        await client.query(`TRUNCATE TABLE invoices RESTART IDENTITY`);
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
                `INSERT INTO invoices (
                id,
                name,
                move_type,
                state,
                partner_id,
                commercial_partner_id,
                company_id,
                currency_id,
                amount_total,
                amount_untaxed,
                amount_tax,
                amount_residual,
                amount_paid,
                payment_state,
                payment_reference,
                invoice_date,
                invoice_date_due,
                next_payment_date,
                journal_id,
                invoice_origin,
                invoice_line_ids,
                line_ids,
                payment_ids,
                matched_payment_ids,
                partner_bank_id,
                bank_partner_id,
                team_id,
                user_id,
                create_date,
                write_date,
                create_uid,
                write_uid,
                country_code,
                tax_country_id,
                l10n_id_kode_transaksi,
                message_ids,
                message_follower_ids,
                audit_trail_message_ids
                )
                VALUES (
                    $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,
                    $11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,
                    $21,$22,$23,$24,$25::jsonb,$26::jsonb,$27::jsonb,$28::jsonb,$29,$30,
                    $31::jsonb,$32::jsonb,$33,$34::jsonb,$35,$36,$37,$38
                )`,
                [
                    r.id,
                    r.name,
                    r.move_type,
                    r.state,
                    toJsonArray(r.partner_id),
                    toJsonArray(r.commercial_partner_id),
                    toJsonArray(r.company_id),
                    toJsonArray(r.currency_id),
                    r.amount_total,
                    r.amount_untaxed,

                    r.amount_tax,
                    r.amount_residual,
                    r.amount_paid,
                    r.payment_state,
                    r.payment_reference,
                    r.invoice_date ? new Date(r.invoice_date) : null,
                    r.invoice_date_due ? new Date(r.invoice_date_due) : null,
                    r.next_payment_date ? new Date(r.next_payment_date) : null,
                    toJsonArray(r.journal_id),
                    r.invoice_origin,

                    [r.invoice_line_ids],
                    [r.line_ids],
                    [r.payment_ids],
                    [r.matched_payment_ids],
                    toJsonArray(r.partner_bank_id),
                    toJsonArray(r.bank_partner_id),
                    toJsonArray(r.team_id),
                    toJsonArray(r.user_id),
                    r.create_date,
                    r.write_date,
                    toJsonArray(r.create_uid),
                    toJsonArray(r.write_uid),
                    r.country_code,
                    toJsonArray(r.tax_country_id),
                    r.l10n_id_kode_transaksi,
                    [r.message_ids],
                    [r.message_follower_ids],
                    [r.audit_trail_message_ids]
                ]
            );
        }
        await client.query("COMMIT");

        console.log({
            message: "SYNC SUCCESS — truncate & insert invoices table",
            inserted: rows.length,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Error:", err);
    } finally {
        client.release();
    }
}