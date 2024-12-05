const express = require("express");
const router = express.Router();
const MatchResult = require("../models/match/MatchResult"); // Maç sonuçları için model

const TeamRating = require("../models/teams/TeamRating");
router.get("/getTeamsWithPlayer", async (req, res) => {
  try {
    console.log("GET /get-teams endpoint çağrıldı"); // İstek kaydı
    const teams = await TeamRating.find(); // Tüm verileri çek
    // console.log("Veriler:", teams); // Verileri logla
    res.status(200).json(teams);
  } catch (err) {
    console.error("Hata:", err.message); // Hata kaydı
    res.status(500).json({ message: "Veriler alınamadı", error: err.message });
  }
});
router.get("/getTeams", async (req, res) => {
  try {
    // Tüm belgelerdeki benzersiz takım isimlerini al
    const teams = await TeamRating.aggregate([
      { $unwind: "$data.items" }, // data.items içindeki her elemanı ayır
      { $group: { _id: "$data.items.team.label" } }, // Takımlara göre grupla
      { $sort: { _id: 1 } }, // Takımları alfabetik sırayla sırala
    ]);

    // Gruplamayı düzene sok
    const teamNames = teams.map((team) => team._id);

    // Eğer sonuç varsa başarı mesajı döndür
    if (teamNames.length > 0) {
      return res.status(200).json({
        errorCode: 0,
        length: teamNames.length,
        message: "Başarılı",
        teams: teamNames,
      });
    }

    // Eğer sonuç yoksa hata mesajı döndür
    return res.status(200).json({
      errorCode: 1,
      length: 0,
      message: "Sonuç bulunamadı",
      teams: [],
    });
  } catch (err) {
    // Beklenmeyen hata için hata mesajı döndür
    console.error("Hata:", err);
    res.status(500).json({
      errorCode: 2,
      length: 0,
      message: "Bir hata oluştu",
      teams: [],
    });
  }
});

router.get("/getTeamsWithLeagueName", async (req, res) => {
  try {
    // Kullanıcıdan gelen lig adı
    const { leagueName } = req.query;

    // Eğer lig adı gönderilmemişse hata döndür
    if (!leagueName) {
      return res.status(400).json({
        errorCode: 1,
        length: 0,
        message: "Lütfen bir lig adı girin",
        teams: [],
      });
    }

    // Veritabanında lig adına göre takımları ara
    const teams = await TeamRating.aggregate([
      { $unwind: "$data.items" }, // data.items içindeki her elemanı aç
      { $match: { "data.items.leagueName": leagueName } }, // Lig adına göre filtrele
      { $group: { _id: "$data.items.team.label" } }, // Takımlara göre grupla
      { $sort: { _id: 1 } }, // Takımları alfabetik sırayla sırala
    ]);

    // Gruplamayı düzene sok
    const teamNames = teams.map((team) => team._id);

    // Eğer sonuç varsa başarı mesajı döndür
    if (teamNames.length > 0) {
      return res.status(200).json({
        errorCode: 0,
        length: teamNames.length,
        message: "Başarılı",
        teams: teamNames,
      });
    }

    // Eğer sonuç yoksa hata mesajı döndür
    return res.status(200).json({
      errorCode: 1,
      length: 0,
      message: "Bu lig için takım bulunamadı",
      teams: [],
    });
  } catch (err) {
    // Beklenmeyen hata için hata mesajı döndür
    console.error("Hata:", err);
    res.status(500).json({
      errorCode: 2,
      length: 0,
      message: "Bir hata oluştu",
      teams: [],
    });
  }
});

module.exports = router;
