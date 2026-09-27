const axios = require('axios');

// Sends one mail through the connected Outlook mailbox via Microsoft Graph
// (POST /me/sendMail), using the given delegated access token. `from` is
// the caller-supplied address; since Graph always sends as the signed-in
// mailbox, it's carried as Reply-To rather than the actual From, same as
// the SMTP path in mailer.js.
const sendMailViaGraph = async ({ accessToken, from, to, subject, html, attachments = [] }) => {
    const message = {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        attachments: attachments.map(({ filename, content, contentType }) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: filename,
            contentType,
            contentBytes: content,
        })),
    };

    if (from) {
        message.replyTo = [{ emailAddress: { address: from } }];
    }

    await axios.post(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        { message, saveToSentItems: true },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
};

module.exports = { sendMailViaGraph };
