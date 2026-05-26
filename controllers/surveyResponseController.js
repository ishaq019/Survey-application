const mongoose = require("mongoose");

const Question = require("../models/Question");
const SurveyResponse = require("../models/SurveyResponse");
const SurveyTemplate = require("../models/SurveyTemplate");
const asyncHandler = require("../utils/asyncHandler");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const normalizeParticipantId = (req) => {
  const candidate =
    req.body?.participantId ||
    req.body?.studentId ||
    req.query?.participantId ||
    req.query?.studentId ||
    req.headers["x-participant-id"];

  return candidate && isValidId(candidate) ? String(candidate) : null;
};

const normalizeAnswers = (answers) => {
  if (!Array.isArray(answers)) return [];

  return answers
    .filter((answer) => answer && typeof answer.fieldName === "string")
    .map((answer) => ({
      fieldName: answer.fieldName.trim(),
      value: answer.value,
    }))
    .filter((answer) => answer.fieldName.length > 0);
};

const getMissingRequiredFields = (template, answers) => {
  if (!template || !Array.isArray(template.questions)) return [];

  const requiredKeys = template.questions
    .filter((question) => question?.required)
    .map((question) => String(question.fieldName || "").trim())
    .filter(Boolean);

  const provided = new Map(answers.map((answer) => [answer.fieldName, answer.value]));

  return requiredKeys.filter((key) => {
    if (!provided.has(key)) return true;

    const value = provided.get(key);
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  });
};

const normalizeQuestionReviews = (questionReviews) => {
  if (!Array.isArray(questionReviews)) return [];

  return questionReviews
    .filter((review) => review && isValidId(review.questionId))
    .map((review) => ({
      questionId: review.questionId,
      difficulty: review.difficulty || "Moderate",
      reviewText: String(review.reviewText || "").trim(),
    }));
};

const getActiveTemplate = async (examId, surveyType, surveyTemplateId) => {
  if (surveyTemplateId && isValidId(surveyTemplateId)) {
    const template = await SurveyTemplate.findOne({
      _id: surveyTemplateId,
      examId,
      surveyType,
      isActive: true,
    }).lean();

    if (template) return template;
  }

  return SurveyTemplate.findOne({ examId, surveyType, isActive: true }).lean();
};

const buildGetSurvey = (surveyType) =>
  asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const participantId = normalizeParticipantId(req);
    const { questionIndex, getQuestionWise } = req.query;

    if (!isValidId(examId)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    if (participantId) {
      const existing = await SurveyResponse.findOne({
        examId,
        studentId: participantId,
        surveyType,
      })
        .select("_id submittedAt")
        .lean();

      if (existing) {
        return res.json({
          alreadySubmitted: true,
          submittedAt: existing.submittedAt,
        });
      }
    }

    const template = await SurveyTemplate.findOne({ examId, surveyType, isActive: true }).lean();

    let examQuestion = null;
    let totalQuestions = 0;
    
    // Only fetch questions if explicitly requested via getQuestionWise=true
    if (surveyType === "postExam" && template?.questionReviewConfig?.enabled && getQuestionWise === "true") {
      // Get total count first
      totalQuestions = await Question.countDocuments({ examId });
      
      // If questionIndex is provided, fetch that specific question (0-based index)
      if (questionIndex !== undefined) {
        const index = parseInt(questionIndex, 10);
        if (!isNaN(index) && index >= 0 && index < totalQuestions) {
          const question = await Question.findOne({ examId })
            .select("_id questionText questionType order")
            .sort({ order: 1, createdAt: 1 })
            .skip(index)
            .limit(1)
            .lean();
          
          if (question) {
            examQuestion = {
              ...question,
              currentIndex: index,
              totalQuestions: totalQuestions,
            };
          }
        }
      }
    }

    return res.json({
      alreadySubmitted: false,
      template: template || null,
      examQuestion: examQuestion || null,
      totalQuestions: totalQuestions,
      questionReviewEnabled: surveyType === "postExam" ? template?.questionReviewConfig?.enabled : false,
    });
  });

const buildSubmitSurvey = (surveyType) =>
  asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const participantId = normalizeParticipantId(req);
    const { surveyTemplateId, answers, questionReviews } = req.body || {};

    if (!isValidId(examId)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    if (!participantId) {
      return res.status(400).json({
        message: "participantId is required for public survey submission",
      });
    }

    if (answers !== undefined && !Array.isArray(answers)) {
      return res.status(400).json({ message: "answers must be an array" });
    }

    const template = await getActiveTemplate(examId, surveyType, surveyTemplateId);
    if (!template) {
      return res.status(404).json({ message: "Active survey template not found" });
    }

    const normalizedAnswers = normalizeAnswers(answers);
    const missing = getMissingRequiredFields(template, normalizedAnswers);

    if (missing.length > 0) {
      return res.status(400).json({
        message: "Please answer all required questions",
        missing,
      });
    }

    const existing = await SurveyResponse.findOne({
      examId,
      studentId: participantId,
      surveyType,
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    let doc;
    try {
      doc = await SurveyResponse.create({
        examId,
        studentId: participantId,
        surveyType,
        surveyTemplateId: template._id,
        answers: normalizedAnswers,
        questionReviews: surveyType === "postExam" ? normalizeQuestionReviews(questionReviews) : [],
      });
    } catch (err) {
      if (err?.code === 11000) {
        doc = await SurveyResponse.findOne({ examId, studentId: participantId, surveyType });
        if (!doc) throw err;
        return res.status(200).json(doc);
      }
      throw err;
    }

    return res.status(201).json(doc);
  });

exports.getPreSurvey = buildGetSurvey("preExam");
exports.getPostSurvey = buildGetSurvey("postExam");
exports.submitPreSurvey = buildSubmitSurvey("preExam");
exports.submitPostSurvey = buildSubmitSurvey("postExam");
