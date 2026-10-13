import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const reservationsRouter = Router();

// Member reserves a book (only when no copies available)
reservationsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { bookId } = req.body;
    if (!bookId) return res.status(400).json({ error: "bookId required" });

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (book.availableCopies > 0) {
      return res.status(400).json({ error: "Copies are available — borrow instead" });
    }

    const existing = await prisma.reservation.findFirst({
      where: {
        userId: req.auth!.userId,
        bookId,
        status: "WAITING",
      },
    });
    if (existing) return res.status(409).json({ error: "You already have a reservation for this book" });

    const position = await prisma.reservation.count({
      where: { bookId, status: "WAITING" },
    });

    const reservation = await prisma.reservation.create({
      data: {
        userId: req.auth!.userId,
        bookId,
        position: position + 1,
        status: "WAITING",
      },
      include: { book: true },
    });

    res.status(201).json(reservation);
  } catch (e) { next(e); }
});

// Current user's reservations
reservationsRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.auth!.userId },
      include: { book: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(reservations);
  } catch (e) { next(e); }
});

// Cancel a reservation
reservationsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });
    if (reservation.userId !== req.auth!.userId) {
      return res.status(403).json({ error: "Not your reservation" });
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED" },
    });

    res.json({ ok: true });
  } catch (e) { next(e); }
});