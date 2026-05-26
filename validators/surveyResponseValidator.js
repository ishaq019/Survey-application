const { body } = require("express-validator");

const surveyResponseValidator = [
  body("surveyType").isIn(["preExam", "postExam"]),
  body("participantId").optional().isMongoId(),
  body("studentId").optional().isMongoId(),
  body("surveyTemplateId").optional().isMongoId(),
  body("answers").isArray().withMessage("answers must be an array"),
  body("answers.*.fieldName").isString().notEmpty(),
  body("answers.*.value").exists(),
  body("questionReviews").optional().isArray(),
  body("questionReviews.*.questionId").optional().isMongoId(),
];

module.exports = surveyResponseValidator;
