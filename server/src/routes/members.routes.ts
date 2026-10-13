import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireLibrarian } from "../middleware/auth";

export const membersRouter = Router();

membersRouter.get("/", requireAuth, requireLibrarian, async (_req, res, next) => {
  try {
    const members = await prisma.user.findMany({
      where: { role: "MEMBER" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: { select: { borrows: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(members);
  } catch (e) { next(e); }
});