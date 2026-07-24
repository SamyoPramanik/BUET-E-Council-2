const fs = require('fs');
const path = require('path');
const db = require('../db');

// Root meetings directory in project workspace
const ROOT_MEETINGS_DIR = path.resolve(__dirname, '../../meetings');

/**
 * Ensure root directories exist:
 * meetings/
 * ├── Syndicate Meeting/
 * └── Academic Meeting/
 */
const ensureRootDirs = () => {
    const syndicateDir = path.join(ROOT_MEETINGS_DIR, 'Syndicate Meeting');
    const academicDir = path.join(ROOT_MEETINGS_DIR, 'Academic Meeting');
    if (!fs.existsSync(syndicateDir)) {
        fs.mkdirSync(syndicateDir, { recursive: true });
    }
    if (!fs.existsSync(academicDir)) {
        fs.mkdirSync(academicDir, { recursive: true });
    }
};

/**
 * Helper to get clean subfolder name and meeting folder path
 */
const getMeetingDirPath = (meeting) => {
    ensureRootDirs();
    const typeStr = (meeting.type || '').toLowerCase();
    const isSyndicate = typeStr === 'syndicate' || typeStr.includes('syndicate');
    const typeFolder = isSyndicate ? 'Syndicate Meeting' : 'Academic Meeting';

    const rawTitle = meeting.meeting_title || meeting.title || `Meeting_${meeting.id}`;
    // Replace characters invalid in file paths
    const cleanTitle = rawTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim();

    return path.join(ROOT_MEETINGS_DIR, typeFolder, cleanTitle);
};

/**
 * Create a folder for a meeting
 */
const createMeetingDir = (meeting) => {
    const dirPath = getMeetingDirPath(meeting);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
};

/**
 * Delete a meeting folder and all its contents
 */
const deleteMeetingDir = (meeting) => {
    try {
        const dirPath = getMeetingDirPath(meeting);
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
    } catch (err) {
        console.error('Failed to delete meeting folder:', err);
    }
};

/**
 * Save an annexure file into the meeting's folder as annexure-{serial}.{ext}
 */
const saveAnnexureFile = async (meetingId, annexureSerial, originalName, fileBuffer) => {
    try {
        const res = await db.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
        if (res.rows.length === 0) return;
        const meeting = res.rows[0];

        const dirPath = createMeetingDir(meeting);
        const ext = path.extname(originalName || '') || '.pdf';
        const fileName = `annexure-${annexureSerial}${ext}`;
        const filePath = path.join(dirPath, fileName);

        fs.writeFileSync(filePath, fileBuffer);
    } catch (err) {
        console.error('Failed to save annexure file to filesystem:', err);
    }
};

/**
 * Remove an annexure file from the meeting's folder
 */
const removeAnnexureFile = async (meetingId, annexureSerial) => {
    try {
        const res = await db.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
        if (res.rows.length === 0) return;
        const meeting = res.rows[0];

        const dirPath = getMeetingDirPath(meeting);
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            const prefix = `annexure-${annexureSerial}.`;
            const target = files.find(f => f.startsWith(prefix) || f === `annexure-${annexureSerial}`);
            if (target) {
                fs.unlinkSync(path.join(dirPath, target));
            }
        }
    } catch (err) {
        console.error('Failed to remove annexure file from filesystem:', err);
    }
};

/**
 * Save a generated PDF (agenda.pdf or resolution.pdf) in the meeting's folder
 */
const saveMeetingPdf = async (meetingId, pdfType, pdfBuffer) => {
    try {
        const res = await db.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
        if (res.rows.length === 0) return;
        const meeting = res.rows[0];

        const dirPath = createMeetingDir(meeting);
        const fileName = pdfType === 'resolution' ? 'resolution.pdf' : 'agenda.pdf';
        const filePath = path.join(dirPath, fileName);

        fs.writeFileSync(filePath, pdfBuffer);
    } catch (err) {
        console.error(`Failed to save ${pdfType} PDF to filesystem:`, err);
    }
};

/**
 * Sync meeting PDFs according to status:
 * - draft: no PDFs in folder
 * - ongoing: contains agenda.pdf
 * - past: contains resolution.pdf
 */
const syncMeetingStatusPdfs = async (meetingId, pdfGenerator) => {
    try {
        const res = await db.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
        if (res.rows.length === 0) return;
        const meeting = res.rows[0];

        const dirPath = createMeetingDir(meeting);
        const agendaPdfPath = path.join(dirPath, 'agenda.pdf');
        const resolutionPdfPath = path.join(dirPath, 'resolution.pdf');

        if (meeting.status === 'draft') {
            if (fs.existsSync(agendaPdfPath)) fs.unlinkSync(agendaPdfPath);
            if (fs.existsSync(resolutionPdfPath)) fs.unlinkSync(resolutionPdfPath);
        } else if (meeting.status === 'ongoing') {
            if (fs.existsSync(resolutionPdfPath)) fs.unlinkSync(resolutionPdfPath);
            if (pdfGenerator && typeof pdfGenerator.generatePdf === 'function') {
                const pdfBuffer = await pdfGenerator.generatePdf(meetingId, 'agenda');
                fs.writeFileSync(agendaPdfPath, pdfBuffer);
            }
        } else if (meeting.status === 'past') {
            if (pdfGenerator && typeof pdfGenerator.generatePdf === 'function') {
                const agendaBuffer = await pdfGenerator.generatePdf(meetingId, 'agenda');
                fs.writeFileSync(agendaPdfPath, agendaBuffer);

                const resolutionBuffer = await pdfGenerator.generatePdf(meetingId, 'resolution');
                fs.writeFileSync(resolutionPdfPath, resolutionBuffer);
            }
        }
    } catch (err) {
        console.error('Failed to sync meeting status PDFs:', err);
    }
};

/**
 * Sync all annexures for a meeting so that the host filesystem directory
 * stores them with accurate filenames matching their global serials (e.g. annexure-1.pdf, annexure-2.pdf).
 * When agendas or annexures are swapped, calling this ensures old serial files are renamed/resynced.
 */
const syncMeetingAnnexures = async (meetingId) => {
    try {
        const res = await db.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
        if (res.rows.length === 0) return;
        const meeting = res.rows[0];

        const dirPath = createMeetingDir(meeting);

        // Fetch all annexures in global meeting order
        const annexRes = await db.query(
            `SELECT an.*,
                    (
                      SELECT COUNT(*)::int
                      FROM annexures prev_an
                      JOIN agenda prev_a ON prev_a.id = prev_an.content_id
                      WHERE prev_a.meeting_id = a.meeting_id
                        AND (
                          (prev_a.is_suppli, prev_a.agenda_serial, prev_an.annexure_serial) <
                          (a.is_suppli, a.agenda_serial, an.annexure_serial)
                        )
                    ) + 1 AS global_serial
             FROM annexures an
             JOIN agenda a ON a.id = an.content_id
             WHERE a.meeting_id = $1
             ORDER BY a.is_suppli ASC, a.agenda_serial ASC, an.annexure_serial ASC`,
            [meetingId]
        );

        const storageService = require('./storageService');

        // Delete existing annexure-* files in directory to purge stale numbers
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const f of files) {
                if (f.startsWith('annexure-')) {
                    try { fs.unlinkSync(path.join(dirPath, f)); } catch (e) {}
                }
            }
        }

        // Write annexure files with their updated global serial number
        for (const an of annexRes.rows) {
            const serial = an.global_serial || an.annexure_serial || 1;
            const ext = path.extname(an.file_name || '') || '.pdf';
            const targetPath = path.join(dirPath, `annexure-${serial}${ext}`);

            if (an.file_path) {
                try {
                    const buffer = await storageService.getFileBuffer(an.file_path);
                    fs.writeFileSync(targetPath, buffer);
                } catch (e) {
                    console.error(`Failed to fetch buffer for annexure ${an.id}:`, e);
                }
            }
        }
    } catch (err) {
        console.error('Error during syncMeetingAnnexures:', err);
    }
};

/**
 * Full sync for all existing meetings in DB on startup
 */
const syncAllMeetings = async (pdfGenerator) => {
    try {
        ensureRootDirs();
        const res = await db.query('SELECT * FROM meetings');
        for (const meeting of res.rows) {
            createMeetingDir(meeting);

            // Sync PDFs according to status
            await syncMeetingStatusPdfs(meeting.id, pdfGenerator);

            // Sync Annexures with updated global serial file names
            await syncMeetingAnnexures(meeting.id);
        }
    } catch (err) {
        console.error('Error during syncAllMeetings:', err);
    }
};

module.exports = {
    ROOT_MEETINGS_DIR,
    ensureRootDirs,
    getMeetingDirPath,
    createMeetingDir,
    deleteMeetingDir,
    saveAnnexureFile,
    removeAnnexureFile,
    saveMeetingPdf,
    syncMeetingStatusPdfs,
    syncMeetingAnnexures,
    syncAllMeetings
};
