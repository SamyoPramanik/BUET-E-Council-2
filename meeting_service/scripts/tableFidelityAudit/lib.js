// Shared plumbing for the table fidelity tools: loads the real PDF generator
// (without a database), compiles the editor's real CSS, and launches Chromium.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { pathToFileURL } = require('url');

// pdfGenerator reads this to find the browser; give it (and the audit) the same default.
process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

const REPO = path.resolve(__dirname, '../../..');
const FRONTEND = path.join(REPO, 'frontend');

// pdfGenerator (and what it requires) import ../db, which opens a Postgres pool
// on load. These tools only need HTML processing and rendering, so stub it.
const realLoad = Module._load;
Module._load = function (request, parent, ...rest) {
    if (/(^|\/)db(\.js)?$/.test(request)) {
        const query = async () => ({ rows: [] });
        return { pool: { query, connect: async () => ({ query, release() {} }) }, query };
    }
    return realLoad.call(this, request, parent, ...rest);
};
const pdfGenerator = require('../../utils/pdfGenerator');

// The PDF stylesheet's table rules, straight from the generator's source, so the
// audit always tests what is really shipped.
const pdfTableCss = () => {
    const src = fs.readFileSync(path.join(REPO, 'meeting_service/utils/pdfGenerator.js'), 'utf8');
    const start = src.indexOf('                table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }');
    const endMarker = '                p { margin: 0 0 10px 0; }';
    const end = src.indexOf(endMarker) + endMarker.length;
    if (start < 0 || end < endMarker.length) throw new Error('Could not find the table rules in pdfGenerator.js');
    return src.slice(start, end);
};

// Compile frontend/app/globals.css with the project's own Tailwind setup, so the
// editor side uses exactly the CSS the browser gets (incl. prose-sm table rules).
async function compileEditorCss() {
    const req = Module.createRequire(path.join(FRONTEND, 'package.json'));
    const postcss = req('postcss');
    const mod = await import(pathToFileURL(path.join(FRONTEND, 'node_modules/@tailwindcss/postcss/dist/index.js')).href);
    const cwd = process.cwd();
    process.chdir(FRONTEND);
    try {
        const file = path.join(FRONTEND, 'app/globals.css');
        const out = await postcss([(mod.default || mod)()]).process(fs.readFileSync(file, 'utf8'), { from: file });
        return out.css;
    } finally {
        process.chdir(cwd);
    }
}

async function launchBrowser() {
    const puppeteer = require('puppeteer-core');
    return puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox'],
    });
}

module.exports = { REPO, pdfGenerator, pdfTableCss, compileEditorCss, launchBrowser };
