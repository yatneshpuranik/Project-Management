import express from "express";
import { createUser, loginUser, getAllUsers, getUserByID, getCurrentUser, LogoutUser, blockUser, unblockUser, searchUsers, promoteUser, demoteUser, updatePresence, updateProfile } from "../controller/userController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/logout", LogoutUser);

router.use(authenticateToken);
router.get("/me", getCurrentUser);
router.put("/profile", updateProfile);
router.get("/all-users", getAllUsers);
router.get("/search", searchUsers);
router.post("/block/:userId", blockUser);
router.post("/unblock/:userId", unblockUser);
router.post("/promote/:userId", promoteUser);
router.post("/demote/:userId", demoteUser);
router.post("/presence", updatePresence);
router.get("/:id", getUserByID);
export default router