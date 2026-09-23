import express from "express";
import { reservationRouter } from "./routes/reservation.routes";
import { logger } from "./logger";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/", reservationRouter);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.listen(PORT, () => {
  logger.info("server", "fast-path escuchando", { port: PORT });
});
