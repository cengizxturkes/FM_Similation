const mongoose = require("mongoose");

const teamRatingSchema = new mongoose.Schema({
  team: Number,
  data: {
    items: [
      {
        id: Number,
        rank: Number,
        overallRating: Number,
        firstName: String,
        lastName: String,
        birthdate: String,
        height: Number,
        skillMoves: Number,
        weakFootAbility: Number,
        preferredFoot: Number,
        leagueName: String,
        weight: Number,
        avatarUrl: String,
        shieldUrl: String,
        alternatePositions: Array,
        playerAbilities: Array,
        gender: Object,
        nationality: Object,
        team: Object,
        position: Object,
        stats: Object,
      },
    ],
  },
});

module.exports = mongoose.model("TeamRating", teamRatingSchema, "team_ratings");
