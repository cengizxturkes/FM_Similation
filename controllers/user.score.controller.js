const userScore = require("../models/user.score.model");
const Response = require("../utils/response");
const addUserScoreController = async (req, res) => {
  try {
    const userScoreSave = new userScore(req.body);
    await userScoreSave.save();
    return new Response(userScoreSave, "Skor başarıyla eklendi").created(res);
  } catch (error) {
    console.error(error);
    return new Response(null, "Skor eklenirken bir hata oluştu").data(res);
  }
};
const getUserScoreController = async (req, res) => {
  try {
    const userScoreInfo = await userScore.findOne({ user: req.user._id });
    return new Response(userScoreInfo).success(res);
  } catch (error) {
    console.error(error);
    return new Response(
      null,
      "Kullanıcı skor bilgileri getirilirken bir hata oluştu"
    ).internalError(res);
  }
};
const updateUserScoreController = async (req, res) => {
  try {
    const userScoreInfo = await userScore.findOne({
      _id: req.params.scoreid,
    });
    if (!userScoreInfo) {
      return new Response(null, "Skor bilgisi bulunamadı").notFound(res);
    }
    await userScoreInfo.updateOne(req.body);
    return new Response(userScoreInfo, "Skor başarıyla güncellendi").success(
      res
    );
  } catch (error) {
    console.error(error);
    return new Response(null, "Skor güncellenirken bir hata oluştu").data(res);
  }
};
module.exports = {
  addUserScoreController,
  getUserScoreController,
  updateUserScoreController,
};
