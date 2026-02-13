import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;

export const get_purchase_outstanding=async(req, res)=>{
    let query = 'SELECT*FROM purchase_order_outstanding';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_detail_purchase_outstanding = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT *
            FROM purchase_order_outstanding
            WHERE id = $1
            LIMIT 1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Purchase order not found"
            });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};
export const truncateInsertPurchaseOrderOustanding=async(req,res)=>{
    const response = await fetch(
        `http://72.60.76.201:5001/purchase/get/po_analytic`
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
        await client.query(`TRUNCATE TABLE purchase_order_outstanding RESTART IDENTITY`);
        for (const r of rows) {
            const toInteger = (v) => {
                if (!v || v === false) return 0;
                return v;
            };
            const toTimeStamp = (v) => {
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
                `INSERT INTO purchase_order_outstanding (
                id,
                name,
                origin,
                company_id,
                amount_total,
                date_order,
                lines,
                partner_id,
                state,
                user_id,
                date_planned,
                date_approve,
                effective_date,
                x_studio_delivery_address,
                partner_ref,
                currency_id,
                picking_type_id
                )
                VALUES (
                    $1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8::jsonb,$9,$10::jsonb,$11,$12,$13,$14::jsonb,$15,$16::jsonb,$17::jsonb
                )`,
                [
                    r.id,
                    r.name,
                    r.origin,
                    toJsonArray(r.company_id),
                    r.amount_total,
                    r.date_order,
                    toJsonArray(r.lines),
                    toJsonArray(r.partner_id),
                    r.state,
                    toJsonArray(r.user_id),
                    toTimeStamp(r.date_planned),
                    toTimeStamp(r.date_approve),
                    toTimeStamp(r.effective_date),
                    toJsonArray(r.x_studio_delivery_address),
                    r.partner_ref,
                    toJsonArray(r.currency_id),
                    toJsonArray(r.picking_type_id)
                ]
            );
        }
        await client.query("COMMIT");

        console.log({
            message: "SYNC SUCCESS — truncate & insert purchase order outstanding table",
            inserted: rows.length,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Error:", err);
    } finally {
        client.release();
    }
}