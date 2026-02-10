import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;
export const get_payments=async(req,res)=>{
    let query=`SELECT
    TO_CHAR(date, 'MM/DD/YYYY') AS date,
    name,
    journal_id,
    payment_method_line_id,
    partner_id,
    TO_CHAR(amount_signed, 'L9,999,999,999.00') AS amount_in_currency,
    TO_CHAR(amount_company_currency_signed, 'L9,999,999,999.00') AS amount,
    INITCAP(state) AS state
    FROM
    payments
    ORDER BY
    date DESC, name ASC;`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_total_payment=async(req,res)=>{
    let query=`SELECT COALESCE(SUM(amount_signed), 0) AS total_payments
    FROM payments
    WHERE payment_method_line_id->>1 = 'inbound'
    AND state = 'posted'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_unique_customer=async(req,res)=>{
    let query=`SELECT COUNT(DISTINCT partner_id) AS unique_customers
    FROM payments
    WHERE payment_method_line_id->>1 = 'inbound'
    AND state = 'posted'`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_average_payment=async(req,res)=>{
    let query=`SELECT COALESCE(AVG(amount_signed), 0) AS average_payment
    FROM payments
    WHERE payment_method_line_id->>1 = 'inbound'
    AND state = 'posted'`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_customer_payment=async(req,res)=>{
    let query=`SELECT DATE_TRUNC('month', date) AS month,
    SUM(amount_signed) AS total_payments
    FROM payments
    WHERE payment_method_line_id->>1 = 'inbound'
    AND state = 'posted'
    GROUP BY month
    ORDER BY month`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_top_customer=async(req,res)=>{
    let query=`SELECT ap.partner_id AS customer,
    SUM(ap.amount_signed) AS total_paid
    FROM payments ap
    WHERE ap.payment_method_line_id->>1 = 'inbound'
    AND ap.state = 'posted'
    GROUP BY ap.partner_id
    ORDER BY total_paid DESC
    LIMIT 5`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_method_distribution=async(req,res)=>{
    let query=`SELECT payment_method_line_id,
    COUNT(*) AS transactions,
    SUM(amount_signed) AS total_amount
    FROM payments
    WHERE payment_method_line_id->>1 = 'inbound' AND state = 'posted'
    GROUP BY payment_method_line_id`;
    const result = await pool.query(query);
    res.json(result);
}
export const get_recent_payment=async(req,res)=>{
    let query=`SELECT date,name AS payment_number,journal_id,partner_id,amount_signed,state
    FROM payments
    WHERE payment_method_line_id->>1 = 'inbound' AND state IN ('posted', 'draft')
    ORDER BY date DESC
    LIMIT 10`;
    const result = await pool.query(query);
    res.json(result);
}

export const truncateInsertPayments=async(req,res)=>{
    const response = await fetch(
        `${BASE_URL}/api/account/cust_get_payment`
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
        await client.query(`TRUNCATE TABLE payments RESTART IDENTITY`);
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
                `INSERT INTO payments (
                id,
                company_currency_id,
                available_payment_method_line_ids,
                date,
                name,
                journal_id,
                company_id,
                payment_method_line_id,
                partner_id,
                amount_signed,
                currency_id,
                activity_ids,
                amount_company_currency_signed,
                state
                )
                VALUES (
                    $1,$2::jsonb,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,
                    $11::jsonb,$12,$13,$14
                )`,
                [
                    r.id,
                    toJsonArray(r.company_currency_id),
                    [r.available_payment_method_line_ids],
                    r.date ? new Date(r.date) : null,
                    r.name,
                    toJsonArray(r.journal_id),
                    toJsonArray(r.company_id),
                    toJsonArray(r.payment_method_line_id),
                    toJsonArray(r.partner_id),
                    r.amount_signed,
                    toJsonArray(r.currency_id),
                    [r.activity_ids],
                    r.amount_company_currency_signed,
                    r.state
                ]
            );
        }
        await client.query("COMMIT");

        console.log({
            message: "SYNC SUCCESS — truncate & insert payments table",
            inserted: rows.length,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Error:", err);
    } finally {
        client.release();
    }
}