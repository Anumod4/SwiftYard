import { Router } from "express";
import { fetchAll } from "../db";
import { AuthenticatedRequest } from "../types";

const router = Router();

// Get all roles (accessible to all authenticated users)
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const roles = await fetchAll("roles");
    res.json({ success: true, data: roles });
  } catch (error: any) {
    console.error("Get roles error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
