const express = require("express");
const router = express.Router();
const {
  upsertCustomer,
  getCustomerTree,
  getAccountOrgChart,
  listCustomers,
  deleteCustomersByEmail,
  getCustomersByEmail
} = require("../controllers/customerMappingController");

// POST /api/customer
router.post("/", upsertCustomer);

// GET /api/customer/tree/:email
router.get("/tree/:email", getCustomerTree);

// GET /api/customer/tree/:email
router.get("/:email", getCustomersByEmail);

// GET /api/customer/account/:accountId
router.get("/account/:accountId", getAccountOrgChart);

// GET /api/customer  (debug/all)
router.get("/", listCustomers);

router.put("/:email", upsertCustomer);

router.delete("/:email", deleteCustomersByEmail);

module.exports = router;
