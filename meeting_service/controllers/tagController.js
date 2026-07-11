const CustomError = require('../errors/CustomError');
const db = require('../db');

const getTags = async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM tags ORDER BY name ASC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const createTag = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return next(new CustomError('Tag name is required', 400));
        }

        const result = await db.query(
            `INSERT INTO tags (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING *`,
            [name.trim()]
        );

        res.status(201).json({ success: true, message: 'Tag created', data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = { getTags, createTag };
