const nodemailer = require("nodemailer");

const sendWelcomeEmail = async (user) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <h2>Welcome ${user.firstName}!</h2>
      <p>Thanks for joining CafeMeetups. Explore your community and start connecting!</p>
    `;

    await transporter.sendMail({
      from: `"CafeMeetups" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Welcome to CafeMeetups ☕",
      html,
    });
  } catch (error) {
    console.error("Email failed:", error);
  }
};

module.exports = sendWelcomeEmail;
