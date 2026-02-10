import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;
export const get_vendor=async(req, res)=>{
    let query = 'SELECT * FROM vendor_reports';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const truncateInsertVendor=async(req,res)=>{
    const response = await fetch(
        `${BASE_URL}/clavis_connect/partner/GetVendor`
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
        await client.query(`TRUNCATE TABLE vendor_reports RESTART IDENTITY`);
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
                `INSERT INTO vendor_reports (
                id,
                name,
                display_name,
                complete_name,
                commercial_company_name,
                company_type,
                company_registry_label,
                type,
                commercial_partner_id,
                commercial_partner_name,
                street,
                city,
                zip,
                country_id,
                country_name,
                country_code,
                contact_address,
                contact_address_complete,
                contact_address_inline,
                email,
                email_formatted,
                email_normalized,
                phone,
                phone_sanitized,
                mobile,
                website_url,
                credit,
                debit,
                currency_id,
                currency_name,
                total_due,
                total_overdue,
                total_all_due,
                total_all_overdue,
                total_invoiced,
                days_sales_outstanding,
                on_time_rate,
                create_date,
                write_date,
                calendar_last_notif_ack,
                date_localization,
                invoice_ids,
                purchase_line_ids,
                create_uid,
                create_user_email,
                im_status,
                partner_vat_placeholder,
                tz,
                created_at
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,
                    $11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,
                    $21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb,$30,
                    $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
                    $41,$42,$43,$44::jsonb,$45,$46,$47,$48,$49
                )`,
                [
                    r.id,
                    r.display_name,
                    r.name,
                    r.complete_name,
                    r.commercial_company_name,
                    r.company_type,
                    r.company_registry_label,
                    r.type,
                    toJsonArray(r.commercial_partner_id),
                    r.commercial_partner_name,

                    r.street,
                    r.city,
                    r.zip,
                    toJsonArray(r.country_id),
                    r.country_name,
                    r.country_code,
                    r.contact_address,
                    r.contact_address_complete,
                    r.contact_address_inline,
                    r.email,

                    r.email_formatted,
                    r.email_normalized,
                    r.phone,
                    r.phone_sanitized,
                    r.mobile,
                    r.website_url,
                    r.credit,
                    r.debit,
                    toJsonArray(r.currency_id),
                    r.currency_name,

                    r.total_due,
                    r.total_overdue,
                    r.total_all_due,
                    r.total_all_overdue,
                    r.total_invoiced,
                    r.days_sales_outstanding,
                    r.on_time_rate,
                    r.create_date,
                    r.write_date,
                    r.calendar_last_notif_ack,

                    r.date_localization ? new Date(r.date_localization) : null,
                    [r.invoice_ids],
                    [r.purchase_line_ids],
                    toJsonArray(r.create_uid),
                    r.create_user_email,
                    r.im_status,
                    r.partner_vat_placeholder,
                    r.tz,
                    r.created_at
                ]
            );
        }
        await client.query("COMMIT");

        console.log({
            message: "SYNC SUCCESS — truncate & insert vendor reports table",
            inserted: rows.length,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Error:", err);
    } finally {
        client.release();
    }
}