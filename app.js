require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

// MongoDB Bağlantısı
mongoose
  .connect("mongodb://localhost:27017/ea_sports", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB'ye bağlandı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

// Middleware
app.use(express.json());

// Routers
const teamRoutes = require("./routers/teamRoutes");
app.use("/api", teamRoutes);

// Server
const PORT = 5001;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor...`));
