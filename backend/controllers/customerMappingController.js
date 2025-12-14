const Customer = require("../models/Customer");

// Ensure managers (reportingTo) have the customer in their reportees.
// reportingEmails: array of manager emails that SHOULD list this customer as a reportee.
async function ensureBidirectionalLinks(customer, reportingEmails = []) {
    // Normalise input
    reportingEmails = Array.from(new Set((reportingEmails || []).filter(Boolean)));

    // 1) Find managers that currently include this customer as a reportee (DB state)
    const existingManagers = await Customer.find({ reportees: customer.email }).select('email reportees');

    const existingEmails = new Set(existingManagers.map(m => m.email));
    const newEmails = new Set(reportingEmails);

    // 2) Compute adds and removes
    const toAdd = [...newEmails].filter(e => !existingEmails.has(e));
    const toRemove = [...existingEmails].filter(e => !newEmails.has(e));

    // 3) Add missing links (create stubs if manager not found)
    if (toAdd.length) {
        // Find any existing docs among toAdd
        const foundDocs = await Customer.find({ email: { $in: toAdd } });
        const foundEmails = new Set(foundDocs.map(d => d.email));

        // Update found docs
        for (const doc of foundDocs) {
            if (!doc.reportees) doc.reportees = [];
            if (!doc.reportees.includes(customer.email)) {
                doc.reportees.push(customer.email);
                await doc.save();
            }
        }

        // Create stubs for emails that didn't exist
        const toCreate = toAdd.filter(e => !foundEmails.has(e));
        for (const email of toCreate) {
            await Customer.create({
                name: email,
                email,
                accountId: customer.accountId,
                reportees: [customer.email]
            });
        }
    }

    // 4) Remove stale links
    if (toRemove.length) {
        const removeDocs = await Customer.find({ email: { $in: toRemove } });
        for (const doc of removeDocs) {
            if (!Array.isArray(doc.reportees)) continue;
            const filtered = doc.reportees.filter(e => e !== customer.email);
            // Only save if changed
            if (filtered.length !== doc.reportees.length) {
                doc.reportees = filtered;
                await doc.save();
            }
        }
    }
}

/* ======================================================
   Reverse: ensure each reportee lists the customer in reportingTo
   reporteesEmails: array of emails of direct reportees that SHOULD list customer in their reportingTo
   ====================================================== */
async function ensureManagersLinked(customer, reporteesEmails = []) {
    // Normalise input
    reporteesEmails = Array.from(new Set((reporteesEmails || []).filter(Boolean)));

    // 1) Find reportees that currently have this customer in reportingTo
    const existingReportees = await Customer.find({ reportingTo: customer.email }).select('email reportingTo');

    const existingEmails = new Set(existingReportees.map(r => r.email));
    const newEmails = new Set(reporteesEmails);

    // 2) Compute adds and removes
    const toAdd = [...newEmails].filter(e => !existingEmails.has(e));
    const toRemove = [...existingEmails].filter(e => !newEmails.has(e));

    // 3) Add missing links (create stubs if missing)
    if (toAdd.length) {
        const foundDocs = await Customer.find({ email: { $in: toAdd } });
        const foundEmails = new Set(foundDocs.map(d => d.email));

        for (const doc of foundDocs) {
            if (!doc.reportingTo) doc.reportingTo = [];
            if (!doc.reportingTo.includes(customer.email)) {
                doc.reportingTo.push(customer.email);
                await doc.save();
            }
        }

        const toCreate = toAdd.filter(e => !foundEmails.has(e));
        for (const email of toCreate) {
            await Customer.create({
                name: email,
                email,
                accountId: customer.accountId,
                reportingTo: [customer.email]
            });
        }
    }

    // 4) Remove stale links
    if (toRemove.length) {
        const removeDocs = await Customer.find({ email: { $in: toRemove } });
        for (const doc of removeDocs) {
            if (!Array.isArray(doc.reportingTo)) continue;
            const filtered = doc.reportingTo.filter(e => e !== customer.email);
            if (filtered.length !== doc.reportingTo.length) {
                doc.reportingTo = filtered;
                await doc.save();
            }
        }
    }
}


/* ======================================================
   POST /api/customer
   Create or update a customer + log history
   ====================================================== */
exports.upsertCustomer = async (req, res) => {
    try {
        // Extract with correct defaults
        let {
            name,
            email,
            designation,
            sentiment,
            awareness,
            decisionMaker,
            type,
            accountId,
            reportingTo = [],
            reportees = [],
            businessUnit = [],   // ✅ FIXED: properly extract array
            appNames = [],
            annualCost,
            annualMDBCost,
            monthlyMDBCost,
            tgo,
            cto,
            ao,
            location,
            stage,
            logEntry
        } = req.body;



        // Validate email
        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }



        // Normalize accountId
        if (accountId && typeof accountId === "object" && accountId._id) {
            accountId = accountId._id;
        }

        // Find existing customer
        let customer = await Customer.findOne({ email });


        /* ===========================================
           CREATE NEW CUSTOMER
           =========================================== */
        if (!customer) {
            customer = new Customer({
                name,
                email,
                designation,
                sentiment,
                awareness,
                decisionMaker,
                type,
                accountId,
                reportingTo,
                reportees,
                businessUnit,         // ✅ Save BU on create
                appNames,
                annualCost: annualCost || "$ 0.00",
                annualMDBCost: annualMDBCost || "$ 0.00",
                monthlyMDBCost: monthlyMDBCost || "$ 0.00",
                tgo: tgo || "",
                cto: cto || "",
                ao: ao || "",
                location: location || "",
                stage: stage || "",
                logHistory: []
            });
        }



        /* ===========================================
           UPDATE EXISTING CUSTOMER
           =========================================== */
        else {
            if (name !== undefined) customer.name = name;
            if (designation !== undefined) customer.designation = designation;
            if (sentiment !== undefined) customer.sentiment = sentiment;
            if (awareness !== undefined) customer.awareness = awareness;
            if (type !== undefined) customer.type = type;
            if (decisionMaker !== undefined) customer.decisionMaker = decisionMaker;
            if (accountId !== undefined) customer.accountId = accountId;

            customer.reportingTo = reportingTo;
            customer.reportees = reportees;

            // Update business units (replace, not merge)
            if (Array.isArray(businessUnit)) {
                customer.businessUnit = businessUnit;   // ✅ Correct update
            }

            // Update new fields if provided
            if (Array.isArray(appNames)) customer.appNames = appNames;
            if (annualCost !== undefined) customer.annualCost = annualCost;
            if (annualMDBCost !== undefined) customer.annualMDBCost = annualMDBCost;
            if (monthlyMDBCost !== undefined) customer.monthlyMDBCost = monthlyMDBCost;
            if (tgo !== undefined) customer.tgo = tgo;
            if (cto !== undefined) customer.cto = cto;
            if (ao !== undefined) customer.ao = ao;
            if (location !== undefined) customer.location = location;
            if (stage !== undefined) customer.stage = stage;
        }



        /* ===========================================
           Add log history entry
           =========================================== */
        if (logEntry) {
            customer.logHistory.push({
                summary: logEntry.summary,
                email: logEntry.email,
                sentiment: logEntry.sentiment || customer.sentiment,
                awareness: logEntry.awareness || customer.awareness,
                createdById: logEntry.createdById
            });
        }


        // Save customer
        await customer.save();



        // Maintain reverse links
        await ensureBidirectionalLinks(customer, reportingTo);
        await ensureManagersLinked(customer, reportees);


        res.json(customer);

    } catch (err) {
        console.error("Customer upsert failed:", err);
        res.status(500).json({
            message: "Customer update failed",
            error: err.message
        });
    }
};

/* ======================================================
   Build 5-level recursive hierarchy tree
   ====================================================== */
async function buildTree(email, depth = 0, visited = new Set()) {
    if (!email || visited.has(email) || depth > 5) return null;

    visited.add(email);

    const node = await Customer.findOne({ email });
    if (!node) return null;

    return {
        ...node.toObject(),
        reportingToTree: await Promise.all(
            node.reportingTo.map(e => buildTree(e, depth + 1, visited))
        ).then(list => list.filter(Boolean)),
        reporteesTree: await Promise.all(
            node.reportees.map(e => buildTree(e, depth + 1, visited))
        ).then(list => list.filter(Boolean))
    };
}


/* ======================================================
   GET /api/customer/tree/:email
   ====================================================== */
exports.getCustomerTree = async (req, res) => {
    try {
        const email = req.params.email;
        const tree = await buildTree(email);

        if (!tree) {
            return res.status(404).json({ error: "Customer not found" });
        }

        res.json(tree);
    } catch (err) {
        console.error("Error fetching tree:", err);
        res.status(500).json({ error: "Server error" });
    }
};

/* ======================================================
   GET /api/customer/account/:accountId
   ====================================================== */
exports.getAccountOrgChart = async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const list = await Customer.find({ accountId });
        res.json(list);
    } catch (err) {
        console.error("Error getting account org:", err);
        res.status(500).json({ error: "Server error" });
    }
};

/* ======================================================
   GET /api/customer
   ====================================================== */
exports.listCustomers = async (req, res) => {
    try {
        const list = await Customer.find();
        res.json(list);
    } catch (err) {
        console.error("Error listing customers:", err);
        res.status(500).json({ error: "Server error" });
    }
};


/* ======================================================
   DELETE /api/customer/:email
   Delete a customer and clean up all related links
   ====================================================== */
exports.deleteCustomersByEmail = async (req, res) => {
    try {
        const emailToDelete = req.params.email;

        // 1. Find the customer to get their links
        const customer = await Customer.findOne({ email: emailToDelete });

        if (!customer) {
            return res.status(404).json({ error: "Customer not found." });
        }

        // --- Clean up Organizational Chart Links ---

        // 2a. Update the customer's managers:
        // By calling ensureBidirectionalLinks with an empty array for reportingTo, 
        // we signal that the customer should be removed from all their current managers' reportees lists.
        await ensureBidirectionalLinks(customer, []);

        // 2b. Update the customer's reportees:
        // By calling ensureManagersLinked with an empty array for reportees, 
        // we signal that the customer should be removed from all their current reportees' reportingTo lists.
        await ensureManagersLinked(customer, []);

        // 3. Delete the customer record
        const result = await Customer.deleteOne({ email: emailToDelete });

        if (result.deletedCount === 0) {
            // Should not happen if customer was found, but a safety check
            return res.status(404).json({ error: "Customer not found after cleanup." });
        }

        res.status(200).json({
            message: "Customer successfully deleted and links cleaned up.",
            deletedEmail: emailToDelete
        });

    } catch (err) {
        console.error("Customer deletion failed:", err);
        res.status(500).json({
            message: "Customer deletion failed",
            error: err.message
        });
    }
};


/* ======================================================
   GET /api/customer/:email
   Fetch a single customer record by email.
   ====================================================== */
   exports.getCustomersByEmail = async (req, res) => {
    try {
        const email = req.params.email;

        // 1. Validate email parameter
        if (!email) {
            return res.status(400).json({ error: "Email parameter is required." });
        }

        // 2. Find the customer in the database
        const customer = await Customer.findOne({ email });

        // 3. Handle not found
        if (!customer) {
            return res.status(404).json({ error: "Customer not found." });
        }

        // 4. Respond with the customer data
        res.json(customer);

    } catch (err) {
        console.error("Error fetching customer by email:", err);
        // Respond with a 500 error if there's a database or server issue
        res.status(500).json({
            message: "Failed to fetch customer record.",
            error: err.message
        });
    }
};


/* ======================================================
   POST /api/customer/bulk-update
   Batch update reporting lines for multiple customers
   ====================================================== */
exports.bulkUpdateCustomers = async (req, res) => {
    try {
        const { updates, accountId } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: "No updates provided" });
        }

        // Prepare Bulk Operations for Mongoose
        const bulkOps = updates.map((u) => {
            // Optional: Security check to ensure we only update docs in the active account
            const filter = { email: u.email };
            if (accountId) {
                filter.accountId = accountId;
            }

            return {
                updateOne: {
                    filter: filter,
                    update: {
                        $set: {
                            reportingTo: u.reportingTo,
                            reportees: u.reportees
                            // We do NOT update 'updatedAt' manually here because 
                            // Mongoose timestamps usually handle it, or we can add it explicitly if needed.
                        }
                    }
                }
            };
        });

        // Execute Bulk Write
        const result = await Customer.bulkWrite(bulkOps);

        res.json({
            success: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        });

    } catch (err) {
        console.error("Bulk update failed:", err);
        res.status(500).json({
            message: "Bulk update failed",
            error: err.message
        });
    }
};