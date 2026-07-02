const CustomError = require('../errors/CustomError');
const db = require('../db');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const { Readable } = require('stream');

const getOffices = async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM offices ORDER BY serial ASC NULLS LAST, created_at DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const createOffice = async (req, res, next) => {
    try {
        const { name_bangla, name_english, serial } = req.body;
        
        if (!name_bangla || !name_english) {
            return next(new CustomError('Name (Bangla and English) are required', 400));
        }

        const result = await db.query(
            'INSERT INTO offices (name_bangla, name_english, serial) VALUES ($1, $2, $3) RETURNING *',
            [name_bangla, name_english, serial || null]
        );
        
        res.status(201).json({ success: true, message: 'Office created', data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return next(new CustomError('Office already exists', 409));
        }
        next(error);
    }
};

const updateOffice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name_bangla, name_english, serial } = req.body;

        const result = await db.query(
            'UPDATE offices SET name_bangla = COALESCE($1, name_bangla), name_english = COALESCE($2, name_english), serial = COALESCE($3, serial) WHERE id = $4 RETURNING *',
            [name_bangla, name_english, serial, id]
        );

        if (result.rows.length === 0) {
            return next(new CustomError('Office not found', 404));
        }

        res.status(200).json({ success: true, message: 'Office updated', data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return next(new CustomError('Office already exists with those names', 409));
        }
        next(error);
    }
};

const deleteOffice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM offices WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return next(new CustomError('Office not found', 404));
        }

        res.status(200).json({ success: true, message: 'Office deleted' });
    } catch (error) {
        next(error);
    }
};

const reorderOffices = async (req, res, next) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) return next(new CustomError('Items array required', 400));

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (const item of items) {
                await client.query('UPDATE offices SET serial = $1 WHERE id = $2', [item.serial, item.id]);
            }
            await client.query('COMMIT');
            res.status(200).json({ success: true, message: 'Offices reordered successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
};

const uploadCsv = async (req, res, next) => {
    try {
        if (!req.file) return next(new CustomError('No file uploaded', 400));

        const results = [];
        const stream = Readable.from(req.file.buffer);

        stream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                const client = await db.pool.connect();
                try {
                    await client.query('BEGIN');
                    let count = 0;
                    for (const row of results) {
                        if (row.name_bangla && row.name_english) {
                            await client.query(
                                'INSERT INTO offices (name_bangla, name_english, serial) VALUES ($1, $2, $3) ON CONFLICT (name_bangla) DO UPDATE SET name_english = EXCLUDED.name_english, serial = EXCLUDED.serial',
                                [row.name_bangla, row.name_english, row.serial ? parseInt(row.serial) : null]
                            );
                            count++;
                        }
                    }
                    await client.query('COMMIT');
                    res.status(200).json({ success: true, message: `${count} offices uploaded/updated` });
                } catch (err) {
                    await client.query('ROLLBACK');
                    next(err);
                } finally {
                    client.release();
                }
            });
    } catch (error) {
        next(error);
    }
};

const downloadCsv = async (req, res, next) => {
    try {
        const result = await db.query('SELECT id, serial, name_bangla, name_english, created_at FROM offices ORDER BY serial ASC NULLS LAST');
        
        if (result.rows.length === 0) {
            return next(new CustomError('No data found', 404));
        }

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.attachment('offices.csv');
        return res.send(csv);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOffices,
    createOffice,
    updateOffice,
    deleteOffice,
    reorderOffices,
    uploadCsv,
    downloadCsv
};
