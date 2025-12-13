const express = require("express");
const router = express.Router();

// ✅ Corrected filename + variable name
const acctOrgChartController = require("../controllers/acctOrgChartController");

// GET /org-chart/:accountId
router.get("/:accountId", acctOrgChartController.getCustomersByAccount);




module.exports = router;
