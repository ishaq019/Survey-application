const SurveyTemplate = require("../models/SurveyTemplate");
const Exam = require("../models/Exam");
const asyncHandler = require("../utils/asyncHandler");
const { createDefaultTemplatesForExam } = require("../services/surveyTemplateService");

const getExamOr404 = async (examId) => {
  const exam = await Exam.findById(examId).select("_id title createdBy").lean();

  if (!exam) {
    return {
      found: false,
      status: 404,
      message: "Exam not found",
    };
  }

  return { found: true, exam };
};

const syncExamSurveyConfig = async (examId) => {
  const activeTemplates = await SurveyTemplate.find({
    examId,
    isActive: true,
  })
    .select("surveyType")
    .lean();

  const surveyConfig = {
    preExamEnabled: activeTemplates.some((template) => template.surveyType === "preExam"),
    postExamEnabled: activeTemplates.some((template) => template.surveyType === "postExam"),
  };

  await Exam.findByIdAndUpdate(examId, { $set: { surveyConfig } });

  return surveyConfig;
};

const normalizeFieldName = (value, fallback) => {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return clean || fallback;
};

const normalizeQuestions = (questions = []) => {
  const usedNames = new Set();

  return questions.map((question, index) => {
    const type = question.type === "paragraph" ? "textarea" : question.type;
    let fieldName = normalizeFieldName(question.fieldName, `question_${index + 1}`);

    if (usedNames.has(fieldName)) {
      fieldName = `${fieldName}_${index + 1}`;
    }
    usedNames.add(fieldName);

    const normalized = {
      label: question.label,
      fieldName,
      type,
      required: Boolean(question.required),
      placeholder: question.placeholder || "",
      helpText: question.helpText || "",
      order: index,
      config: question.config || {},
    };

    if (["singleChoice", "multiSelect"].includes(type)) {
      normalized.options = (question.options || [])
        .map((option) => String(option || "").trim())
        .filter(Boolean);
    } else {
      normalized.options = [];
    }

    if (type === "rating") {
      const min = Number(question.config?.min || 1);
      const max = Number(question.config?.max || 5);
      normalized.config = {
        min,
        max,
        step: Number(question.config?.step || 1),
      };
    }

    return normalized;
  });
};

exports.getTemplatesByExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const examCheck = await getExamOr404(examId);

  if (!examCheck.found) {
    return res.status(examCheck.status).json({ message: examCheck.message });
  }

  const templates = await SurveyTemplate.find({
    examId,
    isActive: true,
  })
    .sort({ surveyType: 1, createdAt: 1 })
    .lean();

  return res.json(templates);
});

exports.createDefaultTemplates = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const examCheck = await getExamOr404(examId);

  if (!examCheck.found) {
    return res.status(examCheck.status).json({ message: examCheck.message });
  }

  const preExamEnabled = req.body.preExamEnabled !== false;
  const postExamEnabled = req.body.postExamEnabled !== false;

  const templates = await createDefaultTemplatesForExam(examId, examCheck.exam.createdBy, {
    preExamEnabled,
    postExamEnabled,
  });

  const surveyConfig = await syncExamSurveyConfig(examId);

  return res.status(201).json({
    message: "Survey templates created successfully",
    templates,
    surveyConfig,
  });
});

exports.updateTemplate = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  const template = await SurveyTemplate.findById(templateId);

  if (!template) {
    return res.status(404).json({
      message: "Survey template not found",
    });
  }

  const examCheck = await getExamOr404(template.examId);

  if (!examCheck.found) {
    return res.status(examCheck.status).json({ message: examCheck.message });
  }

  template.title = req.body.title ?? template.title;
  template.description = req.body.description ?? template.description;
  template.questions = Array.isArray(req.body.questions)
    ? normalizeQuestions(req.body.questions)
    : template.questions;
  template.questionReviewConfig = req.body.questionReviewConfig ?? template.questionReviewConfig;
  template.isActive =
    typeof req.body.isActive === "boolean" ? req.body.isActive : template.isActive;
  template.updatedAt = new Date();

  const updatedTemplate = await template.save();
  const surveyConfig = await syncExamSurveyConfig(template.examId);

  return res.json({
    message: "Survey template updated successfully",
    template: updatedTemplate,
    surveyConfig,
  });
});

exports.removeTemplateConfiguration = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  const template = await SurveyTemplate.findById(templateId);

  if (!template) {
    return res.status(404).json({
      message: "Survey template not found",
    });
  }

  const examCheck = await getExamOr404(template.examId);

  if (!examCheck.found) {
    return res.status(examCheck.status).json({ message: examCheck.message });
  }

  template.isActive = false;
  template.updatedAt = new Date();
  await template.save();
  const surveyConfig = await syncExamSurveyConfig(template.examId);

  return res.json({
    message:
      template.surveyType === "preExam"
        ? "Pre-exam survey configuration removed successfully"
        : "Post-exam survey configuration removed successfully",
    surveyConfig,
  });
});
