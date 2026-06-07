import express from "express";
import { createUser, loginUser, getAllUsers, getUserByID, getCurrentUser, LogoutUser, blockUser, unblockUser } from "../controller/userController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", createUser);
router.post("/login", loginUser);
router.use(authenticateToken);
router.get("/me", getCurrentUser);
router.get("/all-users", getAllUsers);
router.post("/block/:userId", blockUser);
router.post("/unblock/:userId", unblockUser);
router.get("/:id", getUserByID);
router.post("/logout", LogoutUser);
export default router