import pool from '../db.js';
export const get_module_expenses=async(req, res)=>{
    let query = `SELECT me.id, me.receipt_attachment, me.name, LEFT(me.expense_date::text, 10) AS date,note note_full, split_part(me.note, 'Qty', 1) AS note, me.amount, u.name AS sender FROM module_expenses me JOIN users u ON me.sender = u.id order by me.created_at;`;
    const result = await pool.query(query);
    res.json(result.rows);
}
export const post_module_expense = async (req, res) => {
    try {
        const { toko, date, note, total, id_user } = req.body;

        // image optional
        const imagePath = req.file ? req.file.filename : null;

        const result = await pool.query(
            `INSERT INTO module_expenses (name, expense_date, note, amount, receipt_attachment, sender) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [toko, date, note, total, imagePath, id_user]
        );

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menyimpan expense' });
    }
};