import { Router } from 'express'
import { body, param } from 'express-validator'
import { optionalVerifyToken, requireRole, verifyToken } from '../../middleware/auth.middleware'
import { rateLimit } from '../../middleware/rate-limit.middleware'
import { validateRequest } from '../../middleware/validate.middleware'
import { getOrCreateSession, sendMessage, getMessages, generateEmbeddings } from './chat.controller'

const router = Router()

router.post(
  '/session',
  rateLimit('chat-session', 20, 15 * 60 * 1000),
  optionalVerifyToken,
  [body('session_id').optional({ checkFalsy: true }).isUUID()],
  validateRequest,
  getOrCreateSession
)

router.post('/embeddings/generate', verifyToken, requireRole('admin'), generateEmbeddings)

router.post(
  '/:sessionId/message',
  rateLimit('chat-message', 30, 15 * 60 * 1000),
  optionalVerifyToken,
  [
    param('sessionId').isUUID(),
    body('message').trim().isLength({ min: 1, max: 1_000 }),
  ],
  validateRequest,
  sendMessage
)

router.get(
  '/:sessionId/messages',
  rateLimit('chat-history', 60, 15 * 60 * 1000),
  optionalVerifyToken,
  [param('sessionId').isUUID()],
  validateRequest,
  getMessages
)

export default router
