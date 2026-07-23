const storageService = require('../utils/storageService');
const db = require('../db');

const viewerTypeRestriction = (user) => {
    if (user?.role !== 'viewer') return null;
    if (user?.member_type === 'syndicate') return null;
    return 'academic';
};

const checkFileAccess = async (key, user) => {
    if (user?.role !== 'viewer') return true;

    let meeting = null;

    // 1. Try finding meeting via annexures table file_path
    const annexureRes = await db.query(
        `SELECT m.status, m.type
         FROM annexures an
         JOIN agenda a ON a.id = an.content_id
         JOIN meetings m ON m.id = a.meeting_id
         WHERE an.file_path = $1`,
        [key]
    );

    if (annexureRes.rows.length > 0) {
        meeting = annexureRes.rows[0];
    } else if (key.startsWith('annexures/')) {
        const parts = key.split('/');
        const agendaId = parts[1];
        if (agendaId) {
            const aRes = await db.query(
                `SELECT m.status, m.type
                 FROM agenda a
                 JOIN meetings m ON m.id = a.meeting_id
                 WHERE a.id = $1`,
                [agendaId]
            );
            if (aRes.rows.length > 0) {
                meeting = aRes.rows[0];
            }
        }
    } else if (key.startsWith('materials/')) {
        const parts = key.split('/');
        const meetingId = parts[1];
        if (meetingId) {
            const mRes = await db.query('SELECT status, type FROM meetings WHERE id = $1', [meetingId]);
            if (mRes.rows.length > 0) {
                meeting = mRes.rows[0];
            }
        }
    }

    if (meeting) {
        if (meeting.status === 'draft') return false;
        const restrictedType = viewerTypeRestriction(user);
        if (restrictedType && meeting.type !== restrictedType) return false;
    }

    return true;
};

// Streams a stored file through our own authenticated server instead of exposing
// the bucket directly, so only logged-in users (via authMiddleware) can fetch it.
const streamFile = async (req, res, next) => {
    try {
        const keyParts = req.params.key;
        const key = Array.isArray(keyParts) ? keyParts.join('/') : keyParts;
        if (!key) return res.status(400).json({ success: false, message: 'File key is required' });

        const canAccess = await checkFileAccess(key, req.user);
        if (!canAccess) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const { stream, contentType, contentLength } = await storageService.getFileStream(key);

        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);

        stream.pipe(res);
        stream.on('error', (err) => next(err));
    } catch (error) {
        const status = error.$metadata && error.$metadata.httpStatusCode;
        if (error.name === 'NoSuchKey' || error.name === 'NotFound' || status === 404) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        next(error);
    }
};

module.exports = { streamFile };
