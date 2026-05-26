const mongoose = require("mongoose");

// Flexible answer schema to support old and new formats
const AnswerSchema = new mongoose.Schema(
  {
    // New format
    fieldName: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    // Backwards-compatible old format
    questionKey: { type: String },
    questionText: { type: String },
    answer: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const QuestionReviewSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    difficulty: { type: mongoose.Schema.Types.Mixed }, // flexible: string/number
    reviewText: { type: String },
  },
  { _id: false }
);

const SurveyResponseSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    surveyTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "SurveyTemplate" },
    surveyType: { type: String, required: true }, // 'preExam'|'postExam' or legacy 'before'|'after'
    answers: { type: [AnswerSchema], default: [] },
    questionReviews: { type: [QuestionReviewSchema], default: [] },
    snapshotLabel: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SurveyResponseSchema.index({ examId: 1, studentId: 1, surveyType: 1 }, { unique: true });
SurveyResponseSchema.index({ examId: 1, surveyType: 1 });

module.exports = mongoose.model("SurveyResponse", SurveyResponseSchema);
