"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: ".env.local" });
dotenv_1.default.config();
console.log("[Config] Environment loaded");
console.log("[Config] SENDGRID_API_KEY:", process.env.SENDGRID_API_KEY ? "set" : "not set");
