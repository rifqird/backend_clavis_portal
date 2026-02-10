import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;
export const get_journal_item=async(req,res)=>{
    let query=`select date, move_id[1] as number, account_id[1] as account, partner_id[1] as partner, name, debit, balance
    from account_move_line order by date desc limit 20`;
    // let query=`SELECT
    // date,
    // name AS number,
    // partner_id AS partner,
    // ref AS reference,
    // journal_id AS journal,
    // company_id AS company,
    // amount_total_signed AS total,
    // state AS status
    // FROM account_moves
    // WHERE state = 'posted'
    // ORDER BY date DESC
    // LIMIT 20`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_total_debit=async(req,res)=>{
    let query=`SELECT SUM(debit) AS total_debit FROM account_move_line`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_total_credit=async(req,res)=>{
    let query=`SELECT SUM(credit) AS total_credit FROM account_move_line`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_net_balance=async(req,res)=>{
    let query=`SELECT SUM(debit - credit) AS net_balance FROM account_move_line`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_residual_amount=async(req,res)=>{
    let query=`SELECT SUM(amount_residual) AS total_residual FROM account_move_line`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_invoice_posted=async(req,res)=>{
    let query=`SELECT COUNT(DISTINCT move_id) AS invoices_posted
    FROM account_move_line
    WHERE move_type = 'out_invoice'`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_payment_matched=async(req,res)=>{
    let query=`SELECT COUNT(*) AS payments_matched
    FROM account_move_line
    WHERE matching_number IS NOT NULL`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_residual_aging=async(req,res)=>{
    let query=`SELECT
    CASE
    WHEN CURRENT_DATE - date_maturity <= 30 THEN '0–30 Days'
    WHEN CURRENT_DATE - date_maturity <= 60 THEN '31–60 Days'
    WHEN CURRENT_DATE - date_maturity <= 90 THEN '61–90 Days'
    ELSE '>90 Days'
    END AS aging_bucket,
    SUM(amount_residual) AS residual_total
    FROM account_move_line
    WHERE amount_residual > 0
    GROUP BY aging_bucket
    ORDER BY aging_bucket`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_top_partner_residual=async(req,res)=>{
    let query=`SELECT
    partner_id AS partner,
    SUM(amount_residual) AS residual_total
    FROM account_move_line
    where partner_id !='false'
    GROUP BY partner
    ORDER BY residual_total DESC`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_journal_distribution=async(req,res)=>{
    let query=`SELECT journal_id AS journal, SUM(amount_total) AS total_amount
    FROM account_moves
    WHERE state = 'posted'
    GROUP BY journal_id`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const truncateInsertJournalItem=async(req,res)=>{
    const response = await fetch(
        `${BASE_URL}/api/account/vendor_get_journal_items`
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
        await client.query(`TRUNCATE TABLE account_move_line RESTART IDENTITY`);
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
                `INSERT INTO account_move_line (
                id,
                move_id,
                invoice_date,
                date,
                company_id,
                journal_id,
                move_name,
                account_id,
                partner_id,
                ref,
                product_id,
                name,
                analytic_distribution,
                tax_ids,
                amount_currency,
                currency_id,
                debit,
                credit,
                tax_tag_ids,
                discount_date,
                discount_amount_currency,
                tax_line_id,
                date_maturity,
                balance,
                matching_number,
                amount_residual,
                amount_residual_currency,
                move_type,
                parent_state,
                account_type,
                statement_line_id,
                company_currency_id,
                is_same_currency,
                is_account_reconcile,
                sequence
                )
                VALUES (
                    $1,$2::jsonb,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,$9::jsonb,$10,
                    $11::jsonb,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,
                    $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
                    $31,$32::jsonb,$33,$34,$35
                )
                ON CONFLICT (id) DO NOTHING`,
                [
                    r.id,
                    toJsonArray(r.move_id),
                    r.invoice_date ? new Date(r.invoice_date) : null,
                    r.date ? new Date(r.date) : null,
                    toJsonArray(r.company_id),
                    toJsonArray(r.journal_id),
                    r.move_name,
                    toJsonArray(r.account_id),
                    toJsonArray(r.partner_id),
                    r.ref,

                    toJsonArray(r.product_id),
                    r.name,
                    r.analytic_distribution,
                    [r.tax_ids],
                    r.amount_currency,
                    toJsonArray(r.currency_id),
                    r.debit,
                    r.credit,
                    [r.tax_tag_ids],
                    r.discount_date ? new Date(r.discount_date) : null,

                    r.discount_amount_currency,
                    toJsonArray(r.tax_line_id),
                    r.date_maturity ? new Date(r.date_maturity) : null,
                    r.balance,
                    r.matching_number,
                    r.amount_residual,
                    r.amount_residual_currency,
                    r.move_type,
                    r.parent_state,
                    r.account_type,

                    r.statement_line_id,
                    toJsonArray(r.company_currency_id),
                    r.is_same_currency,
                    r.is_account_reconcile,
                    r.sequence
                ]
            );
        }
        await client.query("COMMIT");

        console.log({
            message: "SYNC SUCCESS — insert account moves line table for journal item",
            inserted: rows.length,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Error:", err);
    } finally {
        client.release();
    }
}