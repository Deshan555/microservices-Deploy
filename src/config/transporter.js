const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "deshanjayashanka84@gmail.com",
      pass: "hekpemihpnlckkbz"
    },
  });

module.exports = transporter;