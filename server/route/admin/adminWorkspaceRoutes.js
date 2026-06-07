import express from 'express';
import {
  getWorkspaces,
  getWorkspaceDetails,
  toggleWorkspaceArchive,
  transferWorkspaceOwnership,
  forceAddWorkspaceMember,
  forceRemoveWorkspaceMember,
  deleteWorkspace
} from '../../controller/admin/adminWorkspaceController.js';

const router = express.Router();

router.get('/', getWorkspaces);
router.get('/:boardId', getWorkspaceDetails);
router.put('/:boardId/archive', toggleWorkspaceArchive);
router.post('/:boardId/transfer-ownership', transferWorkspaceOwnership);
router.post('/:boardId/members/add', forceAddWorkspaceMember);
router.post('/:boardId/members/remove', forceRemoveWorkspaceMember);
router.delete('/:boardId', deleteWorkspace);

export default router;
