import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;

export const get_account_moves=async(req, res)=>{
    let query = 'SELECT * FROM account_moves';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const getRevenue=async(req,res)=>{
    let query=`WITH monthly AS (
        SELECT
            to_char(COALESCE(am.invoice_date, am.date), 'YYYY-MM') AS month,
            SUM(CASE WHEN move_type IN ('out_invoice','out_refund')
                THEN sign_sales_purchases * amount_total ELSE 0 END) AS revenue_total,
            SUM(CASE WHEN move_type IN ('in_invoice','in_refund')
                THEN -sign_sales_purchases * amount_total ELSE 0 END) AS expense_total,
            SUM(CASE WHEN move_type IN ('out_invoice','out_refund')
                THEN sign_sales_purchases * amount_total ELSE 0 END)
            - SUM(CASE WHEN move_type IN ('in_invoice','in_refund')
                THEN -sign_sales_purchases * amount_total ELSE 0 END) AS net_profit
        FROM vw_move_header am
        GROUP BY month
    ),
    with_diff AS (
        SELECT
            *,
            LAG(revenue_total) OVER (ORDER BY month) AS prev_revenue,
            LAG(expense_total) OVER (ORDER BY month) AS prev_expense,
            LAG(net_profit) OVER (ORDER BY month) AS prev_net_profit
        FROM monthly
    )
    SELECT
        month,
        revenue_total,
        expense_total,
        net_profit,
        revenue_total - prev_revenue AS revenue_diff,
        expense_total - prev_expense AS expense_diff,
        net_profit - prev_net_profit AS net_profit_diff,

        /* Persentase perubahan */
        CASE
            WHEN prev_revenue IS NULL OR prev_revenue = 0 THEN NULL
            ELSE ROUND(((revenue_total - prev_revenue) / prev_revenue) * 100, 2)
        END AS revenue_change_pct,

        CASE
            WHEN prev_expense IS NULL OR prev_expense = 0 THEN NULL
            ELSE ROUND(((expense_total - prev_expense) / prev_expense) * 100, 2)
        END AS expense_change_pct,

        CASE
            WHEN prev_net_profit IS NULL OR prev_net_profit = 0 THEN NULL
            ELSE ROUND(((net_profit - prev_net_profit) / prev_net_profit) * 100, 2)
        END AS net_profit_change_pct

    FROM with_diff
    ORDER BY month DESC
    LIMIT 1;`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_revenue_vs_expense=async(req,res)=>{
    let query=`WITH base AS (
            SELECT
            am.company_id,
            to_char(COALESCE(am.invoice_date, am.date), 'YYYY-MM') AS month,
            to_char(COALESCE(am.invoice_date, am.date), 'Mon') AS month_name,
            am.amount_untaxed,
            am.amount_tax,
            am.amount_total,
            am.move_type,
            am.sign_sales_purchases
            FROM vw_move_header am)
            SELECT
            month,
            month_name,
            SUM(CASE WHEN move_type IN ('out_invoice','out_refund')
            THEN sign_sales_purchases * amount_total ELSE 0 END) AS revenue_total,
            SUM(CASE WHEN move_type IN ('in_invoice','in_refund')
            THEN -sign_sales_purchases * amount_total ELSE 0 END) AS expense_total,
            SUM(CASE WHEN move_type IN ('out_invoice','out_refund')
            THEN sign_sales_purchases * amount_tax ELSE 0 END) AS output_tax,
            SUM(CASE WHEN move_type IN ('in_invoice','in_refund')
            THEN -sign_sales_purchases * amount_tax ELSE 0 END) AS input_tax,
            SUM(CASE WHEN move_type IN ('out_invoice','out_refund')
            THEN sign_sales_purchases * amount_total ELSE 0 END)
            - SUM(CASE WHEN move_type IN ('in_invoice','in_refund')
            THEN -sign_sales_purchases * amount_total ELSE 0 END) AS net_profit
            FROM base
            GROUP BY month,month_name
            ORDER BY month`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const aging_bucket=async(req,res)=>{
    let query=`WITH ar AS (
        SELECT
            am.partner_id,
            am.payment_state,
            COALESCE(am.amount_residual, 0) AS residual,
            am.invoice_date_due::date AS due_date,
            CURRENT_DATE AS today,
            GREATEST(0, (CURRENT_DATE - am.invoice_date_due::date)) AS days_past_due
        FROM account_moves am
        WHERE am.state = 'posted'
        AND am.move_type IN ('out_invoice','out_refund')
        AND COALESCE(am.amount_residual,0) > 0
    )
    SELECT *
    FROM (
        SELECT
            CASE
                WHEN days_past_due <= 0 THEN 'Not due'
                WHEN days_past_due <= 30 THEN '0-30'
                WHEN days_past_due <= 60 THEN '31-60'
                WHEN days_past_due <= 90 THEN '61-90'
                ELSE '90+'
            END AS bucket,
            SUM(residual) AS ar_total
        FROM ar
        GROUP BY bucket
    ) t
    ORDER BY CASE bucket
        WHEN 'Not due' THEN 0
        WHEN '0-30' THEN 1
        WHEN '31-60' THEN 2
        WHEN '61-90' THEN 3
        ELSE 4
    END`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_vat_summary=async(req,res)=>{
    let query=`SELECT
        date_trunc('month', COALESCE(am.invoice_date, am.date)) AS month,
        to_char(COALESCE(am.invoice_date, am.date), 'Mon') AS month_name,
        SUM(CASE WHEN am.move_type IN ('out_invoice','out_refund')
            THEN am.sign_sales_purchases * am.amount_tax ELSE 0 END) AS output_vat,
        SUM(CASE WHEN am.move_type IN ('in_invoice','in_refund')
            THEN -am.sign_sales_purchases * am.amount_tax ELSE 0 END) AS input_vat,
        SUM(CASE WHEN am.move_type IN ('out_invoice','out_refund')
            THEN am.sign_sales_purchases * am.amount_tax ELSE 0 END)
        - SUM(CASE WHEN am.move_type IN ('in_invoice','in_refund')
            THEN -am.sign_sales_purchases * am.amount_tax ELSE 0 END) AS net_vat
    FROM vw_move_header am
    GROUP BY month, month_name
    ORDER BY month`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_top_customer=async(req,res)=>{
    let query=`SELECT
    am.partner_id,
    SUM(CASE WHEN am.move_type IN ('out_invoice','out_refund')
    THEN am.sign_sales_purchases * am.amount_total ELSE 0 END) AS billed_total,
    COUNT(*) FILTER (WHERE am.payment_state = 'paid') AS paid_invoices,
    COUNT(*) FILTER (WHERE am.payment_state = 'not_paid') AS open_invoices,
    COUNT(*) FILTER (WHERE am.payment_state = 'in_payment')AS in_payment_invoices
    FROM vw_move_header am
    WHERE am.move_type IN ('out_invoice','out_refund')
    GROUP BY am.partner_id
    ORDER BY billed_total DESC
    LIMIT 10;`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const truncateInsertAccountMove=async(req,res)=>{
    try {
        const response = await fetch(
            `${BASE_URL}/api/account/move`
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
            await client.query(`TRUNCATE TABLE account_moves RESTART IDENTITY`);
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
                    display_name,
                    move_type,
                    state,
                    date,
                    invoice_date,
                    invoice_date_due,
                    partner_id,
                    commercial_partner_id,
                    partner_shipping_id,
                    bank_partner_id,
                    company_id,
                    currency_id,
                    company_currency_id,
                    amount_total,
                    amount_untaxed,
                    amount_tax,
                    amount_residual,
                    amount_paid,
                    payment_state,
                    payment_reference,
                    journal_id,
                    line_ids,
                    invoice_line_ids,
                    user_id,
                    create_uid,
                    create_date,
                    write_uid,
                    write_date,
                    team_id,
                    country_code,
                    tax_country_id,
                    l10n_id_kode_transaksi,
                    sequence_number,
                    sequence_prefix
                    )
                    VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,
                        $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20,
                        $21,$22,$23::jsonb,$24,$25,$26::jsonb,$27::jsonb,$28,$29::jsonb,$30,
                        $31::jsonb,$32,$33::jsonb,$34,$35,$36
                    )`,
                    [
                        r.id,
                        r.name,
                        r.display_name,
                        r.move_type,
                        r.state,
                        r.date ? new Date(r.date) : null,
                        r.invoice_date ? new Date(r.invoice_date) : null,
                        r.invoice_date_due ? new Date(r.invoice_date_due) : null,
                        toJsonArray(r.partner_id),
                        toJsonArray(r.commercial_partner_id),
                        
                        toJsonArray(r.partner_shipping_id),
                        toJsonArray(r.bank_partner_id),
                        toJsonArray(r.company_id),
                        toJsonArray(r.currency_id),
                        toJsonArray(r.company_currency_id),
                        r.amount_total,
                        r.amount_untaxed,
                        r.amount_tax,
                        r.amount_residual,
                        r.amount_paid,

                        r.payment_state,
                        r.payment_reference,
                        toJsonArray(r.journal_id),
                        [r.line_ids],
                        [r.invoice_line_ids],
                        toJsonArray(r.user_id),
                        toJsonArray(r.create_uid),
                        r.create_date,
                        toJsonArray(r.write_uid),
                        r.write_date,

                        toJsonArray(r.team_id),
                        r.country_code,
                        toJsonArray(r.tax_country_id),
                        r.l10n_id_kode_transaksi,
                        r.sequence_number,
                        r.sequence_prefix
                    ]
                );
            }
            await client.query("COMMIT");

            console.log({
                message: "SYNC SUCCESS — truncate & insert account moves table",
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