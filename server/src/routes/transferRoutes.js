import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createTransfer, listTransfers, reverseTransfer } from '../controllers/transferController.js';
const router = Router();
router.use(protect);
router.get('/', listTransfers);
router.post('/', createTransfer);
router.post('/:id/reverse', reverseTransfer);
export default router;
