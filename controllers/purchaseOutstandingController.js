
export const truncateInsertAnalyticItem=async(req,res)=>{
    try {
        const response = await fetch(
            `${BASE_URL}/purchase/get/po_outstanding`
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
            await client.query(`TRUNCATE TABLE account_analytic_line RESTART IDENTITY`);
            for (const r of rows) {
                const toInteger = (v) => {
                    if (!v || v === false) return 0;
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
                    `INSERT INTO account_analytic_line (
                    id,
                    name,
                    display_name,
                    account_id,
                    amount,
                    analytic_distribution,
                    analytic_precision,
                    auto_account_id,
                    category,
                    code,
                    company_id,
                    currency_id,
                    date,
                    create_date,
                    create_uid,
                    write_date,
                    write_uid,
                    employee_id,
                    general_account_id,
                    journal_id,
                    move_line_id,
                    partner_id,
                    product_id,
                    product_uom_category_id,
                    product_uom_id,
                    ref,
                    so_line,
                    unit_amount,
                    user_id
                    )
                    VALUES (
                        $1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10,
                        $11::jsonb,$12::jsonb,$13,$14,$15::jsonb,$16,$17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,
                        $21::jsonb,$22::jsonb,$23,$24::jsonb,$25::jsonb,$26,$27,$28,$29::jsonb
                    )`,
                    [
                        r.id,
                        r.name,
                        r.display_name,
                        toJsonArray(r.account_id),
                        r.amount,
                        toJsonArray(r.analytic_distribution),
                        r.analytic_precision,
                        r.auto_account_id,
                        r.category,
                        r.code,
                        toJsonArray(r.company_id),
                        toJsonArray(r.currency_id),
                        r.date ? new Date(r.date) : null,
                        r.create_date,
                        toJsonArray(r.create_uid),
                        r.write_date,
                        toJsonArray(r.write_uid),
                        toJsonArray(r.employee_id),
                        toJsonArray(r.general_account_id),
                        toJsonArray(r.journal_id),
                        toJsonArray(r.move_line_id),
                        toJsonArray(r.partner_id),
                        toInteger(r.product_id),
                        toJsonArray(r.product_uom_category_id),
                        toJsonArray(r.product_uom_id),
                        r.ref,
                        toInteger(r.so_line),
                        r.unit_amount,
                        toJsonArray(r.user_id)
                    ]
                );
            }
            await client.query("COMMIT");

            console.log({
                message: "SYNC SUCCESS — truncate & insert account analytic line table",
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