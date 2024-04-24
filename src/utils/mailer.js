const nodemailer = require("nodemailer");
const transporter = require("../config/transporter");

const sendEmail = function({ to, subject, text, html }) {
    try {
        transporter.sendMail({
            from: '"Thaprobane Notification" <noreply@thaprobane.com.com>',
            to: to,
            subject: subject,
            text: text,
            html: html,
        }, (error, info) => {
            if (error) {
                console.error(error);
            } else {
                console.log("Message sent: %s", info.messageId);
            }
        });
    } catch (error) {
        console.error(error);
    }
}

const requestBody = {
    to: "maxwon555@gmail.com",
    subject: "Test Email",
    text: "This is a test email",
    html: "<b>This is a test email</b>",
};

sendEmail(requestBody);
