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
router.post("/match", async (req, res) => {
  try {
    const { team1, team2 } = req.body;

    if (!team1 || !team2) {
      return res.status(400).json({
        errorCode: 1,
        message: "Lütfen iki takım adı gönderin",
      });
    }

    // Takımların oyuncularını veritabanından al
    const teams = await TeamRating.aggregate([
      { $unwind: "$data.items" },
      { $match: { "data.items.team.label": { $in: [team1, team2] } } },
      {
        $group: {
          _id: "$data.items.team.label",
          players: { $push: "$data.items" },
        },
      },
    ]);

    if (teams.length < 2) {
      return res.status(400).json({
        errorCode: 1,
        message: "Belirtilen takımlardan biri veya her ikisi bulunamadı",
      });
    }

    // Takımları ve oyuncuları ayır
    const teamData1 = teams.find((t) => t._id === team1);
    const teamData2 = teams.find((t) => t._id === team2);

    const players1 = teamData1.players;
    const players2 = teamData2.players;

    const strength1 = calculateTeamStrength(players1);
    const strength2 = calculateTeamStrength(players2);

    const strongerTeam = strength1 >= strength2 ? team1 : team2;
    const weakerTeam = strength1 < strength2 ? team1 : team2;

    // Maç sonucunu güç farkına göre belirle
    const outcome = determineMatchOutcome(strength1, strength2);

    // Skor hesapla
    const { score1, score2 } =
      outcome === "stronger"
        ? calculateScore(strength1, strength2)
        : calculateScore(strength2, strength1);

    // Maç olayları ve yorumları oluştur
    const events = Array.from({ length: 10 }, () =>
      generateMatchEvent(team1, team2, players1, players2, strength1, strength2)
    );

    const commentary = generateCommentary(
      team1,
      team2,
      players1,
      players2,
      events
    );

    // Maç sonucunu kaydet
    const matchResult = new MatchResult({
      team1,
      team2,
      strength1,
      strength2,
      score1,
      score2,
      commentary: commentary.map((c) => c.commentary),
      events,
    });

    await matchResult.save();

    // Yanıt olarak sonuçları döndür
    return res.status(200).json({
      errorCode: 0,
      message: "Maç tamamlandı",
      result: {
        [team1]: score1,
        [team2]: score2,
        teamStrengths: {
          [team1]: strength1,
          [team2]: strength2,
        },
      },
      commentary,
      events,
    });
  } catch (err) {
    console.error("Hata:", err.message);
    res.status(500).json({
      errorCode: 2,
      message: "Bir hata oluştu",
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
}); // Maç sonucunu gerçekçi hale getiren skor hesaplama fonksiyonu
const calculateTeamStrength = (players) => {
  const totalStrength = players.reduce((sum, player) => {
    const skillMultiplier = player.skillMoves * 3; // Becerilerin etkisi
    const weakFootPenalty = 5 - player.weakFootAbility; // Zayıf ayak için ceza
    const baseRating = player.overallRating || 0;

    return sum + baseRating + skillMultiplier - weakFootPenalty;
  }, 0);
  return Math.round(totalStrength / players.length);
};
const calculateScoreFromEvents = (events, team1, team2) => {
  // Her takım için gol sayılarını hesapla
  const score1 = events.filter(
    (event) => event.event === "Gol" && event.team === team1
  ).length;
  const score2 = events.filter(
    (event) => event.event === "Gol" && event.team === team2
  ).length;

  return { score1, score2 };
};
router.post("/match", async (req, res) => {
  try {
    const { team1, team2 } = req.body;

    if (!team1 || !team2) {
      return res.status(400).json({
        errorCode: 1,
        message: "Lütfen iki takım adı gönderin",
      });
    }

    // Takımların oyuncularını veritabanından al
    const teams = await TeamRating.aggregate([
      { $unwind: "$data.items" },
      { $match: { "data.items.team.label": { $in: [team1, team2] } } },
      {
        $group: {
          _id: "$data.items.team.label",
          players: { $push: "$data.items" },
        },
      },
    ]);

    if (teams.length < 2) {
      return res.status(400).json({
        errorCode: 1,
        message: "Belirtilen takımlardan biri veya her ikisi bulunamadı",
      });
    }

    // Takımları ve oyuncuları ayır
    const teamData1 = teams.find((t) => t._id === team1);
    const teamData2 = teams.find((t) => t._id === team2);

    if (!teamData1 || !teamData2) {
      return res.status(400).json({
        errorCode: 1,
        message: "Belirtilen takımlardan biri veya her ikisi bulunamadı",
      });
    }

    const players1 = teamData1.players;
    const players2 = teamData2.players;

    if (!players1.length || !players2.length) {
      return res.status(400).json({
        errorCode: 1,
        message: "Takımlarda oyuncu bulunamadı",
      });
    }

    // Takım güçlerini hesapla
    const strength1 = calculateTeamStrength(players1);
    const strength2 = calculateTeamStrength(players2);

    // Olayları oluştur
    const events = Array.from({ length: 10 }, () =>
      generateMatchEvent(team1, team2, players1, players2)
    );

    // Skoru olaylardan hesapla
    const { score1, score2 } = calculateScoreFromEvents(events, team1, team2);

    // Spiker yorumlarını oluştur
    const commentary = generateCommentary(
      team1,
      team2,
      players1,
      players2,
      events
    );

    // Maç sonucunu kaydet
    const matchResult = new MatchResult({
      team1,
      team2,
      score1,
      score2,
      commentary: commentary.map((c) => c.commentary),
      events,
    });
    await matchResult.save();

    return res.status(200).json({
      errorCode: 0,
      message: "Maç tamamlandı",
      commentary,
      events,
      result: {
        [team1]: score1,
        [team2]: score2,
      },
    });
  } catch (err) {
    console.error("Hata:", err.message);
    res.status(500).json({
      errorCode: 2,
      message: "Bir hata oluştu",
    });
  }
});

const calculateScoreFromStrength = (strength1, strength2, maxGoals = 5) => {
  const gap = Math.abs(strength1 - strength2);
  const totalStrength = strength1 + strength2;

  // Güçlü takımın gol olasılığı
  const strongTeamProbability =
    strength1 > strength2
      ? Math.pow(strength1 / totalStrength, 2)
      : Math.pow(strength2 / totalStrength, 2);

  // Zayıf takımın gol olasılığı
  const weakTeamProbability =
    strength1 > strength2
      ? Math.pow(strength2 / totalStrength, 1.5)
      : Math.pow(strength1 / totalStrength, 1.5);

  // Güç farkına göre skorlar
  const strongTeamGoals = Math.round(
    Math.random() * maxGoals * strongTeamProbability
  );
  const weakTeamGoals = Math.round(
    Math.random() * maxGoals * weakTeamProbability
  );

  return strength1 > strength2
    ? { score1: strongTeamGoals, score2: weakTeamGoals }
    : { score1: weakTeamGoals, score2: strongTeamGoals };
};
const calculateScore = (strength1, strength2, maxGoals = 5) => {
  const total = strength1 + strength2;
  const prob1 = Math.pow(strength1 / total, 2); // Güçlü takımın ağırlığı artırıldı
  const prob2 = Math.pow(strength2 / total, 1.5); // Zayıf takımın ağırlığı azaltıldı

  const score1 = Math.round(Math.random() * maxGoals * prob1);
  const score2 = Math.round(Math.random() * maxGoals * prob2);

  return { score1, score2 };
};
const determineMatchOutcome = (strength1, strength2) => {
  const gap = Math.abs(strength1 - strength2); // Güç farkı hesaplama
  const weakerTeamWinsChance =
    gap < 3
      ? 0.5 // %50
      : gap < 5
      ? 0.4 // %40
      : gap < 10
      ? 0.25 // %25
      : 0.15; // %15

  const weakerTeamWins = Math.random() < weakerTeamWinsChance; // Zayıf takım kazanırsa
  return weakerTeamWins ? "weaker" : "stronger"; // Hangi takımın kazandığı
};
const generateMatchEvent = (
  team1,
  team2,
  players1,
  players2,
  strength1,
  strength2
) => {
  const randomMinute = Math.floor(Math.random() * 90) + 1;

  const randomEvent = Math.random();
  let eventType = "Şut";
  if (randomEvent < 0.1) eventType = "Gol";
  else if (randomEvent < 0.3) eventType = "Sarı Kart";
  else if (randomEvent < 0.35) eventType = "Kırmızı Kart";

  const randomTeam = Math.random() < 0.5 ? team1 : team2;
  const players = randomTeam === team1 ? players1 : players2;
  const randomPlayer = players[Math.floor(Math.random() * players.length)];

  let eventDescription = `${randomMinute}. dakikada ${randomPlayer.firstName} ${randomPlayer.lastName} (${randomTeam})`;

  if (eventType === "Gol") {
    eventDescription += " gol attı!";
  } else if (eventType === "Sarı Kart") {
    eventDescription += " Sarı Kart gördü!";
  } else if (eventType === "Kırmızı Kart") {
    eventDescription += " Kırmızı Kart gördü!";
  } else {
    eventDescription += " şut çekti, kaleci kurtardı!";
  }

  return {
    minute: randomMinute,
    event: eventType,
    description: eventDescription,
    team: randomTeam,
    player: `${randomPlayer.firstName} ${randomPlayer.lastName}`,
  };
};

const weightedRandom = (items, weights) => {
  const totalWeight = Object.values(weights).reduce(
    (sum, weight) => sum + weight,
    0
  );
  const random = Math.random() * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[items[i]];
    if (random < cumulative) {
      return items[i];
    }
  }
};
const generateCommentary = (
  team1,
  team2,
  players1,
  players2,
  events,
  numComments = 20
) => {
  console.log("events:", events); // Sorunu izlemek için log ekleyin
  if (!events || !Array.isArray(events)) {
    console.error("Hata: events tanımlı değil veya bir dizi değil!");
    return []; // Hata durumunda boş bir yorum döndürün
  }

  const actionVerbs = [
    "şut çekiyor",
    "orta yapıyor",
    "topu kontrol ediyor",
    "savunmayı çalımlıyor",
    "sert bir şut çekiyor",
    "hızla ilerliyor",
    "ceza sahasına giriyor",
    "pas veriyor",
  ];

  const reactions = [
    "kaleci harika kurtardı!",
    "direkten döndü!",
    "taraftarlar çıldırdı!",
    "inanılmaz bir pozisyon, kaçtı!",
    "top auta çıktı!",
    "savunma son anda müdahale etti!",
    "hakem ofsayt bayrağını kaldırdı!",
    "hızlı bir kontratak başlattı!",
  ];

  const commentary = [];
  const goalEvents = events.filter((e) => e.event === "Gol");

  // Gol yorumları ekle
  for (const goal of goalEvents) {
    commentary.push({
      minute: goal.minute,
      commentary: `${goal.minute}. dakikada ${goal.player} (${goal.team}) gol attı!`,
    });
  }

  // Diğer rastgele yorumlar
  for (let i = 0; i < numComments - goalEvents.length; i++) {
    const randomTeam = Math.random() < 0.5 ? team1 : team2;
    const players = randomTeam === team1 ? players1 : players2;
    const randomPlayer = players[Math.floor(Math.random() * players.length)];
    const randomAction =
      actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
    const randomReaction =
      reactions[Math.floor(Math.random() * reactions.length)];
    const minute = Math.floor(Math.random() * 90) + 1;

    commentary.push({
      minute,
      commentary: `${minute}. dakikada ${randomPlayer.firstName} ${randomPlayer.lastName} (${randomTeam}) ${randomAction}, ${randomReaction}`,
    });
  }

  return commentary.sort((a, b) => a.minute - b.minute); // Dakikaya göre sırala
};

module.exports = router;
