import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireLibrarian } from "../middleware/auth";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth, requireLibrarian, async (_req, res, next) => {
  try {
    const now = new Date();

    const [totalBooks, totalMembers, activeBorrows, overdue, finesAgg, mostBorrowed] =
      await Promise.all([
        prisma.book.aggregate({ _sum: { totalCopies: true } }),
        prisma.user.count({ where: { role: "MEMBER" } }),
        prisma.borrow.count({ where: { status: "ACTIVE" } }),
        prisma.borrow.findMany({
          where: { status: "ACTIVE", dueAt: { lt: now } },
          include: {
            book: { select: { title: true } },
            user: { select: { email: true, name: true } },
          },
        }),
        prisma.borrow.aggregate({ _sum: { fine: true } }),
        prisma.borrow.groupBy({
          by: ["bookId"],
          _count: { bookId: true },
          orderBy: { _count: { bookId: "desc" } },
          take: 5,
        }),
      ]);

    const bookIds = mostBorrowed.map((b) => b.bookId);
    const bookDetails = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, author: true },
    });

    const mostBorrowedWithTitles = mostBorrowed.map((b) => ({
      book: bookDetails.find((bd) => bd.id === b.bookId),
      borrowCount: b._count.bookId,
    }));

    res.json({
      totalBooks: totalBooks._sum.totalCopies ?? 0,
      totalMembers,
      activeBorrows,
      overdueCount: overdue.length,
      overdue,
      totalFinesCollected: finesAgg._sum.fine ?? 0,
      mostBorrowed: mostBorrowedWithTitles,
    });
  } catch (e) { next(e); }
});