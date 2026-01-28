import pool from '../db.js';
export const get_sales=async(req, res)=>{
    let query = 'SELECT * FROM sales_orders';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_total_sales=async(req, res)=>{
    let query = 'SELECT SUM(COALESCE(amount_total, 0)) AS total_amount FROM sales_orders';
    const result = await pool.query(query);
    res.json(result.rows);
}