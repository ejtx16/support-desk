import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), asyncHandler(authController.login));
authRouter.post('/register', validate(registerSchema), asyncHandler(authController.register));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
