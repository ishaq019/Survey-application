const { body, check } = require("express-validator");

const validQuestionTypes = [
  "singleChoice",
  "multiSelect",
  "text",
  "textarea",
  "paragraph",
  "number",
  "rating",
];

const surveyTemplateValidator = [
  body("surveyType")
    .isIn(["preExam", "postExam"])
    .withMessage("surveyType must be preExam or postExam"),
  body("title").isString().notEmpty(),
  body("questions").isArray().withMessage("questions must be an array"),
  body("questions.*.label").isString().notEmpty(),
  body("questions.*.fieldName").isString().notEmpty(),
  body("questions.*.type").isIn(validQuestionTypes),
  check("questions.*").custom((question) => {
    if (["singleChoice", "multiSelect"].includes(question.type)) {
      if (!Array.isArray(question.options) || question.options.filter(Boolean).length < 2) {
        throw new Error("At least two options are required for choice questions");
      }
    }

    if (question.type === "rating") {
      if (
        !question.config ||
        typeof question.config.min !== "number" ||
        typeof question.config.max !== "number"
      ) {
        throw new Error("rating config must include numeric min and max");
      }
      if (question.config.min >= question.config.max) {
        throw new Error("rating min must be less than max");
      }
    }

    return true;
  }),
];

module.exports = surveyTemplateValidator;
