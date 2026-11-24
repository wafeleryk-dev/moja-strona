
const express = require("express");
const path = require("path");

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const webhook = process.env.DISCORD_WEBHOOK;

app.post("/consent", async (req, res) => {
  if (!webhook) {
    return res.status(500).json({ error: "Brak konfiguracji" });
  }

  const ip = req.ip;
  const time = new Date().toISOString();

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "Nowy odwiedzający – zgoda udzielona",
          fields: [
            { name: "Publiczne IP", value: ip },
            { name: "Data i godzina", value: time }
          ],
          color: 5793266
        }]
      })
    });

    if (!response.ok) throw new Error("Discord error");

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Nie udało się wysłać powiadomienia" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Strona działa na porcie " + port));
