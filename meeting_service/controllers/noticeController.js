const CustomError = require('../errors/CustomError');
const db = require('../db');
const { generateNoticePdf } = require('../utils/pdfGenerator');

const SIGNED_PERSONA_KEYS = [
    'academic_president_signature',
    'academic_secretary_signature',
    'syndicate_president_signature',
    'syndicate_secretary_signature'
];

const getSignatures = async (req, res, next) => {
    try {
        const result = await db.query(
            "SELECT key, value FROM system_settings WHERE key IN ('academic_signature_str', 'syndicate_signature_str')"
        );
        const signatures = {};
        result.rows.forEach(row => { signatures[row.key] = row.value; });
        res.status(200).json({ success: true, data: signatures });
    } catch (error) {
        next(error);
    }
};

const updateSignatures = async (req, res, next) => {
    try {
        const { academic_signature_str, syndicate_signature_str } = req.body;

        if (academic_signature_str !== undefined) {
            await db.query(
                `INSERT INTO system_settings (key, value) VALUES ('academic_signature_str', $1)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                [academic_signature_str]
            );
        }
        if (syndicate_signature_str !== undefined) {
            await db.query(
                `INSERT INTO system_settings (key, value) VALUES ('syndicate_signature_str', $1)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                [syndicate_signature_str]
            );
        }

        res.status(200).json({ success: true, message: 'Signatures updated' });
    } catch (error) {
        next(error);
    }
};

const getSignedPersona = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT key, value FROM system_settings WHERE key = ANY($1)`,
            [SIGNED_PERSONA_KEYS]
        );
        const data = {};
        SIGNED_PERSONA_KEYS.forEach(key => { data[key] = ''; });
        result.rows.forEach(row => { data[row.key] = row.value; });
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const updateSignedPersona = async (req, res, next) => {
    try {
        const { academic_president_signature, academic_secretary_signature, syndicate_president_signature, syndicate_secretary_signature } = req.body;

        const updates = [
            { key: 'academic_president_signature', val: academic_president_signature },
            { key: 'academic_secretary_signature', val: academic_secretary_signature },
            { key: 'syndicate_president_signature', val: syndicate_president_signature },
            { key: 'syndicate_secretary_signature', val: syndicate_secretary_signature }
        ];

        for (const { key, val } of updates) {
            if (key !== undefined) {
                await db.query(
                    `INSERT INTO system_settings (key, value) VALUES ($1, $2)
                     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                    [key, val ?? '']
                );
            }
        }

        res.status(200).json({ success: true, message: 'Signed persona updated' });
    } catch (error) {
        next(error);
    }
};

const generateNoticePdfFromPayload = async (req, res, next) => {
    try {
        const { meeting_id, notice_number, notice_date, notice_type, body, signature_text } = req.body;
        if (!meeting_id || !notice_type) {
            return next(new CustomError('meeting_id and notice_type are required', 400));
        }

        const meetingResult = await db.query(
            `SELECT id, title AS meeting_title, meeting_date, type AS meeting_type,
                    is_regular, online_meeting_link, status AS meeting_status
             FROM meetings WHERE id = $1`,
            [meeting_id]
        );

        if (meetingResult.rows.length === 0) return next(new CustomError('Meeting not found', 404));

        const meeting = meetingResult.rows[0];

        const presenteesQuery = `
            SELECT p.id, p.name, p.designation, p.serial, d.name_bangla as department_name,
                   d.serial as department_serial, o.name_bangla as office_name
            FROM invitees p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN offices o ON p.office_id = o.id
            WHERE p.meeting_id = $1
            ORDER BY p.serial ASC NULLS LAST
        `;
        const presenteesResult = await db.query(presenteesQuery, [meeting_id]);

        const fakeNotice = {
            notice_number: notice_number || '',
            notice_date: notice_date || new Date().toISOString(),
            notice_type,
            body: body || '',
            signature_text: signature_text || '',
            meeting_id,
            meeting_title: meeting.meeting_title,
            meeting_date: meeting.meeting_date,
            meeting_type: meeting.meeting_type,
            is_regular: meeting.is_regular,
            online_meeting_link: meeting.online_meeting_link,
            meeting_status: meeting.meeting_status
        };

        const pdfBuffer = await generateNoticePdf(fakeNotice, presenteesResult.rows);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=notice-${notice_type}-${meeting.meeting_title || 'meeting'}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSignatures,
    updateSignatures,
    getSignedPersona,
    updateSignedPersona,
    generateNoticePdfFromPayload
};
