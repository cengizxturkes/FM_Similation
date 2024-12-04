const joi = require("joi");
const APIError = require("../../utils/errors");
class authValidation {
  constructor() {}
  async login(req, res, next) {
    const schema = joi.object({
      email: joi.string().email().required(),
      password: joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return next(new APIError(error.details[0].message, 400));
    }
    return next();
  }
  static async login(req, res, next) {
    const schema = joi.object({
      email: joi.string().email().required().messages({
        "string.base": "Email alanı metin tipinde olmalıdır",
        "string.empty": "Email alanı boş bırakılamaz",
        "string.email": "Email alanı geçerli bir email adresi olmalıdır",
        "any.required": "Email alanı zorunludur",
      }),
      password: joi.string().min(6).max(50).required().messages({
        "string.base": "Şifre alanı metin tipinde olmalıdır",
        "string.empty": "Şifre alanı boş bırakılamaz",
        "any.required": "Şifre alanı zorunludur",
        "string.min": "Şifre alanı en az 6 karakter olmalıdır",
        "string.max": "Şifre alanı en fazla 50 karakter olmalıdır",
      }),
    });
    try {
      await schema.validateAsync(req.body);
    } catch (error) {
      if (error.details && error?.details[0].message)
        throw new APIError(error.details[0].message, 400);
      else throw new APIError("Lütfen Validasyon Kullarına Uyun", 400);
    }
    next();
  }
  static async register(req, res, next) {
    try {
      const schema = joi.object({
        name: joi.string().trim().min(3).max(30).required().messages({
          "string.base": "Ad alanı metin tipinde olmalıdır",
          "string.empty": "Ad alanı boş bırakılamaz",
          "string.min": "Ad alanı en az 3 karakter olmalıdır",
          "string.max": "Ad alanı en fazla 30 karakter olmalıdır",
          "any.required": "Ad alanı zorunludur",
        }),
        lastname: joi.string().min(3).max(30).required().messages({
          "string.base": "Soyad alanı metin tipinde olmalıdır",
          "string.empty": "Soyad alanı boş bırakılamaz",
          "string.min": "Soyad alanı en az 3 karakter olmalıdır",
          "string.max": "Soyad alanı en fazla 30 karakter olmalıdır",
          "any.required": "Soyad alanı zorunludur",
        }),
        email: joi.string().email().min(6).max(50).required().messages({
          "string.base": "Email alanı metin tipinde olmalıdır",
          "string.empty": "Email alanı boş bırakılamaz",
          "string.email": "Email alanı geçerli bir email adresi olmalıdır",
          "string.min": "Email alanı en az 6 karakter olmalıdır",
          "string.max": "Email alanı en fazla 50 karakter olmalıdır",
          "any.required": "Email alanı zorunludur",
        }),
        password: joi.string().min(6).max(50).required().messages({
          "string.base": "Şifre alanı metin tipinde olmalıdır",
          "string.empty": "Şifre alanı boş bırakılamaz",
          "string.min": "Şifre alanı en az 6 karakter olmalıdır",
          "string.max": "Şifre alanı en fazla 50 karakter olmalıdır",
          "any.required": "Şifre alanı zorunludur",
        }),
      });
      await schema.validateAsync(req.body);
    } catch (error) {
      if (error.details && error?.details[0].message)
        throw new APIError(error.details[0].message, 400);
      else throw new APIError("Lütfen Validasyon Kullarına Uyun", 400);
    }
    next();
  }
}
module.exports = authValidation;
