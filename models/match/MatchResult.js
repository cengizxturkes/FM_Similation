const mongoose = require("mongoose");

const matchResultSchema = new mongoose.Schema({
  team1: { type: String, required: true }, // İlk takımın adı
  team2: { type: String, required: true }, // İkinci takımın adı
  score1: { type: Number, required: true }, // İlk takımın attığı gol sayısı
  score2: { type: Number, required: true }, // İkinci takımın attığı gol sayısı
  commentary: { type: [String], required: true }, // Spiker yorumları
  events: [
    {
      minute: { type: Number, required: true }, // Olayın gerçekleştiği dakika
      event: { type: String, required: true }, // Olay türü (Gol, Sarı Kart, Kırmızı Kart)
      description: { type: String, required: true }, // Detaylı açıklama
      team: { type: String, required: true }, // Olayın gerçekleştiği takım
      player: { type: String, required: true }, // Olayda yer alan oyuncu
    },
  ],
  date: { type: Date, default: Date.now }, // Maç tarihi
});

module.exports = mongoose.model("MatchResult", matchResultSchema);
