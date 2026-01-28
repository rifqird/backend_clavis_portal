import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;

export const get_partner=async(req, res)=>{
    let query = 'SELECT * FROM partner_reports';
    const result = await pool.query(query);
    res.json(result.rows);
}

export const truncateInsertPartnerReports=async(req,res)=>{
    try {
        const response = await fetch(
            `${BASE_URL}/clavis_connect/partner/GetPartner`
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
            await client.query(`TRUNCATE TABLE partner_reports RESTART IDENTITY`);
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
                    `INSERT INTO partner_reports (
                    id,
                    calendar_last_notif_ack,
                    color,
                    commercial_company_name,
                    commercial_partner_id,
                    company_name,
                    company_registry_label,
                    company_type,
                    complete_name,
                    contact_address,
                    contact_address_complete,
                    contact_address_inline,
                    contract_ids,
                    country_code,
                    country_id,
                    create_date,
                    create_uid,
                    credit,
                    currency_id,
                    days_sales_outstanding,
                    display_name,
                    email,
                    email_formatted,
                    email_normalized,
                    im_status,
                    mobile,
                    name,
                    partner_latitude,
                    partner_longitude,
                    partner_vat_placeholder,
                    phone,
                    property_product_pricelist,
                    city
                    )
                    VALUES (
                        $1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,
                        $11,$12,$13,$14,$15::jsonb,$16,$17::jsonb,$18,$19::jsonb,$20,
                        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
                        $31,$32::jsonb,$33
                    )`,
                    [
                        r.id,
                        r.calendar_last_notif_act,
                        r.color,
                        r.commercial_company_name,
                        toJsonArray(r.commercial_partner_id),
                        r.company_name,
                        r.company_registry_label,
                        r.company_type,
                        r.complete_name,
                        r.contact_address,
                        r.contact_address_complete,
                        r.contact_address_inline,
                        [r.contact_ids],
                        r.country_code,
                        toJsonArray(r.country_id),
                        r.create_date,
                        toJsonArray(r.create_uid),
                        r.credit,
                        toJsonArray(r.currency_id),
                        r.days_sales_outstanding,
                        r.display_name,
                        r.email,
                        r.email_formatted,
                        r.email_normalized,
                        r.im_status,
                        r.mobile,
                        r.name,
                        r.partner_latitude,
                        r.partner_longitude,
                        r.partner_vat_placeholder,
                        r.phone,
                        toJsonArray(r.property_product_pricelist),
                        r.city
                    ]
                );
            }
            await client.query("COMMIT");

            console.log({
                message: "SYNC SUCCESS — truncate & insert partner orders table",
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