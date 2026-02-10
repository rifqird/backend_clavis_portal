import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;
export const get_total_sales=async(req,res)=>{
    let query=`SELECT SUM(amount_total) AS total_sales
    FROM sale_orders
    WHERE state = 'sale'`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_total_orders=async(req,res)=>{
    let query=`SELECT COUNT(id) AS total_orders
    FROM sale_orders
    WHERE state = 'sale'`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_average_order=async(req,res)=>{
    let query=`SELECT AVG(amount_total) AS avg_order_value
    FROM sale_orders
    WHERE state = 'sale'`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_total_margin=async(req,res)=>{
    let query=`SELECT SUM(margin) AS total_margin
    FROM sale_orders
    WHERE state = 'sale'`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_total_unpaid=async(req,res)=>{
    let query=`SELECT SUM(amount_unpaid) AS total_unpaid
    FROM sale_orders
    WHERE state = 'sale'`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_margin_percent=async(req,res)=>{
    let query=`SELECT (SUM(margin) / NULLIF(SUM(amount_total),0)) * 100 AS margin_percent
    FROM sale_orders
    WHERE state = 'sale'`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_order_invoice=async(req,res)=>{
    let query=`SELECT COUNT(id) AS orders_to_invoice
    FROM sale_orders
    WHERE invoice_status = 'to invoice'`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const get_sales_trend=async(req,res)=>{
    let query=`SELECT DATE_TRUNC('month', date_order) AS month,
    TO_CHAR(DATE_TRUNC('month', date_order), 'Mon YYYY') AS month_year,
    SUM(amount_total) AS monthly_sales
    FROM sale_orders
    WHERE state = 'sale'
    GROUP BY month
    ORDER BY month`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const top_customers=async(req,res)=>{
    let query=`SELECT partner_id[1],
    SUM(amount_total) AS total_sales
    FROM sale_orders
    WHERE state = 'sale'
    GROUP BY partner_id[1]
    ORDER BY total_sales DESC
    LIMIT 10`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const sales_person=async(req,res)=>{
    let query=`SELECT create_uid[1],
    SUM(amount_total) AS total_sales
    FROM sale_orders
    WHERE state = 'sale'
    GROUP BY create_uid[1]`;
    const result=await pool.query(query);
    res.json(result.rows);
}
export const truncateInsertSaleOrders=async(req,res)=>{
    const response = await fetch(
        `${BASE_URL}/sales/get/so`
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
        await client.query(`TRUNCATE TABLE sale_orders RESTART IDENTITY`);
        for (const r of rows) {
            const toTimestamp = (v) => {
                if (!v || v === false) return null;
                return v;
            };
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
                `INSERT INTO sale_orders (
                id,
                name,
                display_name,
                state,
                date_order,
                validity_date,
                expected_date,
                commitment_date,
                company_id,
                warehouse_id,
                partner_id,
                partner_invoice_id,
                partner_shipping_id,
                user_id,
                team_id,
                currency_id,
                amount_total,
                amount_untaxed,
                amount_tax,
                amount_unpaid,
                amount_invoiced,
                amount_paid,
                invoice_status,
                invoice_ids,
                picking_ids,
                delivery_status,
                order_line,
                margin,
                margin_percent,
                pricelist_id,
                procurement_group_id,
                payment_term_id,
                require_signature,
                require_payment,
                create_date,
                create_uid,
                write_date,
                write_uid,
                x_studio_email
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,
                    $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17,$18,$19,$20,
                    $21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb,
                    $31::jsonb,$32::jsonb,$33,$34,$35,$36::jsonb,$37,$38::jsonb,$39
                )
                ON CONFLICT (id) DO NOTHING`,
                [
                    r.id,
                    r.name,
                    r.display_name,
                    r.state,
                    toTimestamp(r.date_order),
                    r.validity_date ? new Date(r.validity_date) : null,
                    toTimestamp(r.expected_date),
                    toTimestamp(r.commitment_date),
                    toJsonArray(r.company_id),
                    toJsonArray(r.warehouse_id),
                    toJsonArray(r.partner_id),
                    toJsonArray(r.partner_invoice_id),
                    toJsonArray(r.partner_shipping_id),
                    toJsonArray(r.user_id),
                    toJsonArray(r.team_id),
                    toJsonArray(r.currency_id),
                    r.amount_total,
                    r.amount_untaxed,
                    r.amount_tax,
                    r.amount_unpaid,
                    r.amount_invoiced,
                    r.amount_paid,
                    r.invoice_status,
                    [r.invoice_ids],
                    [r.picking_ids],
                    r.delivery_status,
                    [r.order_line],
                    r.margin,
                    r.margin_percent,
                    toJsonArray(r.pricelist_id),
                    toJsonArray(r.procurement_group_id),
                    toJsonArray(r.payment_term_id),
                    r.require_signature,
                    r.require_payment,
                    toTimestamp(r.create_date),
                    toJsonArray(r.create_uid),
                    toTimestamp(r.write_date),
                    toJsonArray(r.write_uid),
                    r.x_studio_email
                ]
            );
        }
        await client.query("COMMIT");

        console.log({
            message: "SYNC SUCCESS — insert sale orders table\n",
            inserted: rows.length,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Error:", err);
    } finally {
        client.release();
    }
}