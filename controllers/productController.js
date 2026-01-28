import pool from '../db.js';
import axios from 'axios';
export const get_products=async(req, res)=>{
    let query = 'SELECT * FROM products';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const add_master_product = async (req, res) => {
    const {
        name, cost, sales_price, product_category,
        unit_of_measure, costing_method, product_type
    } = req.body;

    try {
        const lastIdQuery = await pool.query(`
            SELECT id FROM master_products
            ORDER BY id DESC
            LIMIT 1
        `);
        let newId="";
        if (lastIdQuery.rowCount === 0) {
            // Jika tabel masih kosong → mulai dari 13180-0001
            newId = "13180-0001";
        } else {
            const lastId = lastIdQuery.rows[0].id;  // contoh: "13180-0095"

            // Ambil 4 digit terakhir
            const lastNumber = parseInt(lastId.split("-")[1]); // 95

            // Tambah 1
            const nextNumber = (lastNumber + 1).toString().padStart(4, "0");

            // Format ID baru
            newId = `13180-${nextNumber}`;
        }
        await pool.query(`
            INSERT INTO master_products 
            (id,name, cost, sales_price, product_category, unit_of_measure, costing_method, product_type)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [
            newId,name, cost, sales_price,
            product_category, unit_of_measure,
            costing_method, product_type
        ]);

        return res.json({ message: "Product added successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Insert failed" });
    }
};
export const get_master_products=async(req, res)=>{
    let query = 'SELECT * FROM master_products';
    const result = await pool.query(query);
    res.json(result.rows);
}
export const get_master_products_by_id=async(req, res)=>{
    const {id}=req.params;
    let query = 'SELECT * FROM master_products WHERE id=$1';
    const result = await pool.query(query,[id]);
    res.json(result.rows[0]);
}
export const update_master_products=async(req,res)=>{
    const productId = req.params.id;
    const {
        name,
        cost,
        sales_price,
        product_category,
        unit_of_measure,
        costing_method,
        product_type
    } = req.body;

    const query = `
        UPDATE master_products SET
            name = $1,
            cost = $2,
            sales_price = $3,
            product_category = $4,
            unit_of_measure = $5,
            costing_method = $6,
            product_type = $7
        WHERE id = $8
        RETURNING *;
    `;

    try{
        const result=await pool.query(query,[
            name,
            cost,
            sales_price,
            product_category,
            unit_of_measure,
            costing_method,
            product_type,
            productId
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Product tidak ditemukan" });
        }

        return res.status(200).json({
            message: "Product berhasil diupdate",
            data: result.rows[0]
        });
    } catch (err) {
        console.error("❌ Error update:", err);
        return res.status(500).json({ message: "Gagal update data" });
    }
}
export const delete_master_products_by_id=async(req, res)=>{
    const {id}=req.params;
    let query = 'DELETE FROM master_products WHERE id=$1 RETURNING *';
    const result = await pool.query(query,[id]);
    res.json(result.rows);
}
export const post_products=async(req, res)=>{
    const {name, price}=req.body;
    const result=await pool.query('INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',[name, price]);
    res.json(result.rows[0]);
}