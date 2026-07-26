const CustomError = require('../errors/CustomError');
const db = require('../db');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const { Readable } = require('stream');

const getFaculties = async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM faculties ORDER BY serial ASC NULLS LAST, created_at DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const createFaculty = async (req, res, next) => {
    try {
        const { name_bangla, name_english, serial } = req.body;
        
        if (!name_bangla || !name_english) {
            return next(new CustomError('Name (Bangla and English) are required', 400));
        }

        let assignedSerial = serial;
        if (assignedSerial === undefined || assignedSerial === null || assignedSerial === '') {
            const maxSerialResult = await db.query('SELECT MAX(serial) as max_serial FROM faculties');
            assignedSerial = (maxSerialResult.rows[0].max_serial || 0) + 1;
        } else {
            assignedSerial = parseInt(assignedSerial, 10);
        }

        await db.query('BEGIN');

        if (!isNaN(assignedSerial)) {
            const taken = await db.query('SELECT id FROM faculties WHERE serial = $1', [assignedSerial]);
            if (taken.rows.length > 0) {
                await db.query('UPDATE faculties SET serial = serial + 1 WHERE serial >= $1', [assignedSerial]);
            }
        }

        const result = await db.query(
            'INSERT INTO faculties (name_bangla, name_english, serial) VALUES ($1, $2, $3) RETURNING *',
            [name_bangla, name_english, assignedSerial]
        );

        await db.query('COMMIT');
        
        res.status(201).json({ success: true, message: 'Faculty created', data: result.rows[0] });
    } catch (error) {
        await db.query('ROLLBACK').catch(() => {});
        if (error.code === '23505') {
            return next(new CustomError('Faculty already exists', 409));
        }
        next(error);
    }
};

const updateFaculty = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name_bangla, name_english, serial } = req.body;

        await db.query('BEGIN');

        let targetSerial = undefined;
        if (serial !== undefined && serial !== null && serial !== '') {
            targetSerial = parseInt(serial, 10);
            const currentFac = await db.query('SELECT serial FROM faculties WHERE id = $1', [id]);
            const currentSerial = currentFac.rows[0]?.serial;

            if (currentSerial !== targetSerial && !isNaN(targetSerial)) {
                const taken = await db.query('SELECT id FROM faculties WHERE serial = $1 AND id != $2', [targetSerial, id]);
                if (taken.rows.length > 0) {
                    await db.query('UPDATE faculties SET serial = serial + 1 WHERE serial >= $1 AND id != $2', [targetSerial, id]);
                }
            }
        }

        let result;
        if (targetSerial !== undefined && !isNaN(targetSerial)) {
            result = await db.query(
                'UPDATE faculties SET name_bangla = COALESCE($1, name_bangla), name_english = COALESCE($2, name_english), serial = $3 WHERE id = $4 RETURNING *',
                [name_bangla || null, name_english || null, targetSerial, id]
            );
        } else {
            result = await db.query(
                'UPDATE faculties SET name_bangla = COALESCE($1, name_bangla), name_english = COALESCE($2, name_english) WHERE id = $3 RETURNING *',
                [name_bangla || null, name_english || null, id]
            );
        }

        await db.query('COMMIT');

        if (result.rows.length === 0) {
            return next(new CustomError('Faculty not found', 404));
        }

        return res.status(200).json({ success: true, message: 'Faculty updated', data: result.rows[0] });
    } catch (error) {
        await db.query('ROLLBACK').catch(() => {});
        if (error.code === '23505') {
            return next(new CustomError('Faculty already exists with those names', 409));
        }
        next(error);
    }
};

const deleteFaculty = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM faculties WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return next(new CustomError('Faculty not found', 404));
        }

        res.status(200).json({ success: true, message: 'Faculty deleted' });
    } catch (error) {
        next(error);
    }
};

const reorderFaculties = async (req, res, next) => {
    try {
        const { items } = req.body; // Expecting [{id: '...', serial: 1}, ...]
        if (!Array.isArray(items)) return next(new CustomError('Items array required', 400));

        // Use a transaction for batch update
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (const item of items) {
                await client.query('UPDATE faculties SET serial = $1 WHERE id = $2', [item.serial, item.id]);
            }
            await client.query('COMMIT');
            res.status(200).json({ success: true, message: 'Faculties reordered successfully' });
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
                                'INSERT INTO faculties (name_bangla, name_english, serial) VALUES ($1, $2, $3) ON CONFLICT (name_bangla) DO UPDATE SET name_english = EXCLUDED.name_english, serial = EXCLUDED.serial',
                                [row.name_bangla, row.name_english, row.serial ? parseInt(row.serial) : null]
                            );
                            count++;
                        }
                    }
                    await client.query('COMMIT');
                    res.status(200).json({ success: true, message: `${count} faculties uploaded/updated` });
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
        const result = await db.query('SELECT id, serial, name_bangla, name_english, created_at FROM faculties ORDER BY serial ASC NULLS LAST');
        
        if (result.rows.length === 0) {
            return next(new CustomError('No data found', 404));
        }

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.attachment('faculties.csv');
        return res.send(csv);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFaculties,
    createFaculty,
    updateFaculty,
    deleteFaculty,
    reorderFaculties,
    uploadCsv,
    downloadCsv
};
