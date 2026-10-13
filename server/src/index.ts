import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth.routes";
import { booksRouter } from "./routes/books.routes";
import { borrowsRouter } from "./routes/borrows.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { errorHandler } from "./middleware/error";
import { membersRouter } from "./routes/members.routes";
import { reservationsRouter } from "./routes/reservations.routes";

const app = express();

const allowedOrigins = env.CLIENT_URL.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || env.NODE_ENV !== "production") {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true, service: "libraryhub" }));

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/borrows", borrowsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/members", membersRouter);
app.use("/api/reservations", reservationsRouter);
app.use(errorHandler);

// Only start the HTTP server locally — Vercel runs the app as a serverless function
if (process.env.VERCEL !== "1") {
  app.listen(env.PORT, () => {
    console.log(`LibraryHub server running on http://localhost:${env.PORT}`);
  });
}

export default app;