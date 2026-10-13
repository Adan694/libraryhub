import { z } from "zod";

export const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(5),
  category: z.string().min(1),
  totalCopies: z.number().int().min(1),
});

export const updateBookSchema = createBookSchema.partial();

export const listBooksQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const borrowBookSchema = z.object({
  bookId: z.string().min(1),
  days: z.number().int().min(1).max(30).default(14),
});