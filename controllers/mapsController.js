import pool from '../db.js';
import axios from 'axios';
export const get_sales_area = async (req, res) => {
    try {
        const { sales_name, filter_date, status } = req.query;

        const response = await axios.get(
            "http://192.168.0.104:8000/api/data-visits-leads-map"
        );

        let result = response.data.data;
        result = result.filter(item => item.visit_status_label !== 'VISIT');

        result = result.filter(item => {
            const matchSales =
                !sales_name ||
                item.sales_name?.toLowerCase().includes(sales_name.toLowerCase());

            const matchDate =
                !filter_date ||
                item.visit_at?.startsWith(filter_date);

            const matchStatus =
                !status ||
                item.visit_status_label === status;

            return matchSales && matchDate && matchStatus;
        });

        return res.json({
            success: true,
            data: result
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
export const get_area = async (req, res) => {
    const { sales_name, date } = req.query;

    let query = `
        SELECT * from maps
    `;

    let conditions = [];
    let params = [];

    // Filter by sales_name
    if (sales_name) {
        params.push(`${sales_name}%`);
        conditions.push(`sales_name ILIKE $${params.length}`);
    }

    // Filter by date (created_at only date part)
    if (date) {
        params.push(date);
        conditions.push(`DATE(created_at) = $${params.length}`);
    }

    // Build WHERE clause if needed
    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(" AND ");
    }

    // Final order by
    query += ` ORDER BY created_at DESC;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
};
export const get_realtime_area = async (req, res) => {
    const { sales_name } = req.query;

    let query = `
        SELECT DISTINCT ON (sales_name) *
        FROM maps
    `;

    let params = [];
    let conditions = [];

    // Filter by sales_name only
    if (sales_name) {
        params.push(`${sales_name}%`);
        conditions.push(`sales_name ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(" AND ");
    }

    // DISTINCT ON requires order by sales_name first
    query += ` ORDER BY sales_name, created_at DESC;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
};
