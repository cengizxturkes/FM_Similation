const Response = require("../utils/response");
const getUserInfo = require("../models/user.model");

const getUserInfoController = async (req, res) => {
  try {
    const userInfo = await getUserInfo.findOne({ email: req.user.email });
    console.log(userInfo);
    return new Response(userInfo).success(res);
  } catch (error) {
    console.error(error);
    return new Response(
      null,
      "Kullanıcı bilgileri getirilirken bir hata oluştu"
    ).internalError(res);
  }
};
module.exports = { getUserInfoController };
