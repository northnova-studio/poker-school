import { Router, type Request } from 'express'
import { parse } from '../../lib/validate.js'
import { toUserDto } from '../../lib/dto.js'
import { me, requireAuth } from '../../middleware/auth.js'
import { loginLimiter, refreshLimiter, registerLimiter } from '../../middleware/rateLimit.js'
import { changePasswordSchema, loginSchema, logoutSchema, profilePatchSchema, refreshSchema, registerSchema } from './schemas.js'
import * as svc from './service.js'

const info = (req: Request) => ({ ip: req.ip, userAgent: req.get('user-agent') })

export const authRouter = Router()

authRouter.post('/auth/register', registerLimiter, async (req, res) => {
  const input = parse(registerSchema, req.body)
  res.status(201).json(await svc.register(input, info(req)))
})

authRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = parse(loginSchema, req.body)
  res.json(await svc.login(email, password, info(req)))
})

authRouter.post('/auth/refresh', refreshLimiter, async (req, res) => {
  const { refreshToken } = parse(refreshSchema, req.body)
  res.json(await svc.refresh(refreshToken, info(req)))
})

authRouter.post('/auth/logout', async (req, res) => {
  const { refreshToken } = parse(logoutSchema, req.body ?? {})
  await svc.logout(refreshToken)
  res.status(204).end()
})

authRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json(toUserDto(me(req)))
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const patch = parse(profilePatchSchema, req.body)
  res.json(await svc.updateProfile(me(req), patch))
})

// Extra (non nel contratto): cambio password, revoca tutti i refresh token
authRouter.post('/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body)
  await svc.changePassword(me(req), currentPassword, newPassword)
  res.status(204).end()
})
