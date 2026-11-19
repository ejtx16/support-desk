import type { Request, Response } from 'express';
import { requireUser } from '../../middleware/authenticate';
import { authService } from './auth.service';

export const authController = {
  async login(req: Request, res: Response) {
    res.json(await authService.login(req.body));
  },

  async register(req: Request, res: Response) {
    res.status(201).json(await authService.register(req.body));
  },

  async me(req: Request, res: Response) {
    res.json({ user: await authService.me(requireUser(req).id) });
  },
};
