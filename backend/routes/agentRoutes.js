// routes/agentRoutes.js
const express = require("express");
const { runAgent } = require("../graph/runAgent.js");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { query, userId } = req.body;
    const db = req.app.locals.db;

    const response = await runAgent(query, db, userId);
    return res.json(response);
  } catch (err) {
    console.error("Agent error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
