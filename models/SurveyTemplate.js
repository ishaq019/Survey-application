const mongoose = require("mongoose");

const SurveyQuestionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    fieldName: { type: String, required: true },
    type: { type: String, required: true }, // singleChoice, multiSelect, text, textarea, number, rating
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
    placeholder: { type: String },
    order: { type: Number, default: 0 },
    helpText: { type: String },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const QuestionReviewConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    difficultyOptions: {
      type: [String],
      default: ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"],
    },
    allowReviewText: { type: Boolean, default: true },
  },
  { _id: false }
);

const SurveyTemplateSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
  surveyType: { type: String, required: true }, // preExam | postExam
  title: { type: String, required: true },
  description: { type: String },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  questions: { type: [SurveyQuestionSchema], default: [] },
  questionReviewConfig: { type: QuestionReviewConfigSchema, default: () => ({}) },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SurveyTemplateSchema.index({ examId: 1, surveyType: 1 });

module.exports = mongoose.model("SurveyTemplate", SurveyTemplateSchema);
