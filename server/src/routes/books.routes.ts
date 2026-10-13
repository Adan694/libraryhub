import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireLibrarian } from "../middleware/auth";
import {
  createBookSchema,
  updateBookSchema,
  listBooksQuerySchema,
} from "../schemas/book.schema";

export const booksRouter = Router();

// Public catalogue with search, filter, pagination
booksRouter.get("/", async (req, res, next) => {
  try {
    const { q, category, page, limit } = listBooksQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { author: { contains: q, mode: "insensitive" } },
      ];
    }
    if (category) where.category = category;

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({ total, page, limit, books });
  } catch (e) { next(e); }
});

// Single book
booksRouter.get("/:id", async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({ where: { id: req.params.id } });
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (e) { next(e); }
});

// Librarian: create
booksRouter.post("/", requireAuth, requireLibrarian, async (req, res, next) => {
  try {
    const data = createBookSchema.parse(req.body);
    const book = await prisma.book.create({
      data: { ...data, availableCopies: data.totalCopies },
    });
    res.status(201).json(book);
  } catch (e) { next(e); }
});

// Librarian: update
booksRouter.patch("/:id", requireAuth, requireLibrarian, async (req, res, next) => {
  try {
    const data = updateBookSchema.parse(req.body);
    const book = await prisma.book.update({
      where: { id: req.params.id },
      data,
    });
    res.json(book);
  } catch (e) { next(e); }
});

// Librarian: delete
booksRouter.delete("/:id", requireAuth, requireLibrarian, async (req, res, next) => {
  try {
    await prisma.book.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});