import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;
export const get_move_history=async(req,res)=>{
    let query=`select date,name,product_id[1],lot_id,location_id,location_dest_id,state from move_histories order by date desc limit 20`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const truncateInsertMoveHistory=async(req,res)=>{
    try {
        const response = await fetch(
            `${BASE_URL}/api/inventory/get_move_history`
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
            await client.query(`TRUNCATE TABLE move_histories RESTART IDENTITY`);
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
                    `INSERT INTO move_histories (
                    id,
                    name,
                    origin,
                    state,
                    scheduled_date,
                    date,
                    date_done,
                    delay_pass,
                    company_id,
                    partner_id,
                    sale_id,
                    picking_type_id,
                    picking_type_code,
                    location_id,
                    location_dest_id,
                    move_ids,
                    move_line_ids,
                    move_type,
                    product_id,
                    weight,
                    weight_bulk,
                    shipping_weight,
                    shipping_volume,
                    carrier_id,
                    carrier_price,
                    carrier_tracking_ref,
                    carrier_tracking_url,
                    is_locked,
                    is_return_picking,
                    printed,
                    priority,
                    warehouse_address_id,
                    shopee_label_status,
                    shopee_delivery_status,
                    note,
                    days_to_arrive,
                    display_name,
                    group_id,
                    has_packages,
                    has_tracking,
                    is_signed,
                    lot_id,
                    package_level_ids,
                    return_id,
                    use_create_lots,
                    use_existing_lots
                    )
                    VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,
                        $11::jsonb,$12::jsonb,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18,$19::jsonb,$20,
                        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
                        $31,$32::jsonb,$33,$34,$35,$36,$37,$38::jsonb,$39,$40,
                        $41,$42,$43::jsonb,$44::jsonb,$45,$46
                    )
                    ON CONFLICT (id) DO NOTHING`,
                    [
                       r.id,
                       r.name,
                       r.origin,
                       r.state,
                       toTimestamp(r.scheduled_date),
                       toTimestamp(r.date),
                       toTimestamp(r.date_done),
                       toTimestamp(r.delay_pass),
                       toJsonArray(r.company_id),
                       toJsonArray(r.partner_id),
                       toJsonArray(r.sale_id),
                       toJsonArray(r.picking_type_id),
                       r.picking_type_code,
                       toJsonArray(r.location_id),
                       toJsonArray(r.location_dest_id),
                       toJsonArray(r.move_ids),
                       toJsonArray(r.move_line_ids),
                       r.move_type,
                       toJsonArray(r.product_id),
                       r.weight,
                       r.weight_bulk,
                       r.shipping_weight,
                       r.shipping_volume,
                       r.carrier_id,
                       r.carrier_price,
                       r.carrier_tracking_ref,
                       r.carrier_tracking_url,
                       r.is_locked,
                       r.is_return_picking,
                       r.printed,
                       r.priority,
                       toJsonArray(r.warehouse_address_id),
                       r.shopee_label_status,
                       r.shopee_delivery_status,
                       r.note,
                       toTimestamp(r.days_to_arrive),
                       r.display_name,
                       toJsonArray(r.group_id),
                       r.has_packages,
                       r.has_tracking,
                       r.is_signed,
                       r.lot_id,
                       toJsonArray(r.package_level_ids),
                       toJsonArray(r.return_id),
                       r.use_create_lots,
                       r.use_existing_lots
                    ]
                );
            }
            await client.query("COMMIT");

            console.log({
                message: "SYNC SUCCESS — insert move history table",
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