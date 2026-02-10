import pool from "../db.js";
const BASE_URL=process.env.CLAVIS_BASE_URL;

export const get_total_net_revenue=async(req,res)=>{
    let query=`SELECT AVG(amount_total) AS avg_revenue_per_partner
    FROM account_moves
    WHERE state = 'posted' AND move_type = 'out_invoice'
    GROUP BY partner_id`;
    // let query=`SELECT AVG(amount_total_signed) AS avg_revenue_per_partner
    // FROM account_move
    // WHERE state = 'posted' AND move_type = 'out_invoice'
    // GROUP BY partner_id`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_total_open_amount=async(req,res)=>{
    let query=`SELECT SUM(amount_residual) AS total_open_amount
    FROM account_moves
    WHERE state = 'posted' AND move_type = 'out_invoice' AND payment_state != 'paid'`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_sum_of_debit=async(req,res)=>{
    let query=`SELECT SUM(debit) AS total_debit
    FROM account_move_line
    WHERE (move_id ->> 0)::integer IN (
        SELECT id
        FROM account_moves
        WHERE state = 'posted'
    )`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_sum_of_credit=async(req,res)=>{
    let query=`SELECT SUM(credit) AS total_credit
    FROM account_move_line
    WHERE (move_id ->> 0)::integer IN (
        SELECT id
        FROM account_moves
        WHERE state = 'posted'
    )`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const average_net_revenue_per_partner=async(req,res)=>{
    let query=`SELECT AVG(amount_total) AS avg_revenue_per_partner
    FROM account_moves
    WHERE state = 'posted' AND move_type = 'out_invoice'
    GROUP BY partner_id;`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_journal_entry=async(req,res)=>{
    let query=`SELECT
    date, name AS number,
    partner_id AS partner,
    ref AS reference,
    journal_id AS journal,
    company_id AS company,
    amount_total AS total,
    state AS status
    FROM account_moves
    WHERE state = 'posted'
    ORDER BY date DESC
    LIMIT 20`;
    const result = await pool.query(query);
    res.json(result.rows);
    // let query=`SELECT
    // m.date,
    // m.name AS number,
    // m.partner_id AS partner,
    // m.ref AS reference,
    // m.journal_id AS journal,
    // m.company_id AS company,
    // m.amount_total_signed AS total,
    // m.state AS status
    // FROM account_moves m
    // WHERE m.state = 'posted'
    // ORDER BY m.date DESC
    // LIMIT 20;`;
}

export const truncateInsertJournalEntry=async(req,res)=>{
    const response = await fetch(
        `${BASE_URL}/api/account/vendor_get_journal_entry`
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
                sequence_prefix,
                amount_total_words,
                attachment_ids,
                audit_trail_message_ids,
                auto_post,
                checked,
                has_message,
                inalterable_hash,
                invoice_origin,
                invoice_user_id,
                message_follower_ids,
                message_ids,
                message_partner_ids,
                narration,
                partner_credit,
                posted_before,
                ref,
                sale_order_count,
                secure_sequence_number,
                show_delivery_date,
                show_discount_details,
                show_payment_term_details,
                show_reset_to_draft_button,
                show_signature_area,
                type_name
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,
                    $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20,
                    $21,$22,$23::jsonb,$24,$25,$26::jsonb,$27::jsonb,$28,$29::jsonb,$30,
                    $31::jsonb,$32,$33::jsonb,$34,$35,$36,$37,$38,$39,$40,
                    $41,$42,$43,$44,$45::jsonb,$46,$47,$48,$49,$50,
                    $51,$52,$53,$54,$55,$56,$57,$58,$59,$60
                )
                ON CONFLICT (id) DO NOTHING`,
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
                    r.sequence_prefix,
                    r.amount_total_words,
                    [r.attachment_ids],
                    [r.audit_trail_message_ids],
                    r.auto_post,
                    r.checked,
                    r.has_message,
                    r.inalterable_hash,
                    r.invoice_origin,
                    toJsonArray(r.invoice_user_id),
                    [r.message_follower_ids],
                    [r.message_ids],
                    [r.message_partner_ids],
                    r.narration,
                    r.partner_credit,
                    r.posted_before,
                    r.ref,
                    r.sale_order_count,
                    r.secure_sequence_number,
                    r.show_delivery_date,
                    r.show_discount_details,
                    r.show_payment_term_details,
                    r.show_reset_to_draft_button,
                    r.show_signature_area,
                    r.type_name
                ]
            );
        }
        await client.query("COMMIT");

        console.log({
            message: "SYNC SUCCESS — insert account moves table for journal entry",
            inserted: rows.length,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Error:", err);
    } finally {
        client.release();
    }
}