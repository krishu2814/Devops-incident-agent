import express from "express";
import healthRouter from "./routes/health";
import incidentsRouter from "./routes/incidents";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/health", healthRouter);
app.use("/incidents", incidentsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
