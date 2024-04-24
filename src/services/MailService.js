const nodemailer = require("nodemailer");
const transporter = require("../config/transporter");
const logger = require('../config/logger');

const MailService = {
    sendSingleEmail : async ({ to, subject, text, html }) => {
        try {
            transporter.sendMail({
                from: '"Thaprobane Notification" <noreply@thaprobane.com.com>',
                to: to,
                subject: subject,
                text: text,
                html: html,
            }, (error, info) => {
                if (error) {
                    logger.error('Email Sending Failed : '+error);
                } else {
                    logger.info('Email Sent : '+info.response);
                }
            });
        } catch (error) {
            logger.error('Error Occurred while sending email : '+error);
        }
    },
}

module.exports = MailService;