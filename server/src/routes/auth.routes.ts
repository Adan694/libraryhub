import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { hashPassword, verifyPassword } from "../lib/password";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import { requireAuth } from "../middleware/auth";
import { Role } from "@prisma/client";

export const authRouter = Router();

function issueToken(userId: string, role: Role) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: "7d" });
}

function setCookie(res: any, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await hashPassword(data.password),
        role: Role.MEMBER,
      },
    });

   const token = issueToken(user.id, user.role);
setCookie(res, token);
res.status(201).json({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  token,
});
  } catch (e) { next(e); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = issueToken(user.id, user.role);
setCookie(res, token);
res.json({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  token,
});
  } catch (e) { next(e); }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (e) { next(e); }
});