import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data (order matters because of foreign keys)
  await prisma.borrow.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // Librarians
  const librarian = await prisma.user.create({
    data: {
      email: "librarian@libraryhub.dev",
      passwordHash,
      name: "Sarah Ahmed",
      role: Role.LIBRARIAN,
    },
  });

  // Members
  const member1 = await prisma.user.create({
    data: {
      email: "member@libraryhub.dev",
      passwordHash,
      name: "Ali Khan",
      role: Role.MEMBER,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: "fatima@libraryhub.dev",
      passwordHash,
      name: "Fatima Malik",
      role: Role.MEMBER,
    },
  });

  console.log(`Created users: ${librarian.email}, ${member1.email}, ${member2.email}`);

  // Books
  const books = await Promise.all([
    prisma.book.create({
      data: {
        title: "Clean Code",
        author: "Robert C. Martin",
        isbn: "9780132350884",
        category: "Software Engineering",
        totalCopies: 3,
        availableCopies: 3,
      },
    }),
    prisma.book.create({
      data: {
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt",
        isbn: "9780201616224",
        category: "Software Engineering",
        totalCopies: 2,
        availableCopies: 2,
      },
    }),
    prisma.book.create({
      data: {
        title: "Refactoring",
        author: "Martin Fowler",
        isbn: "9780134757599",
        category: "Software Engineering",
        totalCopies: 2,
        availableCopies: 2,
      },
    }),
    prisma.book.create({
      data: {
        title: "Design Patterns",
        author: "Erich Gamma",
        isbn: "9780201633610",
        category: "Software Engineering",
        totalCopies: 1,
        availableCopies: 1,
      },
    }),
    prisma.book.create({
      data: {
        title: "Sapiens",
        author: "Yuval Noah Harari",
        isbn: "9780062316097",
        category: "History",
        totalCopies: 4,
        availableCopies: 4,
      },
    }),
    prisma.book.create({
      data: {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: "9780735211292",
        category: "Self-Help",
        totalCopies: 5,
        availableCopies: 5,
      },
    }),
    prisma.book.create({
      data: {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "9780547928227",
        category: "Fantasy",
        totalCopies: 3,
        availableCopies: 3,
      },
    }),
    prisma.book.create({
      data: {
        title: "Educated",
        author: "Tara Westover",
        isbn: "9780399590504",
        category: "Biography",
        totalCopies: 2,
        availableCopies: 2,
      },
    }),
  ]);

  console.log(`Created ${books.length} books`);

  // A sample borrow (member1 has Clean Code, due in 14 days)
  const now = new Date();
  const dueAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await prisma.borrow.create({
    data: {
      userId: member1.id,
      bookId: books[0].id,
      dueAt,
      status: "ACTIVE",
    },
  });

  // Decrement available copies for that book
  await prisma.book.update({
    where: { id: books[0].id },
    data: { availableCopies: { decrement: 1 } },
  });

  // An overdue borrow from member2 (10 days ago, was due 3 days ago)
  const pastBorrow = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastDue = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  await prisma.borrow.create({
    data: {
      userId: member2.id,
      bookId: books[4].id,
      borrowedAt: pastBorrow,
      dueAt: pastDue,
      status: "OVERDUE",
      fine: 30,
    },
  });

  await prisma.book.update({
    where: { id: books[4].id },
    data: { availableCopies: { decrement: 1 } },
  });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });