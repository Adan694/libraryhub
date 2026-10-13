import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";
import { Role } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireLibrarian(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: "Not authenticated" });
  if (req.auth.role !== Role.LIBRARIAN) {
    return res.status(403).json({ error: "Librarian access required" });
  }
  next();
}