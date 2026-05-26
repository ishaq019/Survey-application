const express = require('express');
const Exam = require('../models/Exam');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const exams = await Exam.find({})
      .select('_id title name description status duration startTime endTime surveyConfig createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: exams.length,
      data: exams,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
