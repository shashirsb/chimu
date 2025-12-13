const Customer = require("../models/Customer");

exports.getCustomersByAccount = async (req, res) => {
  try {
    const { accountId } = req.params; // e.g., "DHL", "BOSCH"

    // Fetch all customers for that account
    const customers = await Customer.find({ accountId }).lean();

    if (!customers.length) {
      return res.json([]);
    }

    // --------------------------------------------
    // 🔧 Auto-fix reportees for missing entries
    // --------------------------------------------
    const map = {};
    customers.forEach((c) => (map[c.email.toLowerCase()] = c));

    customers.forEach((person) => {
      (person.reportingTo || []).forEach((mgrEmail) => {
        const mgr = map[mgrEmail?.toLowerCase()];
        if (mgr) {
          if (!mgr.reportees) mgr.reportees = [];
          if (!mgr.reportees.includes(person.email)) {
            mgr.reportees.push(person.email);
          }
        }
      });
    });

    res.json(customers);
  } catch (err) {
    console.error("❌ Error fetching customers by account:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
