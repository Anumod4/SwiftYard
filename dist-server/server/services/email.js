"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendPasswordSetEmail = exports.sendEmail = exports.verifyPasswordToken = exports.generatePasswordToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const JWT_SECRET = process.env.JWT_SECRET || "swiftyard-secret-key-change-in-production";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@swiftyard.com";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
let emailProvider = "log";
if (SENDGRID_API_KEY) {
    mail_1.default.setApiKey(SENDGRID_API_KEY);
    emailProvider = "sendgrid";
    console.log("[Email] SendGrid configured");
}
else if (process.env.SMTP_HOST) {
    emailProvider = "smtp";
    console.log("[Email] SMTP configured");
}
else {
    console.log("[Email] WARNING: No email provider configured - emails will be logged only");
}
const createSMTPTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};
const generatePasswordToken = (uid, email, type = "password_set") => {
    const payload = {
        uid,
        email,
        type,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};
exports.generatePasswordToken = generatePasswordToken;
const verifyPasswordToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.exp < Date.now()) {
            return null;
        }
        return decoded;
    }
    catch {
        return null;
    }
};
exports.verifyPasswordToken = verifyPasswordToken;
const sendEmail = async (to, subject, html) => {
    console.log(`[Email] Sending to: ${to}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log(`[Email] Provider: ${emailProvider}`);
    if (emailProvider === "log") {
        console.log(`[Email] LOG ONLY MODE`);
        console.log(`[Email] HTML: ${html.substring(0, 200)}...`);
        return true;
    }
    try {
        if (emailProvider === "sendgrid") {
            await mail_1.default.send({ to, from: FROM_EMAIL, subject, html });
            console.log(`[Email] Sent via SendGrid`);
            return true;
        }
        if (emailProvider === "smtp") {
            const transporter = createSMTPTransporter();
            await transporter.sendMail({
                from: FROM_EMAIL,
                to,
                subject,
                html,
            });
            console.log(`[Email] Sent via SMTP`);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error("[Email] Error:", error.message);
        return false;
    }
};
exports.sendEmail = sendEmail;
const sendPasswordSetEmail = async (email, displayName, token) => {
    const resetLink = `${APP_URL}/set-password?token=${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0a84ff;">Welcome to SwiftYard!</h2>
      <p>Hi ${displayName},</p>
      <p>Your account has been created by an administrator. Please set your password to get started.</p>
      <p>
        <a href="${resetLink}" style="display: inline-block; background-color: #0a84ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Set Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link will expire in 7 days.<br/>
        If you didn't request this, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
      <p style="color: #999; font-size: 12px;">
        SwiftYard - Every trailer. Every move. Simplified.
      </p>
    </div>
  `;
    await (0, exports.sendEmail)(email, "Set Your SwiftYard Password", html);
};
exports.sendPasswordSetEmail = sendPasswordSetEmail;
const sendPasswordResetEmail = async (email, displayName, token) => {
    const resetLink = `${APP_URL}/set-password?token=${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0a84ff;">SwiftYard Password Reset</h2>
      <p>Hi ${displayName},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p>
        <a href="${resetLink}" style="display: inline-block; background-color: #0a84ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link will expire in 7 days.<br/>
        If you didn't request a password reset, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
      <p style="color: #999; font-size: 12px;">
        SwiftYard - Every trailer. Every move. Simplified.
      </p>
    </div>
  `;
    await (0, exports.sendEmail)(email, "Reset Your SwiftYard Password", html);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
