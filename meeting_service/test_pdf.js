const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

try {
    const doc = new PDFDocument();
    doc.registerFont('Kalpurush', path.join(__dirname, 'utils', 'fonts', 'Kalpurush.ttf'));
    doc.font('Kalpurush');
    doc.text('বাংলাদেশ');
    doc.widthOfString('বাংলাদেশ');
    console.log("SUCCESS");
} catch(e) {
    console.log("ERROR", e.message, e.stack);
}
