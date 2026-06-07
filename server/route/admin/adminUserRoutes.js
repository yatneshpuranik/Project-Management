import express from 'express';
import {
  getUsers,
  getUserDetails,
  updateUserRole,
  toggleUserBlock,
  forceLogoutUser,
  resetUserAccess,
  deleteUser
} from '../../controller/admin/adminUserController.js';

const router = express.Router();

router.get('/', getUsers);
router.get('/:userId', getUserDetails);
router.put('/:userId/role', updateUserRole);
router.put('/:userId/block', toggleUserBlock);
router.post('/:userId/logout', forceLogoutUser);
router.post('/:userId/reset', resetUserAccess);
router.delete('/:userId', deleteUser);

export default router;
