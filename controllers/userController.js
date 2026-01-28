import bcrypt from 'bcrypt';
import pool from '../db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { transporter } from '../assets/emailService.js';
const BASE_URL=process.env.CLAVIS_BASE_URL;

export const register_user=async(req, res)=>{
    const {firstName, lastName, email, password}=req.body;
    const salt=bcrypt.genSaltSync(10);
    const hashedPassword=bcrypt.hashSync(password, salt);
    const result=await pool.query('INSERT INTO users (name, last_name, email, password, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',[firstName,lastName,email, hashedPassword]);
    res.json(result.rows[0]);
}
export const login_user=async(req, res)=>{
    const {email, password}=req.body;
    const result=await pool.query('SELECT * FROM users WHERE email=$1',[email]);
    if(result.rows.length===0){
        return res.status(404).json({message:'User not found'});
    }
    const user=result.rows[0];
    const isPasswordValid=await bcrypt.compare(password, user.password);
    if(!isPasswordValid){
        return res.status(401).json({message:'Invalid password'});
    }
    const token=jwt.sign({id: user.id, email: user.email}, process.env.JWT_SECRET, {expiresIn:'1h'});
    res.json({message:'Login successful',token, user});
}
export const send_reset_password=async(req,res)=>{
    const {email}=req.body;
    const expiry = new Date(Date.now() + 60 * 60 * 1000); 
    
    try{
        const result = await pool.query(
            "SELECT id, email FROM users WHERE email = $1 LIMIT 1",
            [email]
        );
        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Email tidak ditemukan" });
        }
        await pool.query(`UPDATE users SET reset_token = $1, token_expiry = $2 WHERE email = $3`,[token,expiry,email])

        const resetLink = `${process.env.FRONTEND_URL}/set_new_password.html?token=${token}`;

        // Kirim email
        const body_result=await transporter.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Password Reset Request",
            html: `
                <h3>Password Reset</h3>
                <p>Klik link berikut untuk reset password:</p>
                <a href="${resetLink}" target="_blank">${resetLink}</a>
                <p>Link berlaku 1 jam.</p>
            `,
        });

        res.json(body_result);
    } catch (err) {
        console.error("Error sending reset email:", err);
        res.status(500).json(err);
    }
}
export const set_new_password = async (req, res) => {
    const { token, password } = req.body;

    console.log("Received:", password); // Debug

    if (!password) {
        return res.status(400).json({ message: "New password required" });
    }

    const user = await pool.query(
        "SELECT * FROM users WHERE reset_token = $1 AND token_expiry > NOW()",
        [token]
    );

    if (user.rowCount === 0) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
        "UPDATE users SET password = $1, reset_token = NULL, token_expiry = NULL WHERE id = $2",
        [hashedPassword, user.rows[0].id]
    );

    return res.json({ message: "Password updated successfully" });
}
export const selfReminder=async(req,res)=>{
    try {
        const response = await fetch(
            `${BASE_URL}/clavis_connect/sales/GetSalesOrder`
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
            await client.query(`TRUNCATE TABLE sales_orders RESTART IDENTITY`);
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
                    `INSERT INTO sales_orders (
                    id,
                    access_url,
                    amount_invoiced,
                    amount_paid,
                    amount_tax,
                    amount_to_invoice,
                    amount_total,
                    amount_undiscounted,
                    amount_unpaid,
                    amount_untaxed,
                    company_id,
                    company_price_include,
                    country_code,
                    create_date,
                    create_uid,
                    currency_id,
                    customizable_pdf_form_fields,
                    date_order,
                    delivery_count,
                    delivery_status,
                    display_name,
                    duplicated_order_ids,
                    effective_date,
                    expected_date,
                    expense_count,
                    margin,
                    margin_percent,
                    medium_id,
                    name,
                    order_line,
                    partner_id,
                    partner_invoice_id,
                    partner_shipping_id,
                    picking_ids,
                    planning_initial_date,
                    pricelist_id,
                    procurement_group_id,
                    tax_calculation_rounding_method,
                    tax_country_id,
                    team_id,
                    transaction_ids,
                    type_name,
                    user_id,
                    validity_date,
                    warehouse_id,
                    write_date,
                    write_uid,
                    x_studio_email
                    )
                    VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                        $11::jsonb,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18,$19,$20,
                        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
                        $31::jsonb,$32::jsonb,$33::jsonb,$34,$35,$36::jsonb,$37::jsonb,$38,$39::jsonb,$40::jsonb,
                        $41,$42,$43::jsonb,$44,$45::jsonb,$46,$47::jsonb,$48
                    )`,
                    [
                        r.id,
                        r.access_url,
                        r.amount_invoiced,
                        r.amount_paid,
                        r.amount_tax,
                        r.amount_to_invoice,
                        r.amount_total,
                        r.amount_undiscounted,
                        r.amount_unpaid,
                        r.amount_untaxed,
                        toJsonArray(r.company_id),
                        r.company_price_include,
                        r.country_code,
                        r.create_date ? new Date(r.create_date) : null,
                        toJsonArray(r.create_uid),
                        toJsonArray(r.currency_id),
                        r.customizable_pdf_form_fields,
                        r.date_order ? new Date(r.date_order) : null,
                        r.delivery_count,
                        r.delivery_status,
                        r.display_name,
                        [r.duplicated_order_ids],
                        r.effective_date ? new Date(r.effective_date) : null,
                        r.expected_date ? new Date(r.expected_date) : null,
                        r.expense_count,
                        r.margin,
                        r.margin_percent,
                        r.medium_id,
                        r.name,
                        [r.order_line],
                        toJsonArray(r.partner_id),
                        toJsonArray(r.partner_invoice_id),
                        toJsonArray(r.partner_shipping_id),
                        [r.picking_ids],
                        r.planning_initial_date,
                        toJsonArray(r.pricelist_id),
                        toJsonArray(r.procurement_group_id),
                        r.tax_calculation_rounding_method,
                        toJsonArray(r.tax_country_id),
                        toJsonArray(r.team_id),
                        [r.transaction_ids],
                        r.type_name,
                        toJsonArray(r.user_id),
                        r.validity_date,
                        toJsonArray(r.warehouse_id),
                        r.write_date ? new Date(r.write_date) : null,
                        toJsonArray(r.write_uid),
                        r.x_studio_email
                    ]
                );
            }
            await client.query("COMMIT");

            console.log({
                message: "SYNC SUCCESS — truncate & insert",
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
