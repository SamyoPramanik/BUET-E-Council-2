const PDFDocument = require('pdfkit');

const generateAgendaPdf = async (meetingData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Example content
            doc.fontSize(20).text(`Agenda for Meeting: ${meetingData.title || 'Untitled'}`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Date: ${meetingData.date || 'TBD'}`);
            
            // Add more meeting specific data here
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const generateResolutionPdf = async (meetingId, includeStatus = false) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            doc.fontSize(20).text(includeStatus ? 'Meeting Resolution Status' : 'Meeting Resolution', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Meeting ID: ${meetingId}`);
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const generateAttendanceSheet = async (meetingData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            doc.fontSize(20).text(`Attendance Sheet: ${meetingData.title || 'Untitled'}`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Date: ${meetingData.date || 'TBD'}`);
            doc.moveDown();
            
            // Placeholder for a table or list
            doc.text('1. ______________________');
            doc.moveDown();
            doc.text('2. ______________________');
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generateAgendaPdf,
    generateResolutionPdf,
    generateAttendanceSheet
};
