const SurveyTemplate = require("../models/SurveyTemplate");

const DEFAULT_PRE_QUESTIONS = [
  {
    label: "How did you prepare for this exam?",
    fieldName: "preparationSource",
    type: "multiSelect",
    required: true,
    options: [
      "Classroom notes",
      "Textbook",
      "YouTube",
      "Online course",
      "Previous question papers",
      "Self-study",
    ],
    order: 1,
    helpText: "Select all sources you used for preparation.",
  },
  {
    label: "How much syllabus did you complete?",
    fieldName: "syllabusCoverage",
    type: "singleChoice",
    required: true,
    options: ["Below 25%", "25% - 50%", "50% - 75%", "Above 75%"],
    order: 2,
  },
  {
    label: "How confident are you before starting the exam?",
    fieldName: "confidenceLevel",
    type: "rating",
    required: true,
    config: { min: 1, max: 5, step: 1 },
    order: 3,
  },
];

const DEFAULT_POST_QUESTIONS = [
  {
    label: "How difficult was the overall exam?",
    fieldName: "overallDifficulty",
    type: "singleChoice",
    required: true,
    options: ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"],
    order: 1,
  },
  {
    label: "Was the exam time sufficient?",
    fieldName: "timeSufficient",
    type: "singleChoice",
    required: true,
    options: ["Yes", "No", "Partially"],
    order: 2,
  },
  {
    label: "Share your overall feedback about the exam.",
    fieldName: "overallFeedback",
    type: "textarea",
    required: false,
    placeholder: "Write your feedback here...",
    order: 3,
  },
];

const POST_QUESTION_REVIEW_CONFIG = {
  enabled: true,
  difficultyOptions: ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"],
  allowReviewText: true,
};

const cloneQuestions = (questions) => questions.map((question) => ({ ...question }));

async function createDefaultTemplatesForExam(examId, createdBy, options = {}) {
  const created = [];

  const makeTemplate = (surveyType, title, description, questions, questionReviewConfig) => ({
    examId,
    surveyType,
    title,
    description,
    isDefault: false,
    isActive: true,
    questions: cloneQuestions(questions),
    questionReviewConfig: questionReviewConfig || {},
    createdBy,
    createdAt: new Date(),
  });

  const shouldCreatePre = options.preExamEnabled !== false;
  const shouldCreatePost = options.postExamEnabled !== false;

  if (shouldCreatePre) {
    const existingPre = await SurveyTemplate.findOne({
      examId,
      surveyType: "preExam",
      isActive: true,
    });

    if (!existingPre) {
      const pre = new SurveyTemplate(
        makeTemplate(
          "preExam",
          "Pre-Exam Survey",
          "Questions students answer before starting the exam.",
          DEFAULT_PRE_QUESTIONS
        )
      );
      created.push(await pre.save());
    } else {
      created.push(existingPre);
    }
  }

  if (shouldCreatePost) {
    const existingPost = await SurveyTemplate.findOne({
      examId,
      surveyType: "postExam",
      isActive: true,
    });

    if (!existingPost) {
      const post = new SurveyTemplate(
        makeTemplate(
          "postExam",
          "Post-Exam Survey",
          "Questions students answer after submitting the exam.",
          DEFAULT_POST_QUESTIONS,
          POST_QUESTION_REVIEW_CONFIG
        )
      );
      created.push(await post.save());
    } else {
      created.push(existingPost);
    }
  }

  return created;
}

module.exports = {
  createDefaultTemplatesForExam,
  DEFAULT_PRE_QUESTIONS,
  DEFAULT_POST_QUESTIONS,
  POST_QUESTION_REVIEW_CONFIG,
};
