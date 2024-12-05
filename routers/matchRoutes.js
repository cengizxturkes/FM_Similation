const express = require("express");
const router = express.Router();
const MatchResult = require("../models/match/MatchResult");
const TeamRating = require("../models/teams/TeamRating");

// Takım gücü hesaplama fonksiyonu
const calculateTeamStrength = (players) => {
  const totalStrength = players.reduce((sum, player) => {
    const skillMultiplier = player.skillMoves * 3; // Becerilerin etkisi
    const weakFootPenalty = 5 - player.weakFootAbility; // Zayıf ayak için ceza
    const baseRating = player.overallRating || 0;

    return sum + baseRating + skillMultiplier - weakFootPenalty;
  }, 0);
  return Math.round(totalStrength / players.length);
};

// Gol olaylarını oluşturma fonksiyonu (VAR sistemi eklenmiş)
const generateGoalEvents = (team, players, numGoals) => {
  const goalEvents = [];
  const goalMinutes = [];

  // Gollerin dakikalarını rastgele belirle, aynı dakika olmamasına dikkat et
  while (goalMinutes.length < numGoals) {
    const minute = Math.floor(Math.random() * 90) + 1;
    if (!goalMinutes.includes(minute)) {
      goalMinutes.push(minute);
    }
  }

  goalMinutes.sort((a, b) => a - b); // Dakikaya göre sırala

  for (const minute of goalMinutes) {
    const randomPlayer = players[Math.floor(Math.random() * players.length)];

    // VAR incelemesi
    let isVAR = Math.random() < 0.1; // %10 ihtimalle VAR incelemesi
    let varResult = "Gol"; // Varsayılan olarak gol geçerli

    if (isVAR) {
      const varDecision = Math.random();
      if (varDecision < 0.3) {
        varResult = "Gol İptal"; // %30 ihtimalle gol iptal
      } else {
        varResult = "Gol Onay"; // %70 ihtimalle gol onay
      }
    }

    if (varResult === "Gol İptal") {
      goalEvents.push({
        minute,
        event: "Gol İptal",
        description: `${minute}. dakikada ${randomPlayer.firstName} ${randomPlayer.lastName} (${team}) gol attı ancak VAR incelemesi sonrası iptal edildi!`,
        team,
        player: `${randomPlayer.firstName} ${randomPlayer.lastName}`,
      });
    } else {
      goalEvents.push({
        minute,
        event: "Gol",
        description: `${minute}. dakikada ${randomPlayer.firstName} ${randomPlayer.lastName} (${team}) gol attı!`,
        team,
        player: `${randomPlayer.firstName} ${randomPlayer.lastName}`,
      });
    }
  }

  return goalEvents;
};

// Maç simülasyonu fonksiyonu
const simulateMatch = async (
  team1,
  team2,
  players1,
  players2,
  strength1,
  strength2,
  homeTeam
) => {
  // İç saha avantajı
  const HOME_ADVANTAGE = 3;
  if (homeTeam === team1) {
    strength1 += HOME_ADVANTAGE;
  } else if (homeTeam === team2) {
    strength2 += HOME_ADVANTAGE;
  }

  // Başlangıç değerleri
  let currentStrength1 = strength1;
  let currentStrength2 = strength2;
  let redCards1 = 0;
  let redCards2 = 0;
  let yellowCards1 = 0;
  let yellowCards2 = 0;
  const RED_CARD_PENALTY = 5; // Kırmızı kart gücü ne kadar düşürecek
  const events = [];

  // Maç sonucunu belirlemek için güç farkını daha belirgin hale getir
  const strengthDifference = currentStrength1 - currentStrength2;
  let goals1 = 0;
  let goals2 = 0;

  // Daha güçlü takımın kazanma olasılığını artır
  if (strengthDifference > 0) {
    goals1 = Math.max(
      1,
      Math.round(normalRandom(2 + strengthDifference / 10, 1))
    );
    goals2 = Math.max(0, Math.round(normalRandom(1, 1)));
  } else {
    goals1 = Math.max(0, Math.round(normalRandom(1, 1)));
    goals2 = Math.max(
      1,
      Math.round(normalRandom(2 - strengthDifference / 10, 1))
    );
  }

  // Gol olaylarını oluştur
  let goalEvents = [
    ...generateGoalEvents(team1, players1, goals1),
    ...generateGoalEvents(team2, players2, goals2),
  ];

  // VAR incelemesi sonucu iptal edilen golleri çıkar
  goalEvents = goalEvents.filter((event) => event.event !== "Gol İptal");

  // Gerçek gol sayısını güncelle
  goals1 = goalEvents.filter((e) => e.team === team1).length;
  goals2 = goalEvents.filter((e) => e.team === team2).length;

  // Sarı ve kırmızı kart olaylarını oluştur
  const cardEvents = generateCardEvents(
    team1,
    team2,
    players1,
    players2,
    redCards1,
    redCards2,
    yellowCards1,
    yellowCards2
  );

  // Diğer olayları oluştur
  const otherEvents = generateOtherEvents(
    team1,
    team2,
    players1,
    players2,
    goalEvents,
    cardEvents,
    20 // Toplam olay sayısı
  );

  // Tüm olayları birleştir ve sırala
  events.push(...goalEvents, ...cardEvents, ...otherEvents);
  events.sort((a, b) => a.minute - b.minute);

  // İstatistikleri hesapla
  const stats = calculateMatchStats(
    team1,
    team2,
    events,
    goals1,
    goals2,
    yellowCards1,
    yellowCards2,
    redCards1,
    redCards2
  );

  // Maçın oyuncusunu belirle
  const manOfTheMatch = determineManOfTheMatch(events, team1, team2);

  // Maç tarihi ve saati
  const matchDate = new Date();

  return {
    goals1,
    goals2,
    events,
    stats,
    manOfTheMatch,
    matchDate,
  };
};

// Normal dağılım fonksiyonu
const normalRandom = (mean, stdDev) => {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); // [0,1) aralığında rastgele sayı
  while (v === 0) v = Math.random();
  return (
    mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  );
};

// Sarı ve kırmızı kart olaylarını oluşturma fonksiyonu
const generateCardEvents = (
  team1,
  team2,
  players1,
  players2,
  redCards1,
  redCards2,
  yellowCards1,
  yellowCards2
) => {
  const cardEvents = [];
  const totalMinutes = 90;

  // Sarı kart sayısını artırdık
  const numYellowCards = Math.round(normalRandom(5, 1));
  // Ortalama kırmızı kart sayısı: 0.5
  const numRedCards = Math.round(normalRandom(0.5, 0.5));

  const cardMinutes = [];

  // Kartların dakikalarını rastgele belirle, aynı dakika olmamasına dikkat et
  while (cardMinutes.length < numYellowCards + numRedCards) {
    const minute = Math.floor(Math.random() * totalMinutes) + 1;
    if (!cardMinutes.includes(minute)) {
      cardMinutes.push(minute);
    }
  }

  cardMinutes.sort((a, b) => a - b); // Dakikaya göre sırala

  for (let i = 0; i < numYellowCards + numRedCards; i++) {
    const minute = cardMinutes[i];
    const isRedCard = i < numRedCards;
    const randomTeam = Math.random() < 0.5 ? team1 : team2;
    const players = randomTeam === team1 ? players1 : players2;
    const randomPlayer = players[Math.floor(Math.random() * players.length)];

    cardEvents.push({
      minute,
      event: isRedCard ? "Kırmızı Kart" : "Sarı Kart",
      description: `${minute}. dakikada ${randomPlayer.firstName} ${
        randomPlayer.lastName
      } (${randomTeam}) ${isRedCard ? "Kırmızı Kart" : "Sarı Kart"} gördü!`,
      team: randomTeam,
      player: `${randomPlayer.firstName} ${randomPlayer.lastName}`,
    });

    // Kırmızı kart sonrası takım gücünü düşür
    if (isRedCard) {
      if (randomTeam === team1) {
        redCards1++;
      } else {
        redCards2++;
      }
    } else {
      if (randomTeam === team1) {
        yellowCards1++;
      } else {
        yellowCards2++;
      }
    }
  }

  return cardEvents;
};

// Diğer olayları oluşturma fonksiyonu
const generateOtherEvents = (
  team1,
  team2,
  players1,
  players2,
  goalEvents,
  cardEvents,
  totalEvents
) => {
  const otherEvents = [];
  const existingMinutes = [
    ...goalEvents.map((e) => e.minute),
    ...cardEvents.map((e) => e.minute),
  ];

  const actionVerbs = [
    "müthiş bir şut çekti",
    "orta yaptı",
    "topu kontrol etti",
    "savunmayı çalımladı",
    "sert bir şut çekti",
    "hızla ilerledi",
    "ceza sahasına girdi",
    "pas verdi",
    "röveşata denedi",
    "vole vurdu",
    "slalom yaparak geçti",
    "uzaktan şut çekti",
  ];

  const reactions = [
    "kaleci devleşti",
    "direkten döndü",
    "taraftarlar ayağa kalktı",
    "inanılmaz bir pozisyondu",
    "top auta çıktı",
    "savunma son anda müdahale etti",
    "hakem ofsayt bayrağını kaldırdı",
    "hızlı bir kontratak başlattı",
    "gol çizgisinden çıkardı",
    "alkış aldı",
  ];

  while (otherEvents.length < totalEvents) {
    const minute = Math.floor(Math.random() * 90) + 1;
    if (!existingMinutes.includes(minute)) {
      existingMinutes.push(minute);

      const randomTeam = Math.random() < 0.5 ? team1 : team2;
      const players = randomTeam === team1 ? players1 : players2;
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      const randomAction =
        actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
      const randomReaction =
        reactions[Math.floor(Math.random() * reactions.length)];

      otherEvents.push({
        minute,
        event: "Olay",
        description: `${minute}. dakikada ${randomPlayer.firstName} ${randomPlayer.lastName} (${randomTeam}) ${randomAction}, ${randomReaction}!`,
        team: randomTeam,
        player: `${randomPlayer.firstName} ${randomPlayer.lastName}`,
      });
    }
  }

  return otherEvents;
};

// Maç istatistiklerini hesaplama fonksiyonu
const calculateMatchStats = (
  team1,
  team2,
  events,
  goals1,
  goals2,
  yellowCards1,
  yellowCards2,
  redCards1,
  redCards2
) => {
  // Şut sayıları
  const shots1 = Math.round(normalRandom(10 + goals1 * 2, 2));
  const shots2 = Math.round(normalRandom(8 + goals2 * 2, 2));

  // Topla oynama yüzdeleri
  const possession1 = Math.round(
    50 + ((goals1 - goals2) / (goals1 + goals2 + 1)) * 10
  );
  const possession2 = 100 - possession1;

  // Taç atışı sayıları
  const throwIns1 = Math.round(normalRandom(15, 3));
  const throwIns2 = Math.round(normalRandom(15, 3));

  return {
    [team1]: {
      shots: shots1,
      possession: possession1,
      yellowCards: yellowCards1,
      redCards: redCards1,
      throwIns: throwIns1,
    },
    [team2]: {
      shots: shots2,
      possession: possession2,
      yellowCards: yellowCards2,
      redCards: redCards2,
      throwIns: throwIns2,
    },
  };
};

// Maçın oyuncusunu belirleme fonksiyonu
const determineManOfTheMatch = (events, team1, team2) => {
  const playerContributions = {};

  // Golleri ve önemli olayları say
  events.forEach((event) => {
    if (event.event === "Gol") {
      if (!playerContributions[event.player]) {
        playerContributions[event.player] = 0;
      }
      playerContributions[event.player] += 5; // Gol için 5 puan
    } else if (event.event === "Olay") {
      if (!playerContributions[event.player]) {
        playerContributions[event.player] = 0;
      }
      playerContributions[event.player] += 1; // Diğer olaylar için 1 puan
    }
  });

  // En yüksek puanlı oyuncuyu bul
  let maxContribution = 0;
  let manOfTheMatch = "";
  for (const player in playerContributions) {
    if (playerContributions[player] > maxContribution) {
      maxContribution = playerContributions[player];
      manOfTheMatch = player;
    }
  }

  return manOfTheMatch;
};

// Spiker yorumlarını oluşturma fonksiyonu
const generateCommentary = (events) => {
  return events
    .filter((e) => e.event !== "Olay")
    .map((e) => ({
      minute: e.minute,
      commentary: e.description,
    }));
};

// Teknik direktör yorumlarını oluşturma fonksiyonu
const generateCoachComments = (
  coach1,
  coach2,
  team1,
  team2,
  score1,
  score2
) => {
  const commentsWin = [
    "Takımımın performansından çok memnunum.",
    "Oyuncularımı tebrik ediyorum, harika oynadılar.",
    "Bugün sahada istediğimiz her şeyi yaptık.",
    "Bu galibiyet taraftarlarımıza armağan olsun.",
    "Liderliğimizi sürdürdüğümüz için mutluyuz.",
  ];

  const commentsLose = [
    "Maalesef istediğimiz oyunu sahaya yansıtamadık.",
    "Hatalarımızdan ders çıkaracağız.",
    "Sonuç bizi üzdü ama önümüze bakacağız.",
    "Rakibimizi tebrik ediyorum, daha iyi oynadılar.",
    "Bu mağlubiyet bize ders olmalı.",
  ];

  const commentsDraw = [
    "Zorlu bir maçtı, her iki takım da iyi mücadele etti.",
    "Kazanmaya yakındık ama olmadı.",
    "Beraberlik adil bir sonuç oldu.",
    "Oyuncularımın performansından memnunum.",
    "Taraftarlarımıza teşekkür ediyorum, bizi desteklediler.",
  ];

  let comment1 = "";
  let comment2 = "";

  if (score1 > score2) {
    comment1 = commentsWin[Math.floor(Math.random() * commentsWin.length)];
    comment2 = commentsLose[Math.floor(Math.random() * commentsLose.length)];
  } else if (score1 < score2) {
    comment1 = commentsLose[Math.floor(Math.random() * commentsLose.length)];
    comment2 = commentsWin[Math.floor(Math.random() * commentsWin.length)];
  } else {
    comment1 = commentsDraw[Math.floor(Math.random() * commentsDraw.length)];
    comment2 = commentsDraw[Math.floor(Math.random() * commentsDraw.length)];
  }

  return {
    [coach1]: comment1,
    [coach2]: comment2,
  };
};

router.post("/match", async (req, res) => {
  try {
    const { team1, team2, homeTeam, coach1, coach2 } = req.body;

    if (!team1 || !team2) {
      return res.status(400).json({
        errorCode: 1,
        message: "Lütfen iki takım adı gönderin",
      });
    }

    if (!coach1 || !coach2) {
      return res.status(400).json({
        errorCode: 1,
        message: "Lütfen iki teknik direktör adı gönderin",
      });
    }

    const homeTeamName = homeTeam || team1;

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

    // Eğer oyuncular bulunamazsa hata döndür
    if (!players1 || !players2 || !players1.length || !players2.length) {
      return res.status(400).json({
        errorCode: 1,
        message: "Takımlarda oyuncu bulunamadı",
      });
    }

    // Takım güçlerini hesapla
    const strength1 = calculateTeamStrength(players1);
    const strength2 = calculateTeamStrength(players2);

    // Maçı simüle et
    const { goals1, goals2, events, stats, manOfTheMatch, weather, matchDate } =
      await simulateMatch(
        team1,
        team2,
        players1,
        players2,
        strength1,
        strength2,
        homeTeamName
      );

    // Skorları ata
    const score1 = goals1;
    const score2 = goals2;

    // Spiker yorumlarını oluştur
    const commentary = generateCommentary(events);

    // Gol atan oyuncuları ve dakikalarını al
    const goalScorers = events
      .filter((e) => e.event === "Gol")
      .map((e) => ({
        minute: e.minute,
        team: e.team,
        player: e.player,
      }));

    // Teknik direktör yorumlarını oluştur
    const coachComments = generateCoachComments(
      coach1,
      coach2,
      team1,
      team2,
      score1,
      score2
    );

    // Maç sonucunu kaydet
    const matchResult = new MatchResult({
      team1,
      team2,
      score1,
      score2,
      commentary: commentary.map((c) => c.commentary),
      events,
      stats,
      manOfTheMatch,
      weather,
      matchDate,
      coachComments,
    });
    await matchResult.save();

    return res.status(200).json({
      result: {
        [team1]: score1,
        [team2]: score2,
      },
      teamStrengths: {
        [team1]: strength1,
        [team2]: strength2,
      },
      errorCode: 0,
      message: "Maç tamamlandı",
      commentary,
      events,
      stats,
      manOfTheMatch,
      goalScorers,
      weather,
      matchDate,
      coachComments,
    });
  } catch (err) {
    console.error("Hata:", err.message);
    res.status(500).json({
      errorCode: 2,
      message: "Bir hata oluştu",
    });
  }
});

module.exports = router;
