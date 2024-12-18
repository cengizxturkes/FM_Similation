require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

// MongoDB Bağlantısı
mongoose
  .connect("mongodb://localhost:27017/TRMenajer", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB'ye bağlandı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

// Middleware
app.use(express.json());

// Routers
const teamRoutes = require("./routers/teamRoutes");
const matchRoutes = require("./routers/matchRoutes");
const leagueRoutes = require("./routers/leagueRoutes");

app.use("/api", leagueRoutes);
app.use("/api", teamRoutes);
app.use("/api", matchRoutes);

// Server
const PORT = 5001;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor...`));
