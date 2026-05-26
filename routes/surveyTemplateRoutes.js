const express = require("express");

const {
  createDefaultTemplates,
  getTemplatesByExam,
  removeTemplateConfiguration,
  updateTemplate,
} = require("../controllers/surveyTemplateController");
const validate = require("../middleware/validateRequest");
const surveyTemplateValidator = require("../validators/surveyTemplateValidator");

const router = express.Router();

// Public/configurable survey routes. No JWT, no login, no role middleware.
router.get("/exams/:examId", getTemplatesByExam);
router.post("/exams/:examId/defaults", createDefaultTemplates);
router.put("/:templateId", surveyTemplateValidator, validate, updateTemplate);
router.delete("/:templateId", removeTemplateConfiguration);

module.exports = router;
