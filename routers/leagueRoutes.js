const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// MongoDB bağlantısı
mongoose.connect("mongodb://localhost:27017/TRMenajer", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose şemaları ve modelleri
const TeamSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId, // MongoDB'nin otomatik ObjectId'si
  label: String, // Takım adı
  league_id: mongoose.Schema.Types.ObjectId, // Lig ID'si
});

const PlayerSchema = new mongoose.Schema({
  team: { id: String },
  position: { label: String },
  alternatePositions: [{ label: String }],
  overallRating: Number,
  firstName: String,
  lastName: String,
});
const ActiveLeagueSchema = new mongoose.Schema({
  name: String,
  is_active: Boolean,
  active_league_teams: Array,
  transfer_list: Array,
});

const Team = mongoose.model("takimlar", TeamSchema);
const Player = mongoose.model("oyuncular", PlayerSchema);
const ActiveLeague = mongoose.model("active_league", ActiveLeagueSchema);

// Güçlere göre oyuncu fiyatı hesaplama fonksiyonu
function calculatePlayerPrice(overallRating) {
  if (overallRating < 65) {
    return Math.floor(Math.random() * 5 + 1) * 1_000_000;
  } else if (overallRating < 80) {
    return Math.floor(Math.random() * 11 + 5) * 1_000_000;
  } else {
    return Math.floor(Math.random() * 16 + 15) * 1_000_000;
  }
}

// Yeni aktif lig oluşturma endpointi
router.post("/create-league", async (req, res) => {
  const { teamUid } = req.body;

  try {
    const selectedTeam = await Team.findOne({
      _id: mongoose.Types.ObjectId(teamUid),
    });

    if (!selectedTeam) {
      return res.status(404).json({ error: "Takım bulunamadı!" });
    }

    const leagueTeams = await Team.find({ league_id: selectedTeam.league_id });
    if (leagueTeams.length === 0) {
      return res.status(404).json({ error: "Lig takımları bulunamadı!" });
    }

    const activeLeague = new ActiveLeague({
      name: `${selectedTeam.label} ve Lig Takımları Ligi`,
      is_active: true,
      active_league_teams: [],
      transfer_list: [],
    });

    for (const team of leagueTeams) {
      const teamPlayers = await Player.find({ "team.id": team.id });

      const formation = {
        Kaleci: 1,
        Stoper: 2,
        "Sağ Bek": 1,
        "Sol Bek": 1,
        "Merkez Defansif Orta Saha Oyuncusu": 1,
        "Merkez Orta Saha Oyuncusu": 2,
        "Sağ Kanat": 1,
        "Sol Kanat": 1,
        Santrfor: 1,
      };

      const starting11 = [];
      const substitutes = [];

      for (const [position, count] of Object.entries(formation)) {
        let positionPlayers = teamPlayers.filter(
          (player) =>
            player.position?.label === position ||
            player.alternatePositions?.some((alt) => alt.label === position)
        );

        if (positionPlayers.length === 0) {
          for (const altPosition of positionAlternatives[position] || []) {
            positionPlayers = teamPlayers.filter(
              (player) =>
                player.position?.label === altPosition ||
                player.alternatePositions?.some(
                  (alt) => alt.label === altPosition
                )
            );
            if (positionPlayers.length > 0) break;
          }
        }

        if (positionPlayers.length > 0) {
          const sortedPlayers = positionPlayers.sort(
            (a, b) => b.overallRating - a.overallRating
          );
          starting11.push(...sortedPlayers.slice(0, count));
        }
      }

      const remainingPlayers = teamPlayers.filter(
        (player) => !starting11.includes(player)
      );
      substitutes.push(...remainingPlayers.slice(0, 7));

      activeLeague.active_league_teams.push({
        team_id: team.id,
        team_label: team.label,
        players: [
          ...starting11.map((p) => ({ ...p._doc, is11: true })),
          ...substitutes.map((p) => ({ ...p._doc, isSub: true })),
        ],
      });
    }

    const transferList = [];
    for (const position of Object.keys(formation)) {
      const positionPlayers = await Player.find({
        $or: [
          { "position.label": position },
          { alternatePositions: { $elemMatch: { label: position } } },
        ],
      });

      const weakPlayers = positionPlayers
        .filter((p) => p.overallRating < 65)
        .slice(0, 2);
      const mediumPlayers = positionPlayers
        .filter((p) => p.overallRating >= 65 && p.overallRating < 80)
        .slice(0, 5);
      const strongPlayers = positionPlayers
        .filter((p) => p.overallRating >= 80)
        .slice(0, 3);

      const selectedPlayers = [
        ...weakPlayers,
        ...mediumPlayers,
        ...strongPlayers,
      ];

      for (const player of selectedPlayers) {
        transferList.push({
          player_id: player.id,
          player_name: `${player.firstName} ${player.lastName}`,
          position,
          overall_rating: player.overallRating,
          price: calculatePlayerPrice(player.overallRating),
        });
      }
    }

    activeLeague.transfer_list = transferList;
    await activeLeague.save();

    res.status(201).json({
      message: "Lig başarıyla oluşturuldu.",
      league: activeLeague,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bir hata oluştu." });
  }
});

module.exports = router;
