import type { Request, Response } from 'express';
import { requireUser } from '../../middleware/authenticate';
import type { ListTicketsQuery } from './tickets.schema';
import { ticketsService } from './tickets.service';

export const ticketsController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ListTicketsQuery;
    res.json(await ticketsService.list(query, requireUser(req)));
  },

  async getById(req: Request, res: Response) {
    res.json({ data: await ticketsService.getById(req.params.id, requireUser(req)) });
  },

  async create(req: Request, res: Response) {
    res.status(201).json({ data: await ticketsService.create(req.body, requireUser(req)) });
  },

  async update(req: Request, res: Response) {
    res.json({ data: await ticketsService.update(req.params.id, req.body, requireUser(req)) });
  },

  async claim(req: Request, res: Response) {
    res.json({ data: await ticketsService.claim(req.params.id, requireUser(req)) });
  },

  async addComment(req: Request, res: Response) {
    res
      .status(201)
      .json({ data: await ticketsService.addComment(req.params.id, req.body, requireUser(req)) });
  },
};
