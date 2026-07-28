const db = require('../db');

const getCategories = async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY serial ASC, created_at ASC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const createCategory = async (req, res, next) => {
    try {
        const { name, serial } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        let catSerial = serial;
        if (!catSerial) {
            const maxRes = await db.query('SELECT COALESCE(MAX(serial), 0) + 1 AS next_serial FROM categories');
            catSerial = maxRes.rows[0].next_serial;
        }

        const result = await db.query(
            'INSERT INTO categories (name, serial) VALUES ($1, $2) RETURNING *',
            [name.trim(), catSerial]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Category with this name already exists' });
        }
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, serial } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const result = await db.query(
            'UPDATE categories SET name = $1, serial = COALESCE($2, serial) WHERE id = $3 RETURNING *',
            [name.trim(), serial, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Category with this name already exists' });
        }
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
        next(error);
    }
};

const reorderCategories = async (req, res, next) => {
    try {
        const { items } = req.body; // Array of { id, serial }
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Items array is required' });
        }

        await Promise.all(
            items.map((item, index) =>
                db.query('UPDATE categories SET serial = $1 WHERE id = $2', [index + 1, item.id])
            )
        );

        const result = await db.query('SELECT * FROM categories ORDER BY serial ASC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
};
