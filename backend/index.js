require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const http = require("http");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

// Variables de entorno
const PORT = process.env.PORT || 8080;
const SERIAL_PORT = process.env.SERIAL_PORT || "/dev/ttyUSB0";
const BAUD_RATE = Number(process.env.BAUD_RATE || 9600);
const MOCK = process.env.MOCK === "1";

const app = express();
app.use(cors());
app.get("/health", (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

wss.on("connection", (ws) => {
  ws.send(
    JSON.stringify({ type: "status", message: "connected", at: Date.now() })
  );
});

let port;
let parser;

async function startSerial() {
  if (MOCK) {
    console.log("[MOCK] Enviando datos simulados...");
    setInterval(() => {
      const tempC = 24 + Math.random() * 4;
      broadcast({
        type: "reading",
        tempC: Number(tempC.toFixed(2)),
        tempF: Number(((tempC * 9) / 5 + 32).toFixed(2)),
        ts: Date.now(),
      });
    }, 1000);
    return;
  }

  try {
    port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
    parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    port.on("open", () =>
      console.log(`[SERIAL] Abierto ${SERIAL_PORT} @${BAUD_RATE}`)
    );
    port.on("error", (err) => console.error("[SERIAL ERROR]", err.message));

    parser.on("data", (line) => {
      console.log("[SERIAL RAW]", line);
      try {
        const data = JSON.parse(line);
        if (typeof data.tempC === "number") {
          const tempF = data.tempF ?? (data.tempC * 9) / 5 + 32;
          const ph = data.ph !== undefined ? Number(data.ph) : undefined;
          broadcast({
            type: "reading",
            tempC: data.tempC,
            tempF: Number(tempF.toFixed(2)),
            ph: ph,
            ts: data.ts || Date.now(),
          });
        }
      } catch (e) {
        const num = parseFloat(String(line).trim());
        if (!isNaN(num)) {
          const tempC = num;
          const tempF = (tempC * 9) / 5 + 32;
          broadcast({
            type: "reading",
            tempC: Number(tempC.toFixed(2)),
            tempF: Number(tempF.toFixed(2)),
            ts: Date.now(),
          });
        }
      }
    });
  } catch (err) {
    console.error("[SERIAL INIT ERROR]", err);
    console.error("Activa MOCK=1 en .env si necesitas simular.");
  }
}

startSerial();
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
