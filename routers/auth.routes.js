const router = require("express").Router();
const {
  login,
  register,
  me,
  forgetPassword,
  resetCodeCheck,
  resetPassword,
} = require("../controllers/auth.controller");

const authValidation = require("../middlewares/validations/auth.validation");
const { tokenCheck } = require("../middlewares/auth");
const { route } = require("express/lib/router");

router.post("/login", authValidation.login, login);

router.post("/register", authValidation.register, register);

router.get("/me", tokenCheck, me);

router.post("/forget-password", forgetPassword);

router.post("/reset-code-check", resetCodeCheck);

router.post("/resetPassword", authValidation.login, resetPassword);

module.exports = router;
