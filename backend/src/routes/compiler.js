// @ts-check
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { runCode } = require('../services/compiler');

const router = express.Router();

router.post(
  '/run',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { language, code, input, entryPoint } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }

    try {
      const result = await runCode(language, code, input, entryPoint || null);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }),
);

module.exports = router;
