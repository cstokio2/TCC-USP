import express from "express";
import cors from "cors";
import client from "prom-client";

const app = express();
const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.use(cors());

// ✅ Endpoint real para métricas
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ✅ Servidor Express rodando separadamente do React
app.listen(4000, () => {
  console.log("✅ Servidor Express rodando na porta 4000 e expondo métricas!");
});