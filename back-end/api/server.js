import express from "express";
import cors from "cors";
import { db } from "./connect.js";
import client from "prom-client";

const app = express();
const PORT = 3001;

app.use(cors());

// Registrador de métricas Prometheus
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Simulador de sessões por IP
const userVisits = new Map();

// Contadores de requisições
const songsRequestCounter = new client.Counter({
  name: "songs_requests_total",
  help: "Número total de requisições ao endpoint /songs",
});

const artistsRequestCounter = new client.Counter({
  name: "artists_requests_total",
  help: "Número total de requisições ao endpoint /artists",
});

// Histograma de duração das requisições HTTP
const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duração das requisições HTTP em segundos",
  labelNames: ["method", "route", "code"],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});

// Histograma de duração da sessão (simulado)
const sessionDurationHistogram = new client.Histogram({
  name: "session_duration_seconds",
  help: "Duração das sessões por IP simulada via requisições consecutivas",
  labelNames: ["ip"],
  buckets: [5, 15, 30, 60, 120, 300, 600],
});

// Contador de usuários que retornam
const returningUsersCounter = new client.Counter({
  name: "returning_users_total",
  help: "Contagem de IPs que acessaram mais de uma vez",
  labelNames: ["ip"],
});

// Contador da origem das requisições (referer)
const accessOriginCounter = new client.Counter({
  name: "access_origin_total",
  help: "Contagem de origem das requisições (Referer header)",
  labelNames: ["origin"],
});

// Registro de todas as métricas
register.registerMetric(songsRequestCounter);
register.registerMetric(artistsRequestCounter);
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(sessionDurationHistogram);
register.registerMetric(returningUsersCounter);
register.registerMetric(accessOriginCounter);

// Endpoint de métricas para Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Endpoint raiz
app.get("/", (req, res) => {
  res.send("Só vamos trabalhar com os endpoints '/artists' e '/songs'");
});

// Endpoint /artists com métricas
app.get("/artists", async (req, res) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  const route = req.route.path;

  artistsRequestCounter.inc();

  const ip = req.ip || req.connection.remoteAddress;
  const referer = req.headers["referer"] || "direct";
  accessOriginCounter.inc({ origin: referer });

  if (userVisits.has(ip)) {
    returningUsersCounter.inc({ ip });
  } else {
    userVisits.set(ip, Date.now());
  }

  const sessionDuration = Math.random() * 300 + 10;
  sessionDurationHistogram.observe({ ip }, sessionDuration);

  const data = await db.collection("artists").find({}).toArray();
  res.send(data);

  end({ route, code: res.statusCode, method: req.method });
});

// Endpoint /songs com métricas
app.get("/songs", async (req, res) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  const route = req.route.path;

  songsRequestCounter.inc();

  const ip = req.ip || req.connection.remoteAddress;
  const referer = req.headers["referer"] || "direct";
  accessOriginCounter.inc({ origin: referer });

  if (userVisits.has(ip)) {
    returningUsersCounter.inc({ ip });
  } else {
    userVisits.set(ip, Date.now());
  }

  const sessionDuration = Math.random() * 300 + 10;
  sessionDurationHistogram.observe({ ip }, sessionDuration);

  const data = await db.collection("songs").find({}).toArray();
  res.send(data);

  end({ route, code: res.statusCode, method: req.method });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor está escutando na porta ${PORT}`);
});
