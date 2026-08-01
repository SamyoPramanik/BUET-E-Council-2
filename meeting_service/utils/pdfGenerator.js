const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../db');
const storageService = require('./storageService');
const meetingFileSystem = require('./meetingFileSystem');
const { toBanglaDigits, getSerialWidth, stripResolutionPrefix } = require('./agendaSerial');

const getFontBase64 = () => {
    const sonarPath = path.join(__dirname, 'fonts', 'SonarBangla.ttf');
    const kalpurushPath = path.join(__dirname, 'fonts', 'Kalpurush.ttf');
    let fontPath = null;

    if (fs.existsSync(sonarPath)) {
        fontPath = sonarPath;
    } else if (fs.existsSync(kalpurushPath)) {
        fontPath = kalpurushPath;
    }

    if (fontPath) {
        return `data:font/ttf;base64,${fs.readFileSync(fontPath).toString('base64')}`;
    }
    return null;
};

// Read and encode the Bangla font once at startup, then reuse for every request.
const FONT_BASE64 = getFontBase64();

function convertMarkdownTablesToHtml(content) {
    if (!content || typeof content !== 'string') return content || '';
    if (content.includes('<table') || content.includes('<TABLE')) return content;
    if (!content.includes('|')) return content;

    // Step 1: Replace line breaks and paragraph tags with newlines
    let raw = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n');

    // Step 2: Replace double pipes `| |` -> `|\n|`
    raw = raw.replace(/\|\s*\|/g, '|\n|');

    const isSep = (str) => /^\|?\s*[:\-]{2,}(?:\s*\|\s*[:\-]{2,})*\s*\|?$/.test(str.trim());

    let rawLines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    let lines = [];

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i];
        if (i + 1 < rawLines.length && isSep(rawLines[i + 1])) {
            if (line.includes('|')) {
                let parts = line.split('|').map(s => s.trim());
                let items = [];
                for (let k = 0; k < parts.length; k++) {
                    let p = parts[k];
                    if (!p) continue;
                    if (k > 0 && k < parts.length - 1) {
                        items.push(`| ${p} |`);
                    } else {
                        items.push(p);
                    }
                }
                if (items.length > 1) {
                    items.forEach(it => lines.push(it));
                    continue;
                }
            }
        }
        lines.push(line);
    }

    let result = [];
    let idx = 0;

    while (idx < lines.length) {
        if (idx + 1 < lines.length && isSep(lines[idx + 1])) {
            let headerRaw = lines[idx];

            let leadText = '';
            let headerTablePart = headerRaw;
            const firstPipeIdx = headerRaw.indexOf('|');
            if (firstPipeIdx > 0) {
                leadText = headerRaw.substring(0, firstPipeIdx).trim();
                headerTablePart = headerRaw.substring(firstPipeIdx).trim();
            }

            if (leadText) {
                result.push(`<p>${leadText}</p>`);
            }

            let dataLines = [];
            let j = idx + 2;

            while (j < lines.length) {
                let curLine = lines[j];
                if (!curLine || isSep(curLine)) break;
                if (j + 1 < lines.length && isSep(lines[j + 1])) break;
                if (j + 2 < lines.length && isSep(lines[j + 2])) break;
                if (curLine.includes('|')) {
                    dataLines.push(curLine);
                    j++;
                } else {
                    break;
                }
            }

            const headers = headerTablePart.split('|').map(s => s.trim()).filter((s, k, arr) => !(k === 0 && s === '') && !(k === arr.length - 1 && s === ''));
            if (headers.length === 0 && headerTablePart) headers.push(headerTablePart.replace(/\|/g, '').trim());

            let tableHtml = '<table class="meeting-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0;border:1px solid #000;"><thead><tr>';
            headers.forEach(h => {
                tableHtml += `<th style="border:1px solid #000;padding:6px;background-color:rgba(0,0,0,0.05);font-weight:600;text-align:left;">${h}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';

            dataLines.forEach(dLine => {
                const cells = dLine.split('|').map(s => s.trim()).filter((s, k, arr) => !(k === 0 && s === '') && !(k === arr.length - 1 && s === ''));
                if (cells.length > 0) {
                    tableHtml += '<tr>';
                    cells.forEach(c => {
                        tableHtml += `<td style="border:1px solid #000;padding:6px;">${c}</td>`;
                    });
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody></table>';

            result.push(tableHtml);
            idx = j;
        } else {
            let cleanText = lines[idx].replace(/^\||\|$/g, '').trim();
            if (cleanText) {
                result.push(`<p>${cleanText}</p>`);
            }
            idx++;
        }
    }

    return result.join('\n');
}

// Reuse a single Chromium instance across requests instead of launching one per PDF.
let browserPromise = null;

const getBrowser = async () => {
    if (browserPromise) {
        try {
            const existing = await browserPromise;
            if (existing.connected) return existing;
            // Stale/disconnected instance: best-effort teardown before relaunching.
            existing.close().catch(() => { });
        } catch (e) {
            // Previous launch failed; fall through and relaunch.
        }
        browserPromise = null;
    }

    browserPromise = puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true
    });

    const browser = await browserPromise;
    // If Chromium ever crashes/disconnects, drop the cached instance so the next
    // request relaunches a fresh one.
    browser.on('disconnected', () => { browserPromise = null; });
    return browser;
};

/**
 * Warm up Chromium during service startup so the first PDF request doesn't pay
 * the launch cost. Non-blocking and best-effort: a failure here does not delay
 * startup and the lazy getBrowser() path still recovers on the first request.
 */
const warmUp = async () => {
    try {
        await getBrowser();
        console.log('Puppeteer Chromium warmed up and ready.');
    } catch (err) {
        console.error('Puppeteer warm-up failed (will retry lazily on first request):', err.message);
    }
};

/**
 * Render an HTML string to a PDF Buffer using the shared browser. Extracted so
 * both generators share identical rendering/cleanup behaviour.
 */
const renderPdf = async (html) => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        // Harden against SSRF / local-file access: the PDF only needs the inline
        // HTML and the embedded (data: URI) font, so block any other resource
        // request that user-supplied content might trigger.
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.isNavigationRequest() || req.url().startsWith('data:')) {
                req.continue().catch(() => { });
            } else {
                req.abort().catch(() => { });
            }
        });

        await page.setContent(html, { waitUntil: 'load' });
        // Ensure the embedded Bangla font is fully loaded before rendering so
        // the output stays identical to the previous networkidle0 behaviour.
        await page.evaluate(() => document.fonts.ready.then(() => true));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
            printBackground: true
        });

        return pdfBuffer;
    } finally {
        // Close the page but keep the shared browser alive for reuse. Never let a
        // cleanup failure mask the original error or crash the process.
        await page.close().catch(() => { });
    }
};

// ---------------------------------------------------------------------------
// PDF caching (backed by the existing MinIO/S3 bucket).
//
// A generated PDF is stored at a fixed key per (meeting, type) with a content
// fingerprint saved in its object metadata. On each request we recompute the
// fingerprint from the current meeting data; if it matches the stored one we
// return the cached bytes without launching Chromium. Any change to the meeting
// (or its presentees/agendas/joined names) changes the fingerprint and triggers
// a one-time regeneration. Locked meetings never change, so they always hit.
// Bump PDF_TEMPLATE_VERSION whenever the PDF template/appearance changes so all
// existing caches are invalidated.
// ---------------------------------------------------------------------------
const CACHE_PREFIX = 'generated-pdfs';
const PDF_TEMPLATE_VERSION = 'v41';

const pdfCacheKey = (meetingId, type) => `${CACHE_PREFIX}/${meetingId}/${type}.pdf`;

// Deterministic ordering so row order from the DB doesn't cause false misses.
const stableRows = (rows) => [...rows]
    .map(r => ({ ...r }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

const computeFingerprint = (payload) => crypto
    .createHash('sha256')
    .update(`${PDF_TEMPLATE_VERSION}|${JSON.stringify(payload)}`)
    .digest('hex');

// Returns the cached PDF Buffer if the fingerprint matches, otherwise null.
// Best-effort: any storage error falls back to regeneration.
const getCachedPdf = async (cacheKey, fingerprint) => {
    try {
        const meta = await storageService.getFileMetadata(cacheKey);
        if (meta && meta.fingerprint === fingerprint) {
            return await storageService.getFileBuffer(cacheKey);
        }
    } catch (err) {
        console.error('PDF cache read failed, regenerating:', err.message);
    }
    return null;
};

// Best-effort cache write: never fail the request if the upload fails.
const storeCachedPdf = async (cacheKey, pdfBuffer, fingerprint) => {
    try {
        await storageService.uploadFile(pdfBuffer, cacheKey, 'application/pdf', { fingerprint });
    } catch (err) {
        console.error('PDF cache write failed:', err.message);
    }
};

const generatePdf = async (meetingId, isResolution, cacheVariant) => {
    try {
        const meetingQuery = `SELECT title, meeting_date, description, agenda_prefix, type FROM meetings WHERE id = $1`;
        const presenteesQuery = `
            SELECT p.id, p.name, p.designation, p.serial, d.name_bangla as department_name, d.serial as department_serial, o.name_bangla as office_name
            FROM invitees p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN offices o ON p.office_id = o.id
            WHERE p.meeting_id = $1 AND p.is_present = true
            ORDER BY p.serial ASC NULLS LAST
        `;
        const resFilter = isResolution
            ? ' AND prev_an.is_excluded_in_resolution = false'
            : " AND (prev_an.annexure_type IS NULL OR prev_an.annexure_type != 'resolution')";
        const isSuppliFilter = isResolution
            ? ''
            : ' AND prev_a.is_suppli = a.is_suppli';
        const agendasQuery = `
            SELECT 
                a.id,
                a.agenda_serial, 
                a.content, 
                a.resolution, 
                a.is_executed,
                a.execution_status,
                a.is_suppli,
                a.category_id,
                c.name AS category_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', an.id,
                                'annexure_serial', an.annexure_serial,
                                'annexure_type', an.annexure_type,
                                'is_excluded_in_resolution', an.is_excluded_in_resolution,
                                'is_suppli', a.is_suppli,
                                'global_serial', (
                                    SELECT COUNT(*)::int
                                    FROM annexures prev_an
                                    JOIN agenda prev_a ON prev_a.id = prev_an.content_id
                                    WHERE prev_a.meeting_id = a.meeting_id
                                      ${isSuppliFilter}
                                      ${resFilter}
                                      AND (
                                        (prev_a.is_suppli, prev_a.agenda_serial, prev_an.annexure_serial) <
                                        (a.is_suppli, a.agenda_serial, an.annexure_serial)
                                      )
                                ) + 1
                            ) ORDER BY an.annexure_serial ASC
                        )
                        FROM annexures an
                        WHERE an.content_id = a.id
                          ${isResolution ? '' : "AND (an.annexure_type IS NULL OR an.annexure_type != 'resolution')"}
                    ),
                    '[]'
                ) AS annexures
            FROM agenda a
            LEFT JOIN categories c ON c.id = a.category_id
            WHERE a.meeting_id = $1
            ORDER BY a.is_suppli ASC, a.agenda_serial ASC
        `;

        // These queries are independent, so run them in parallel.
        const [meetingResult, presenteesResult, agendasResult] = await Promise.all([
            pool.query(meetingQuery, [meetingId]),
            pool.query(presenteesQuery, [meetingId]),
            pool.query(agendasQuery, [meetingId])
        ]);

        if (meetingResult.rows.length === 0) throw new Error("Meeting not found");
        const meeting = meetingResult.rows[0];
        const presentees = presenteesResult.rows;
        const agendas = agendasResult.rows;

        // Serve a cached PDF when the underlying data is unchanged.
        const cacheType = cacheVariant || (isResolution ? 'resolution' : 'agenda');
        const cacheKey = pdfCacheKey(meetingId, cacheType);
        const fingerprint = computeFingerprint({
            type: cacheType,
            meeting: { title: meeting.title, meeting_date: meeting.meeting_date, description: meeting.description, agenda_prefix: meeting.agenda_prefix },
            presentees: stableRows(presentees),
            agendas: stableRows(agendas)
        });
        const cached = await getCachedPdf(cacheKey, fingerprint);
        if (cached) return cached;

        const topLeadership = [];
        const deans = [];
        const heads = [];
        const depts = {};
        const others = [];

        // Guards against invisible Unicode mismatches (e.g. differently-composed
        // Bengali conjuncts/vowel signs from DB entry vs. source-code literals)
        // that make .includes() silently fail on visually-identical text.
        const normalize = (str) => (str || '').normalize('NFC').trim();

        // Short label used when noting a dean/head's office inline within the dept-wise list
        const getShortOfficeLabel = (officeStr) => {
            const o = normalize(officeStr);
            if (!o) return null;
            if (o.includes(normalize('উপাচার্য'))) return 'উপাচার্য';
            if (o.includes(normalize('ডিন')) || o.includes(normalize('ডীন'))) return 'ডিন';
            if (o.includes(normalize('বিভাগীয় প্রধান'))) return 'বিভাগীয় প্রধান';
            return o;
        };

        presentees.forEach(p => {
            let extractedName = p.name;
            let officeStr = normalize(p.office_name || '');
            let desStr = normalize(p.designation || '');
            if (!extractedName && officeStr.includes(',')) {
                const parts = officeStr.split(',');
                extractedName = parts[0].trim();
                officeStr = parts.slice(1).join(',').trim();
            }
            if (!extractedName) extractedName = 'Unknown';

            const departmentName = normalize(p.department_name || '');
            const pObj = { name: extractedName, office: officeStr, designation: p.designation, department: departmentName, serial: p.serial };

            const combinedText = `${officeStr} ${desStr} ${normalize(p.name || '')}`;

            const isVc = (combinedText.includes(normalize('উপাচার্য')) || combinedText.toLowerCase().includes('vice chancellor') || combinedText.toLowerCase().includes('vc'))
                && !combinedText.includes(normalize('উপ-উপাচার্য'))
                && !combinedText.includes(normalize('উপউপাচার্য'))
                && !combinedText.toLowerCase().includes('pro-vc')
                && !combinedText.toLowerCase().includes('pro vc');

            const isProVc = combinedText.includes(normalize('উপ-উপাচার্য'))
                || combinedText.includes(normalize('উপউপাচার্য'))
                || combinedText.toLowerCase().includes('pro-vc')
                || combinedText.toLowerCase().includes('pro vc');

            let classified = false;

            if (isVc || isProVc) {
                topLeadership.push({ ...pObj, isVc, isProVc });
                classified = true;
            } else if (officeStr.includes(normalize('ডিন')) || officeStr.includes(normalize('ডীন')) || desStr.includes(normalize('ডিন')) || desStr.includes(normalize('ডীন'))) {
                deans.push({ ...pObj, extraLabel: officeStr || desStr || null });
                classified = true;
            } else if (officeStr.includes(normalize('বিভাগীয় প্রধান')) || desStr.includes(normalize('বিভাগীয় প্রধান'))) {
                heads.push({ ...pObj, extraLabel: departmentName || null });
                classified = true;
            }

            if (!classified) {
                if (p.department_name) {
                    if (!depts[p.department_name]) depts[p.department_name] = { serial: p.department_serial, members: [] };
                    depts[p.department_name].members.push(pObj);
                } else {
                    others.push(pObj);
                }
            }
        });

        const bySerial = (a, b) => (a.serial ?? Infinity) - (b.serial ?? Infinity);
        topLeadership.sort((a, b) => {
            if (a.isVc && !b.isVc) return -1;
            if (!a.isVc && b.isVc) return 1;
            if (a.isProVc && !b.isProVc) return -1;
            if (!a.isProVc && b.isProVc) return 1;
            return bySerial(a, b);
        });
        deans.sort(bySerial);
        heads.sort(bySerial);
        others.sort(bySerial);
        Object.values(depts).forEach(dept => dept.members.sort(bySerial));

        const fontBase64 = FONT_BASE64;
        const fontFace = fontBase64 ? `@font-face { font-family: 'PrimaryFont'; src: url(${fontBase64}) format('truetype'); }` : '';

        const getSuffix = (item) => {
            const office = normalize(item.office || '');
            const des = normalize(item.designation || '');
            const isVc = item.isVc || office === 'উপাচার্য' || (office.includes('উপাচার্য') && !office.includes('উপ-উপাচার্য') && !office.includes('উপউপাচার্য')) || (des.includes('উপাচার্য') && !des.includes('উপ-উপাচার্য'));
            if (isVc) {
                return 'সভাপতি';
            }
            return 'সদস্য';
        };

        const formatMeetingSerial = (rawTitle) => {
            if (!rawTitle) return '';
            let str = String(rawTitle).trim();
            str = str.replace(/^(meeting\s*|councel\s*|council\s*)/i, '')
                .replace(/^(\d+)(st|nd|rd|th)$/i, '$1')
                .trim();
            return toBanglaDigits(str);
        };

        const getDisplayName = (item, isOthers = false, isLeadership = false) => {
            let displayName = item.name;
            if (isLeadership) {
                let titleStr = item.office || item.designation || '';
                if (item.isVc && !titleStr.includes('উপাচার্য')) titleStr = 'উপাচার্য';
                if (item.isProVc && !titleStr.includes('উপ-উপাচার্য')) titleStr = 'উপ-উপাচার্য';

                const isVcOrProVc = item.isVc || item.isProVc || (titleStr && (titleStr.includes('উপাচার্য') || titleStr.includes('উপ-উপাচার্য') || titleStr.includes('উপউপাচার্য')));

                if (isVcOrProVc) {
                    displayName = `${displayName},`;
                    let titleClean = titleStr ? titleStr.replace(/,\s*ঢাকা$/i, '').trim() : '';
                    if (titleClean && !titleClean.includes('বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়')) {
                        titleClean += ', বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়';
                    }
                    if (titleClean && titleClean !== 'Unknown') {
                        displayName += `<br/>${titleClean}`;
                    }
                } else if (titleStr && titleStr !== 'Unknown') {
                    displayName = `${displayName}, <br/>${titleStr}`;
                }
            } else if (isOthers) {
                const details = [];
                if (item.designation) details.push(item.designation);
                if (item.department && item.department !== 'Unknown') details.push(item.department);
                if (item.office && item.office !== 'Unknown' && item.office !== item.department) details.push(item.office);
                if (details.length > 0) {
                    displayName = `${displayName}, <br/>${details.join(', ')}`;
                }
            } else {
                if (item.designation && normalize(item.designation).includes(normalize('সহযোগী অধ্যাপক')) && !normalize(displayName).startsWith(normalize('অধ্যাপক'))) {
                    displayName = `${displayName}, <br/>সহযোগী অধ্যাপক`;
                }
            }
            if (item.extraLabel && !isLeadership) {
                displayName = `${displayName} (${item.extraLabel})`;
            }
            return displayName;
        };

        const renderSection = (title, items, isOthers = false, isLeadership = false) => {
            if (!items || items.length === 0) return '';
            let html = `<div class="presentee-section">`;
            if (title) {
                html += `<div class="section-title"><u>${title}</u></div>`;
            }
            items.forEach(item => {
                html += `<div class="presentee-row">
                    <div class="p-name">${getDisplayName(item, isOthers, isLeadership)}</div>
                    <div class="p-suffix">${getSuffix(item)}</div>
                </div>`;
            });
            html += `</div>`;
            return html;
        };

        const meetingDate = toBanglaDigits(new Date(meeting.meeting_date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }));
        const serialNo = formatMeetingSerial(meeting.title || 'Untitled');
        const meetingSerialLabel = (serialNo.includes('সভা') || serialNo.includes('কাউন্সিল')) ? serialNo : `${serialNo}নং সভার`;

        // Agenda (pre-meeting notice) and resolution (post-meeting minutes) are
        // different documents, not the same content with an extra line: they
        // carry different titles and tense ("to be held" vs "held").
        const docLabel = cacheVariant === 'suppli-agenda' ? 'সম্পূরক আলোচ্যসূচি' : (cacheVariant === 'resolution-status' ? 'সিদ্ধান্ত বাস্তবায়ন অবস্থা' : (isResolution ? 'কার্যবিবরণী' : 'আলোচ্যসূচি'));
        const dateVerb = isResolution ? 'অনুষ্ঠিত' : 'অনুষ্ঠিতব্য';

        // Build council label based on meeting type
        const typeStr = (meeting.type || '').toLowerCase();
        const isSyndicate = typeStr === 'syndicate' || typeStr.includes('syndicate');
        const councilLabel = isSyndicate ? 'সিন্ডিকেটের' : 'একাডেমিক কাউন্সিলের';

        // Supplementary agenda items (is_suppli) are printed after the main
        // agenda/resolution items under their own heading, never interleaved.
        const mainAgendas = agendas.filter(ag => !ag.is_suppli);
        const suppliAgendas = agendas.filter(ag => ag.is_suppli);

        const renderAgendaBlock = (ag) => {
            const cleanContent = (ag.content || '').replace(/<[^>]*>/g, '').trim();
            const isBibidha = !ag.is_suppli && (ag.agenda_serial === 0 || cleanContent.startsWith('বিবিধ'));
            let displayContent = ag.content || '';
            if (isBibidha) {
                displayContent = displayContent.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*বিবিধ\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]*\s*[০-৯\d]*)?\s*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
            }
            const isOnlyBibidhaTitle = isBibidha && !displayContent.replace(/<[^>]*>/g, '').trim();
            if (isResolution && isBibidha && isOnlyBibidhaTitle && !ag.resolution) {
                return '';
            }

            return `
            <div class="agenda-block">
                <div class="agenda-title">${isBibidha ? 'বিবিধ :' : 'প্রস্তাবনা নং ' + (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + toBanglaDigits(ag.agenda_serial)}</div>
                <div class="agenda-content">${ag.content || ''}</div>
                ${isResolution ? `
                <div class="agenda-title" style="margin-top:15px;">সিদ্ধান্ত:</div>
                <div class="agenda-resolution">${stripResolutionPrefix(ag.resolution || '')}</div>
                ` : ''}
            </div>
            `;
        };

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                ${fontFace}
                body {
                    font-family: 'PrimaryFont', sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    margin: 0;
                    padding: 0;
                }
                .text-center { text-align: center; }
                .header-title { font-size: 19px; margin-bottom: 10px; }
                .sub-title { font-size: 16px; text-decoration: underline; margin-bottom: 20px; }
                .description { font-size: 14px; text-align: justify; margin-bottom: 30px; }
                .presentees-header { font-size: 14px; text-decoration: underline; margin-bottom: 15px; }
                .columns-container {
                    ${presentees.length > 15 ? 'column-count: 2; column-gap: 40px; font-size: 9px;' : 'column-count: 1; font-size: 12px;'}
                    column-fill: auto;
                    margin-bottom: 30px;
                }
                .presentee-section {
                    margin-bottom: 15px;
                }
                .section-title {
                    font-weight: bold;
                    margin-bottom: 5px;
                    break-inside: avoid;
                    break-after: avoid;
                }
                .presentee-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                    break-inside: avoid;
                }
                .p-name { width: 75%; text-align: left; }
                .p-suffix { width: 25%; text-align: right; }
                .disclaimer { text-align: center; margin-top: 20px; margin-bottom: 40px; font-size: 14px; }

                .category-header {
                    font-weight: bold;
                    font-size: 15px;
                    margin-top: 25px;
                    margin-bottom: 15px;
                    break-after: avoid;
                    page-break-after: avoid;
                }
                .agenda-block {
                    page-break-inside: avoid;
                    margin-bottom: 30px;
                }
                .agenda-title { font-weight: bold; margin-bottom: 5px; font-size: 14px;}
                .agenda-content, .agenda-resolution { margin-left: 30px; text-align: justify; font-size: 14px;}
                .agenda-resolution { font-weight: bold; }

                table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
                table, th, td { border: 1px solid black; }
                th, td { padding: 4px; text-align: left; }
                p { margin: 0 0 10px 0; }
            </style>
        </head>
        <body>
            ${cacheVariant === 'suppli-agenda' ? `
            <div class="text-center sub-title">${meetingDate} তারিখে অনুষ্ঠিতব্য ${councilLabel} ${serialNo}তম সভার সাপ্লিমেন্টারী আলোচ্যসূচী।</div>
            ` : `
            <div class="text-center header-title">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়, ঢাকা</div>
            <div class="text-center sub-title">${meetingDate} তারিখে ${dateVerb} ${meetingSerialLabel} ${docLabel}</div>
            `}

            ${cacheVariant === 'resolution-status' ? `
                ${meeting.description ? `<div class="description">${meeting.description}</div>` : ''}
            ` : (isResolution ? `
                ${meeting.description ? `<div class="description">${meeting.description}</div>` : ''}

                <div class="presentees-header">উপস্থিত সদস্যবৃন্দ</div>
                <div class="columns-container">
                    ${renderSection(null, topLeadership, false, true)}
                    ${renderSection('সকল ডিন', deans)}
                    ${renderSection('সকল বিভাগীয় প্রধান', heads)}
                    ${Object.entries(depts)
                    .sort(([, a], [, b]) => (a.serial ?? Infinity) - (b.serial ?? Infinity))
                    .map(([deptName, dept]) => renderSection(deptName, dept.members)).join('')}
                    ${renderSection('অন্যান্য সদস্য', others, true)}
                </div>
            ` : '')}

            ${(() => {
                const BANGLA_GROUP_LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ', 'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ'];

                const filterOutEmptyBibidha = (ag) => {
                    if (!ag.is_suppli) {
                        const clean = (ag.content || '').replace(/<[^>]*>/g, '').trim();
                        const isBibidha = ag.agenda_serial === 0 || clean.startsWith('বিবিধ');
                        if (isBibidha) {
                            const hasResolution = ag.resolution && ag.resolution.replace(/<[^>]*>/g, '').trim().length > 0;
                            const strippedText = clean.replace(/^\s*বিবিধ\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]*\s*[০-৯\d]*)?\s*[:.\-]?\s*/i, '').trim();
                            const hasContent = strippedText.length > 0;
                            return hasResolution || hasContent;
                        }
                    }
                    return true;
                };

                const targetAgendas = (cacheVariant === 'suppli-agenda'
                    ? agendas.filter(ag => ag.is_suppli)
                    : agendas.filter(ag => !ag.is_suppli && filterOutEmptyBibidha(ag))
                );

                const mainAgendaCount = agendas.filter(a => {
                    if (a.is_suppli) return false;
                    const clean = (a.content || '').replace(/<[^>]*>/g, '').trim();
                    return !clean.startsWith('বিবিধ');
                }).length;
                const serialWidth = getSerialWidth(agendas.length);

                // Precompute Category Header for grouped agendas
                const categoryHeaderMap = new Map();
                let currentCatId = null;
                let groupAgendas = [];
                let groupCount = 0;

                const processGroup = () => {
                    if (groupAgendas.length > 0 && currentCatId) {
                        const letter = BANGLA_GROUP_LETTERS[groupCount % BANGLA_GROUP_LETTERS.length];
                        const catName = groupAgendas[0].category_name;
                        const firstAg = groupAgendas[0];
                        const lastAg = groupAgendas[groupAgendas.length - 1];

                        const firstAgSerialStr = firstAg.is_suppli
                            ? toBanglaDigits(mainAgendaCount + (firstAg.agenda_serial || 1), serialWidth)
                            : toBanglaDigits(firstAg.agenda_serial, serialWidth);
                        const lastAgSerialStr = lastAg.is_suppli
                            ? toBanglaDigits(mainAgendaCount + (lastAg.agenda_serial || 1), serialWidth)
                            : toBanglaDigits(lastAg.agenda_serial, serialWidth);

                        const firstFull = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + firstAgSerialStr;
                        const lastFull = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + lastAgSerialStr;

                        const rangeText = firstFull === lastFull
                            ? `${firstFull}`
                            : `${firstFull} হতে ${lastFull}`;

                        const headerStr = `'${letter}' গ্রুপ (প্রস্তাবনা নং ${rangeText}): ${catName}`;
                        categoryHeaderMap.set(firstAg.id, headerStr);
                        groupCount++;
                    }
                    groupAgendas = [];
                };

                targetAgendas.forEach((ag) => {
                    const cleanContent = (ag.content || '').replace(/<[^>]*>/g, '').trim();
                    const isBibidha = !ag.is_suppli && cleanContent.startsWith('বিবিধ');
                    const catName = ag.category_name ? String(ag.category_name).trim() : '';
                    const isUncategorized = !catName || /^(uncategorized|un-categorized|অশ্রেণীভুক্ত|অশ্রেণিভুক্ত)$/i.test(catName);

                    if (isBibidha || !ag.category_id || isUncategorized) {
                        processGroup();
                        currentCatId = null;
                    } else {
                        if (ag.category_id !== currentCatId) {
                            processGroup();
                            currentCatId = ag.category_id;
                        }
                        groupAgendas.push(ag);
                    }
                });
                processGroup();

                if (cacheVariant === 'resolution-status') {
                    let tableRows = '';
                    targetAgendas.forEach(ag => {
                        const agSerialStr = ag.is_suppli
                            ? toBanglaDigits(mainAgendaCount + (ag.agenda_serial || 1), serialWidth)
                            : toBanglaDigits(ag.agenda_serial, serialWidth);

                        const cleanContent = (ag.content || '').replace(/<[^>]*>/g, '').trim();
                        const isBibidha = !ag.is_suppli && cleanContent.startsWith('বিবিধ');
                        const strippedText = cleanContent.replace(/^\s*বিবিধ\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]*\s*[০-৯\d]*)?\s*[:.\-]?\s*/i, '').trim();
                        const isOnlyBibidhaTitle = isBibidha && !strippedText;
                        const bibidhaSerial = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + toBanglaDigits(mainAgendaCount + 1, serialWidth);
                        const fullSerial = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + agSerialStr;
                        const titleStr = isBibidha ? (isOnlyBibidhaTitle ? `বিবিধ : ${bibidhaSerial}` : `বিবিধ :`) : `প্রস্তাবনা নং ${fullSerial}`;

                        const validAnnexures = (Array.isArray(ag.annexures) ? ag.annexures : [])
                            .filter(an => !an.is_excluded_in_resolution)
                            .sort((a, b) => (a.global_serial || a.annexure_serial) - (b.global_serial || b.annexure_serial));
                        const annexureTags = validAnnexures.length > 0
                            ? validAnnexures.map((an) => {
                                const num = an.global_serial || an.annexure_serial;
                                return `পরিশিষ্ট-${toBanglaDigits(num)}`;
                            }).join(', ')
                            : null;

                        let contentHtml = isOnlyBibidhaTitle ? '' : convertMarkdownTablesToHtml(ag.content || '');
                        if (isBibidha) {
                            contentHtml = contentHtml.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*বিবিধ\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]*\s*[০-৯\d]*)?\s*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
                        } else if (contentHtml) {
                            contentHtml = contentHtml.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*প্রস্তাব(?:না)?\s*নং\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]+\s*)*[০-৯\d\s\/\-]*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
                            contentHtml = contentHtml.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*[০-৯\d]+\s*[:.\-]\s*(?:<\/strong>)?\s*/i, '$1');
                        }
                        if (annexureTags) {
                            const tagString = ` <b>(${annexureTags})</b>`;
                            if (contentHtml.trim().endsWith('</p>')) {
                                const lastIndex = contentHtml.lastIndexOf('</p>');
                                contentHtml = contentHtml.substring(0, lastIndex) + tagString + contentHtml.substring(lastIndex);
                            } else if (contentHtml) {
                                contentHtml += tagString;
                            } else {
                                contentHtml = `<p><b>(${annexureTags})</b></p>`;
                            }
                        }

                        const catHeader = categoryHeaderMap.get(ag.id);
                        if (catHeader) {
                            tableRows += `
                            <tr>
                                <td colspan="4" style="border: 1px solid #000; padding: 8px; background-color: #e5e7eb; font-weight: bold; font-size: 14px;">
                                    <b>${catHeader}</b>
                                </td>
                            </tr>`;
                        }

                        const cleanExecText = ag.execution_status ? ag.execution_status.replace(/<[^>]*>/g, '').trim() : '';
                        let statusColHtml = '';
                        if (cleanExecText.length > 0) {
                            statusColHtml = convertMarkdownTablesToHtml(ag.execution_status);
                        } else {
                            const isExec = ag.is_executed === 'yes' || ag.is_executed === true;
                            statusColHtml = isExec ? 'বাস্তবায়িত' : 'অবাস্তবায়িত';
                        }

                        tableRows += `
                        <tr style="page-break-inside: avoid;">
                            <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-weight: bold; text-align: center; width: 12%;">${titleStr}</td>
                            <td style="border: 1px solid #000; padding: 8px; vertical-align: top; width: 38%;">${contentHtml}</td>
                            <td style="border: 1px solid #000; padding: 8px; vertical-align: top; width: 35%;">${convertMarkdownTablesToHtml(ag.resolution || '')}</td>
                            <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center; width: 15%;">${statusColHtml}</td>
                        </tr>`;
                    });

                    return `
                    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 13px; border: 1px solid #000; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f2f4f7;">
                                <th style="border: 1px solid #000; padding: 8px; width: 12%; text-align: center; font-weight: bold;">প্রস্তাবনা নং</th>
                                <th style="border: 1px solid #000; padding: 8px; width: 38%; text-align: center; font-weight: bold;">আলোচ্যসূচি</th>
                                <th style="border: 1px solid #000; padding: 8px; width: 35%; text-align: center; font-weight: bold;">সিদ্ধান্ত</th>
                                <th style="border: 1px solid #000; padding: 8px; width: 15%; text-align: center; font-weight: bold;">বাস্তবায়ন অবস্থা</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>`;
                }

                return targetAgendas.map(ag => {
                    const agSerialStr = ag.is_suppli
                        ? toBanglaDigits(mainAgendaCount + (ag.agenda_serial || 1), serialWidth)
                        : toBanglaDigits(ag.agenda_serial, serialWidth);

                    const cleanContent = (ag.content || '').replace(/<[^>]*>/g, '').trim();
                    const isBibidha = !ag.is_suppli && cleanContent.startsWith('বিবিধ');
                    const strippedText = cleanContent.replace(/^\s*বিবিধ\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]*\s*[০-৯\d]*)?\s*[:.\-]?\s*/i, '').trim();
                    const isOnlyBibidhaTitle = isBibidha && !strippedText;
                    const bibidhaSerial = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + toBanglaDigits(mainAgendaCount + 1, serialWidth);
                    const fullSerial = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + agSerialStr;
                    const titleStr = isBibidha ? (isOnlyBibidhaTitle ? `বিবিধ : ${bibidhaSerial}` : `বিবিধ :`) : `প্রস্তাবনা নং ${fullSerial}`;

                    const validAnnexures = (Array.isArray(ag.annexures) ? ag.annexures : [])
                        .filter(an => isResolution ? !an.is_excluded_in_resolution : (an.annexure_type !== 'resolution'))
                        .sort((a, b) => (a.global_serial || a.annexure_serial) - (b.global_serial || b.annexure_serial));
                    const annexureTags = validAnnexures.length > 0
                        ? validAnnexures.map((an) => {
                            const num = an.global_serial || an.annexure_serial;
                            const prefix = (!isResolution && an.is_suppli) ? 'সাপ্লি: পরিশিষ্ট-' : 'পরিশিষ্ট-';
                            return `${prefix}${toBanglaDigits(num)}`;
                        }).join(', ')
                        : null;

                    let contentHtml = isOnlyBibidhaTitle ? '' : convertMarkdownTablesToHtml(ag.content || '');
                    if (isBibidha) {
                        contentHtml = contentHtml.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*বিবিধ\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]*\s*[০-৯\d]*)?\s*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
                    } else if (contentHtml) {
                        contentHtml = contentHtml.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*প্রস্তাব(?:না)?\s*নং\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]+\s*)*[০-৯\d\s\/\-]*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
                        contentHtml = contentHtml.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*[০-৯\d]+\s*[:.\-]\s*(?:<\/strong>)?\s*/i, '$1');
                    }
                    if (annexureTags) {
                        const tagString = ` <b>(${annexureTags})</b>`;
                        if (contentHtml.trim().endsWith('</p>')) {
                            const lastIndex = contentHtml.lastIndexOf('</p>');
                            contentHtml = contentHtml.substring(0, lastIndex) + tagString + contentHtml.substring(lastIndex);
                        } else if (contentHtml) {
                            contentHtml += tagString;
                        } else {
                            contentHtml = `<p><b>(${annexureTags})</b></p>`;
                        }
                    }

                    const catHeader = categoryHeaderMap.get(ag.id);

                    return `
                    ${catHeader ? `<div class="category-header"><b>${catHeader}</b></div>` : ''}
                    <div class="agenda-block">
                        <div class="agenda-title">${titleStr}</div>
                        ${contentHtml ? `<div class="agenda-content">${contentHtml}</div>` : ''}
                        ${isResolution ? `
                        <div class="agenda-title" style="margin-top:15px;">সিদ্ধান্ত:</div>
                        <div class="agenda-resolution">${convertMarkdownTablesToHtml(ag.resolution || '')}</div>
                        ` : ''}
                    </div>
                    `;
                }).join('');
            })()}
        </body>
        </html>
        `;

        const pdfBuffer = await renderPdf(html);
        // Cache for future requests (best-effort; keyed by the content fingerprint).
        await storeCachedPdf(cacheKey, pdfBuffer, fingerprint);
        try {
            const pdfType = cacheVariant || (isResolution ? 'resolution' : 'agenda');
            await meetingFileSystem.saveMeetingPdf(meetingId, pdfType, pdfBuffer);
        } catch (e) {
            console.error('Error saving meeting PDF to filesystem:', e);
        }
        return pdfBuffer;

    } catch (error) {
        throw error;
    }
};

const generateAttendanceSheet = async (meetingId, groupFilter = null) => {
    try {
        const meetingQuery = `SELECT title FROM meetings WHERE id = $1`;
        const presenteesQuery = `
            SELECT p.id, p.name, p.designation, p.serial, d.name_bangla as department_name, d.serial as department_serial, o.name_bangla as office_name
            FROM invitees p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN offices o ON p.office_id = o.id
            WHERE p.meeting_id = $1
        `;

        // These queries are independent, so run them in parallel.
        const [meetingResult, presenteesResult] = await Promise.all([
            pool.query(meetingQuery, [meetingId]),
            pool.query(presenteesQuery, [meetingId])
        ]);

        if (meetingResult.rows.length === 0) throw new Error("Meeting not found");
        const meeting = meetingResult.rows[0];
        const presentees = presenteesResult.rows;

        // Serve a cached PDF when the underlying data is unchanged.
        const cacheKey = groupFilter
            ? pdfCacheKey(meetingId, `attendance-${groupFilter}`)
            : pdfCacheKey(meetingId, 'attendance');
        const fingerprint = computeFingerprint({
            type: 'attendance',
            group: groupFilter,
            meeting: { title: meeting.title },
            invitees: stableRows(presentees)
        });
        const cached = await getCachedPdf(cacheKey, fingerprint);
        if (cached) return cached;

        const admins = [];
        const deans = [];
        const heads = [];
        const depts = {};
        const others = [];

        presentees.forEach(p => {
            let extractedName = p.name;
            let officeStr = p.office_name || '';
            if (!extractedName && officeStr.includes(',')) {
                const parts = officeStr.split(',');
                extractedName = parts[0].trim();
                officeStr = parts.slice(1).join(',').trim();
            }
            if (!extractedName) extractedName = 'Unknown';

            // Collect full details for display
            let details = [];
            if (p.designation) details.push(p.designation);
            if (p.department_name) details.push(p.department_name);
            if (officeStr) details.push(officeStr);
            const detailStr = details.length > 0 ? `(${details.join(', ')})` : '';

            const pObj = {
                name: extractedName,
                office: officeStr,
                designation: p.designation,
                detailStr: detailStr,
                serial: p.serial
            };

            const des = (p.designation || '').toLowerCase();
            const office = officeStr.toLowerCase();

            const isVC = (des.includes('উপাচার্য') || office.includes('উপাচার্য'))
                && !(des.includes('উপ-উপাচার্য') || office.includes('উপ-উপাচার্য'));
            const isProVC = des.includes('উপ-উপাচার্য') || office.includes('উপ-উপাচার্য');
            const isDean = office.includes('ডিন') || office.includes('dean') || des.includes('ডিন') || des.includes('dean');
            const isHead = office.includes('বিভাগীয় প্রধান');

            if (isVC) {
                admins.unshift(pObj);
            } else if (isProVC) {
                admins.push(pObj);
            } else if (isDean) {
                deans.push(pObj);
            } else if (isHead) {
                heads.push(pObj);
            } else if (p.department_name) {
                if (!depts[p.department_name]) depts[p.department_name] = { serial: p.department_serial ?? 9999, members: [] };
                depts[p.department_name].members.push(pObj);
            } else {
                others.push(pObj);
            }
        });

        const bySerial = (a, b) => (a.serial ?? Infinity) - (b.serial ?? Infinity);
        deans.sort(bySerial);
        heads.sort(bySerial);
        others.sort(bySerial);
        Object.values(depts).forEach(dept => dept.members.sort(bySerial));

        const fontBase64 = FONT_BASE64;
        const fontFace = fontBase64 ? `@font-face { font-family: 'PrimaryFont'; src: url(${fontBase64}) format('truetype'); }` : '';

        const formatMeetingSerial = (rawTitle) => {
            if (!rawTitle) return '';
            let str = String(rawTitle).trim();
            str = str.replace(/^(meeting\s*|councel\s*|council\s*)/i, '')
                .replace(/^(\d+)(st|nd|rd|th)$/i, '$1')
                .trim();
            return toBanglaDigits(str);
        };

        const serialNo = formatMeetingSerial(meeting.title || 'Untitled');
        const attendanceSubTitle = (serialNo.includes('সভা') || serialNo.includes('কাউন্সিল')) ? serialNo : `${serialNo}নং সভার উপস্থিতি পত্র`;

        const renderTableSection = (title, items) => {
            if (!items || items.length === 0) return '';
            let html = `
                <div class="attendance-page">
                    <div class="section-title">${title}</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 70%;">নাম (পদবী, বিভাগ, অফিস)</th>
                                <th style="width: 30%;">স্বাক্ষর</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            items.forEach(item => {
                html += `
                    <tr>
                        <td>
                            <strong>${item.name}</strong><br/>
                            <span style="font-size: 12px; color: #333;">${item.detailStr}</span>
                        </td>
                        <td></td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
            return html;
        };

        const sortedDepts = Object.entries(depts)
            .sort(([, a], [, b]) => (a.serial ?? Infinity) - (b.serial ?? Infinity));

        const buildAllSections = () => {
            let s = '';
            s += renderTableSection('প্রশাসন', admins);
            s += renderTableSection('সকল ডিন', deans);
            s += renderTableSection('সকল বিভাগীয় প্রধান', heads);
            sortedDepts.forEach(([deptName, dept]) => {
                s += renderTableSection(deptName, dept.members);
            });
            s += renderTableSection('অন্যান্য সদস্য', others);
            return s;
        };

        const buildSingleGroupSections = (filter) => {
            let s = '';
            if (filter === 'admins') s += renderTableSection('প্রশাসন', admins);
            else if (filter === 'deans') s += renderTableSection('সকল ডিন', deans);
            else if (filter === 'heads') s += renderTableSection('সকল বিভাগীয় প্রধান', heads);
            else if (filter === 'others') s += renderTableSection('অন্যান্য সদস্য', others);
            else if (filter.startsWith('dept:')) {
                const deptName = filter.replace('dept:', '');
                const dept = depts[deptName];
                if (dept) s += renderTableSection(deptName, dept.members);
            }
            return s;
        };

        const sections = groupFilter ? buildSingleGroupSections(groupFilter) : buildAllSections();

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                ${fontFace}
                body {
                    font-family: 'PrimaryFont', sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    margin: 0;
                    padding: 0;
                }
                .text-center { text-align: center; }
                .header-title { font-size: 19px; margin-bottom: 10px; font-weight: bold; }
                .sub-title { font-size: 16px; margin-bottom: 20px; }
                
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-top: 10px;
                    margin-bottom: 10px;
                    text-decoration: underline;
                }
                
                .attendance-page {
                    page-break-after: always;
                }
                .attendance-page:last-child {
                    page-break-after: avoid;
                }

                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                table, th, td { border: 1px solid black; }
                th, td { padding: 8px; text-align: left; vertical-align: middle; }
                td { height: 40px; } /* Space for signature */
            </style>
        </head>
        <body>
            <div class="text-center header-title">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়, ঢাকা</div>
            <div class="text-center sub-title">${attendanceSubTitle}</div>
            ${sections}
        </body>
        </html>
        `;

        const pdfBuffer = await renderPdf(html);
        // Cache for future requests (best-effort; keyed by the content fingerprint).
        await storeCachedPdf(cacheKey, pdfBuffer, fingerprint);
        return pdfBuffer;

    } catch (error) {
        throw error;
    }
};

// ---------------------------------------------------------------------------
// Notice PDF generation
// ---------------------------------------------------------------------------

const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

const formatNoticeDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    return `${toBanglaDigits(day)} ${months[month]} ${toBanglaDigits(year)}`;
};

const formatNoticeDateShort = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${toBanglaDigits(day)}-${toBanglaDigits(String(month).padStart(2, '0'))}-${toBanglaDigits(year)}`;
};

const getNoticeDayName = (dateStr) => {
    const d = new Date(dateStr);
    return BANGLA_DAYS[d.getDay()];
};

const generateNoticePdf = async (notice, presentees) => {
    const meetingType = (notice.meeting_type || '').toLowerCase();
    const isSyndicate = meetingType === 'syndicate';
    const isRegular = notice.is_regular !== false;
    const noticeType = notice.notice_type;
    const meetingStatus = notice.meeting_status || 'draft';
    const isImmediate = !isRegular;

    const serialNo = (notice.meeting_title || '').includes('সভা')
        ? toBanglaDigits(notice.meeting_title)
        : toBanglaDigits(notice.meeting_title || notice.meeting_title || 'Untitled');

    const meetingDate = notice.meeting_date;
    const dateStr = formatNoticeDate(meetingDate);
    const dateShort = formatNoticeDateShort(meetingDate);
    const dayName = getNoticeDayName(meetingDate);

    const meetingUrl = `${process.env.PRODUCTION_DOMAIN || 'http://localhost:9001'}/meetings/${notice.meeting_id}`;

    // Build body based on type
    let bodyHtml = '';
    if (notice.body) {
        bodyHtml = notice.body;
    } else {
        bodyHtml = generateDefaultBody(noticeType, isSyndicate, isImmediate, dateStr, dateShort, dayName, serialNo, meetingUrl, notice);
    }

    // Signature
    const signatureText = notice.signature_text || '';

    // Members list for syndicate
    let membersHtml = '';
    if (isSyndicate && presentees && presentees.length > 0) {
        membersHtml = renderNoticeMembers(presentees);
    }

    // Salutation address based on type
    const addressHtml = isSyndicate
        ? `<p>সিন্ডিকেটের সম্মানিত সদস্য<br/>বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়<br/>ঢাকা-১০০০ ।</p>`
        : `<p>একাডেমিক কাউন্সিলের সম্মানিত সদস্য<br/>বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়<br/>ঢাকা-১০০০ ।</p>`;

    // Secretary label based on type
    const secretaryLabel = isSyndicate ? 'সিন্ডিকেটের সচিব।' : 'একাডেমিক কাউন্সিলের সচিব।';

    const fontBase64 = FONT_BASE64;
    const fontFace = fontBase64 ? `@font-face { font-family: 'PrimaryFont'; src: url(${fontBase64}) format('truetype'); }` : '';

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            ${fontFace}
            body {
                font-family: 'PrimaryFont', sans-serif;
                font-size: 14px;
                line-height: 1.6;
                margin: 0;
                padding: 40px 50px;
            }
            .header-title {
                font-size: 21px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 30px;
            }
            .notice-meta {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                font-size: 14px;
            }
            .notice-body {
                margin-left: 20px;
            }
            .notice-body p {
                margin: 0 0 12px 0;
                text-align: justify;
            }
            .signature-section {
                text-align: right;
                margin-top: 30px;
                margin-bottom: 10px;
            }
            .signature-label {
                margin-bottom: 5px;
            }
            .signature-space {
                height: 40px;
            }
            .signature-text {
                font-size: 13px;
                line-height: 1.4;
                white-space: pre-line;
            }
            .secretary-label {
                margin-top: 10px;
                font-size: 13px;
            }
            .distribution {
                margin-top: 20px;
                font-size: 13px;
            }
            .distribution-title {
                text-decoration: underline;
                font-weight: bold;
                margin-bottom: 8px;
            }
            .members-container {
                ${presentees && presentees.length > 15 ? 'column-count: 2; column-gap: 30px;' : ''}
                font-size: 12px;
                margin-top: 10px;
            }
            .member-item {
                break-inside: avoid;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
            }
            .member-name {
                width: 75%;
            }
            .member-role {
                width: 25%;
                text-align: right;
            }
            .web-link {
                font-weight: bold;
                margin-top: 10px;
            }
            .zoom-section {
                margin-top: 10px;
            }
            p { margin: 0 0 10px 0; }
        </style>
    </head>
    <body>
        <div class="header-title">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়, ঢাকা</div>

        <div class="notice-meta">
            <span>নম্বর: ${notice.notice_number || ''}</span>
            <span>তারিখ: ${dateStr}</span>
        </div>

        ${addressHtml}

        <p>মহোদয়,</p>

        <div class="notice-body">
            ${bodyHtml}
        </div>

        <div class="signature-section">
            <div class="signature-label">আপনার বিশ্বস্ত,</div>
            <div class="signature-space"></div>
            <div class="signature-text">${signatureText.replace(/\n/g, '<br/>')}</div>
            <div class="secretary-label">এবং<br/>${secretaryLabel}</div>
        </div>

        ${membersHtml}
    </body>
    </html>
    `;

    return await renderPdf(html);
};

function generateDefaultBody(noticeType, isSyndicate, isImmediate, dateStr, dateShort, dayName, serialNo, meetingUrl, notice) {
    const meetingUrlLabel = isSyndicate ? 'Web link for Agenda and Annexure:' : 'Web link for Agenda and Annexure:';
    const resolutionUrlLabel = 'Web link for Resolution:';

    if (isSyndicate) {
        switch (noticeType) {
            case 'invitation':
                return `<p>আগামী ${dateStr} তারিখ ${dayName} বিকাল ৩:০০ ঘটিকায় সিন্ডিকেটের ${serialNo} সভা উপাচার্য মহোদয়ের অফিস কক্ষে অনুষ্ঠিত হবে। উক্ত সিন্ডিকেট সভায় অংশগ্রহণ করার জন্য বিনীতভাবে অনুরোধ করা হলো। সরাসরি উক্ত সিন্ডিকেট সভায় যোগদান করা সম্ভব না হলে ভার্চুয়াল প্ল্যাটফর্মে অংশগ্রহণ করা যাবে।</p>
                <p>এতদসংক্রান্ত আলোচ্যসূচী ও প্রয়োজনীয় তথ্যাদি (সভার আলোচ্যসূচীর ওয়েব লিংক, Zoom Meeting এর ওয়েব লিংক, ID ও Password) শীঘ্রই e-mail এর মাধ্যমে প্রেরণ করা হবে।</p>`;
            case 'agenda':
                return `<p>আগামী ${dateStr} তারিখ ${dayName} বিকাল ৩:০০ ঘটিকায় সিন্ডিকেটের ${serialNo} সভা সরাসরি মাননীয় উপাচার্য মহোদয়ের অফিসে ও ভার্চুয়াল (Hybrid) প্ল্যাটফর্মে অনুষ্ঠিত হবে। উক্ত সভার আলোচ্যসূচীর ওয়েব লিংক, Zoom Meeting এর ওয়েব লিংক, ID ও Password নিম্নে প্রেরণ করা হলো।</p>
                <p class="web-link">• ${meetingUrlLabel}</p>
                <p>${meetingUrl}</p>
                <div class="zoom-section">
                    <p>• Web link for Zoom Meeting :</p>
                    <p>${notice.online_meeting_link || ''}</p>
                    <p>Meeting ID : ${notice.zoom_meeting_id || ''}</p>
                    <p>Password : ${notice.zoom_password || ''}</p>
                </div>`;
            case 'resolution':
                return `<p>গত ${dateShort} তারিখে সরাসরি ও ভার্চুয়াল (Hybrid) প্ল্যাটফর্মে অনুষ্ঠিত সিন্ডিকেটের ${serialNo} সভার কার্যবিবরণী নিম্নোক্ত ওয়েব লিংক-এর মাধ্যমে প্রেরণ করা হলো।</p>
                <p class="web-link">• ${resolutionUrlLabel}</p>
                <p>${meetingUrl}</p>`;
            default:
                return '';
        }
    } else {
        // Academic
        if (isImmediate) {
            switch (noticeType) {
                case 'agenda':
                    return `<p>${dateShort} তারিখে কাউন্সিল ভবনে অনুষ্ঠিত একাডেমিক কাউন্সিলের ${serialNo} জরুরী (Immediate) সভার আলোচ্যসূচী ই-মেইলের মাধ্যমে প্রেরণ করা হলো।</p>`;
                case 'resolution':
                    return `<p>${dateShort} তারিখে কাউন্সিল ভবনে অনুষ্ঠিত একাডেমিক কাউন্সিলের ${serialNo} জরুরী (Immediate) সভার কার্যবিবরণী ই-মেইলের মাধ্যমে প্রেরণ করা হলো।</p>`;
                default:
                    return '';
            }
        } else {
            switch (noticeType) {
                case 'invitation':
                    return `<p>আগামী ${dateStr} তারিখ ${dayName} একাডেমিক কাউন্সিলের ${serialNo} সভা কাউন্সিল ভবনে অনুষ্ঠিত হবে। উক্ত সভায় অংশগ্রহণ করার জন্য বিনীতভাবে অনুরোধ করা হলো।</p>`;
                case 'agenda':
                    return `<p>আগামী ${dateStr} তারিখ ${dayName} একাডেমিক কাউন্সিলের ${serialNo} সভা কাউন্সিল ভবনে অনুষ্ঠিত হবে। উক্ত সভার আলোচ্যসূচীর ওয়েব লিংক নিম্নে প্রেরণ করা হলো।</p>
                    <p class="web-link">• ${meetingUrlLabel}</p>
                    <p>${meetingUrl}</p>`;
                case 'resolution':
                    return `<p>গত ${dateShort} তারিখে কাউন্সিল ভবনে অনুষ্ঠিত একাডেমিক কাউন্সিলের ${serialNo} সভার কার্যবিবরণী নিম্নোক্ত ওয়েব লিংক-এর মাধ্যমে প্রেরণ করা হলো:</p>
                    <p class="web-link">• Web link for Resolution and Annexure:</p>
                    <p>${meetingUrl}</p>`;
                default:
                    return '';
            }
        }
    }
}

function renderNoticeMembers(presentees) {
    if (!presentees || presentees.length === 0) return '';

    const sorted = [...presentees].sort((a, b) => (a.serial ?? Infinity) - (b.serial ?? Infinity));

    const getSuffix = (item) => {
        const office = (item.office_name || '').normalize('NFC').trim();
        if (office.includes('উপাচার্য') && !office.includes('উপ-উপাচার্য') && !office.includes('উপউপাচার্য')) {
            return 'সভাপতি';
        }
        return 'সদস্য';
    };

    let membersHtml = `<div class="distribution">
        <div class="distribution-title">বিতরণ : (জ্যেষ্ঠতার ভিত্তিতে নয়)</div>
        <div class="members-container">`;

    sorted.forEach((m, idx) => {
        let displayName = m.name || '';
        let officeDetail = m.office_name || '';
        if (!displayName && officeDetail) {
            const parts = officeDetail.split(',');
            displayName = parts[0].trim();
            officeDetail = parts.slice(1).join(',').trim();
        }
        if (!displayName) displayName = 'Unknown';
        const details = [];
        if (m.designation) details.push(m.designation);
        if (m.department_name) details.push(m.department_name);
        if (officeDetail) details.push(officeDetail);
        const detailStr = details.length > 0 ? `<br/>${details.join(', ')}` : '';

        membersHtml += `<div class="member-item">
            <div class="member-name">${toBanglaDigits(idx + 1)}. ${displayName}${detailStr}</div>
            <div class="member-role">${getSuffix(m)}</div>
        </div>`;
    });

    membersHtml += `</div></div>`;
    return membersHtml;
}

module.exports = {
    generatePdf,
    generateAttendanceSheet,
    generateNoticePdf,
    warmUp
};
