"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Get all roles (accessible to all authenticated users)
router.get("/", async (req, res) => {
    try {
        const roles = await (0, db_1.fetchAll)("roles");
        res.json({ success: true, data: roles });
    }
    catch (error) {
        console.error("Get roles error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
