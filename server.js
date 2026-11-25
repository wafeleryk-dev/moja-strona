const express = require("express");
const path = require("path");

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const webhook = process.env.DISCORD_WEBHOOK;

// Pomocnicza funkcja wyciągająca / normalizująca adres IPv4
function getClientIPv4(req) {
  const candidates = [];

  // Jeśli aplikacja stoi za reverse proxy (np. Nginx, Cloudflare, Render, Railway)
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    forwardedFor.split(",").forEach((ip) => candidates.push(ip.trim()));
  }

  if (req.ip) candidates.push(req.ip);
  if (req.socket?.remoteAddress) candidates.push(req.socket.remoteAddress);

  for (let rawIp of candidates) {
    if (!rawIp) continue;

    // Usuń ewentualny port (np. 192.168.1.10:54321)
    if (rawIp.includes(".") && rawIp.includes(":")) {
      const parts = rawIp.split(":");
      if (parts.length === 2 && !rawIp.startsWith("::ffff:")) {
        rawIp = parts[0];
      }
    }

    // Zamień IPv6-mapped IPv4 (np. ::ffff:203.0.113.45) na czyste IPv4
    if (rawIp.startsWith("::ffff:")) {
      rawIp = rawIp.replace("::ffff:", "");
    }

    // Lokalny loopback IPv6 -> lokalny IPv4
    if (rawIp === "::1") {
      rawIp = "127.0.0.1";
    }

    // Sprawdź, czy to poprawny adres IPv4
    const ipv4Regex =
      /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    if (ipv4Regex.test(rawIp)) {
      return rawIp;
    }
  }

  return "Brak adresu IPv4";
}

app.post("/consent", async (req, res) => {
  if (!webhook) {
    return res.status(500).json({ error: "Brak konfiguracji" });
  }

  const ip = getClientIPv4(req);
  const time = new Date().toISOString();

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "Nowy odwiedzający – zgoda udzielona",
            fields: [
              { name: "Publiczne IP (IPv4)", value: ip },
              { name: "Data i godzina", value: time }
            ],
            color: 5793266
          }
        ]
      })
    });

    if (!response.ok) throw new Error("Discord error");

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Nie udało się wysłać powiadomienia" });
  }
});

const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Strona działa na http://${host}:${port}`);
});
