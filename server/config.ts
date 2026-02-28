import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

console.log("[Config] Environment loaded");
console.log("[Config] SENDGRID_API_KEY:", process.env.SENDGRID_API_KEY ? "set" : "not set");
