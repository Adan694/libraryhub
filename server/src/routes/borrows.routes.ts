import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { borrowBookSchema } from "../schemas/book.schema";

export const borrowsRouter = Router();

const FINE_PER_DAY = 10;

// Borrow a book — fully transactional
borrowsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { bookId, days } = borrowBookSchema.parse(req.body);

    const borrow = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book) throw new Error("BOOK_NOT_FOUND");
      if (book.availableCopies < 1) throw new Error("NO_COPIES_AVAILABLE");

      const updated = await tx.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } },
      });

      if (updated.availableCopies < 0) throw new Error("NO_COPIES_AVAILABLE");

      const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      return tx.borrow.create({
        data: {
          userId: req.auth!.userId,
          bookId,
          dueAt,
          status: "ACTIVE",
        },
        include: { book: true },
      });
    });

    res.status(201).json(borrow);
  } catch (e: any) {
    if (e.message === "BOOK_NOT_FOUND") return res.status(404).json({ error: "Book not found" });
    if (e.message === "NO_COPIES_AVAILABLE") return res.status(409).json({ error: "No copies available" });
    next(e);
  }
});

// Return a book — transactional, calculates fine
borrowsRouter.post("/:id/return", requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const borrow = await tx.borrow.findUnique({
  where: { id: String(req.params.id) },
  include: { book: true },
});
      if (!borrow) throw new Error("BORROW_NOT_FOUND");
      if (borrow.userId !== req.auth!.userId) throw new Error("FORBIDDEN");
      if (borrow.status === "RETURNED") throw new Error("ALREADY_RETURNED");

      const now = new Date();
      const daysLate = Math.max(
        0,
        Math.floor((now.getTime() - borrow.dueAt.getTime()) / (24 * 60 * 60 * 1000))
      );
      const fine = daysLate * FINE_PER_DAY;

      const updated = await tx.borrow.update({
        where: { id: borrow.id },
        data: { returnedAt: now, status: "RETURNED", fine },
      });

      await tx.book.update({
        where: { id: borrow.bookId },
        data: { availableCopies: { increment: 1 } },
      });
      // Fulfil the next waiting reservation, if any
const nextInLine = await tx.reservation.findFirst({
  where: { bookId: borrow.bookId, status: "WAITING" },
  orderBy: { position: "asc" },
});
if (nextInLine) {
  await tx.reservation.update({
    where: { id: nextInLine.id },
    data: { status: "FULFILLED" },
  });
}

      return { ...updated, daysLate };
      
    });
    

    res.json(result);
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      BORROW_NOT_FOUND: [404, "Borrow record not found"],
      FORBIDDEN: [403, "Not your borrow record"],
      ALREADY_RETURNED: [400, "Already returned"],
    };
    if (map[e.message]) return res.status(map[e.message][0]).json({ error: map[e.message][1] });
    next(e);
  }
});

// Current user's borrows
borrowsRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const borrows = await prisma.borrow.findMany({
      where: { userId: req.auth!.userId },
      include: { book: true },
      orderBy: { borrowedAt: "desc" },
    });
    res.json(borrows);
  } catch (e) { next(e); }
});

// Librarian: all borrows
borrowsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    if (req.auth!.role !== "LIBRARIAN") {
      return res.status(403).json({ error: "Librarian access required" });
    }
    const borrows = await prisma.borrow.findMany({
      include: { book: true, user: { select: { id: true, email: true, name: true } } },
      orderBy: { borrowedAt: "desc" },
      take: 100,
    });
    res.json(borrows);
  } catch (e) { next(e); }
});