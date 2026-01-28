import pool from "../db.js";
export const get_vendor_bill=async(req,res)=>{
    let query="SELECT * FROM vendor_bill_dashboard_view";
    const result = await pool.query(query);
    res.json(result);
}