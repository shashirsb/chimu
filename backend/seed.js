// server/seed.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const faker = require("faker");
const User = require("./models/User");
const Account = require("./models/Account");
const Wig = require("./models/Wig");
const Customer = require("./models/Customer");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chimu";

// ----------------------------------------
//  Hardcoded email domains per account
// ----------------------------------------
const accountDomains = {
  "DHL": "dhl.com",
  "Bosch": "bosch.com",
  "HDFC Bank": "hdfcbank.com",
  "JPMC": "jpmc.com"
};

const roles = ["Admin", "Lead", "Member"];
const regions = ["Global", "APAC", "EMEA"];
const statusOptions = ["on_track", "at_risk", "off_track"];
const wigValidityTypes = ["weekly", "monthly", "quarterly", "halfyearly"];

const wigTypeAllowedMeasureTypes = {
  wig: ["lead"],
  champion: ["tech", "business"],
  task: ["task"],
  opportunity: ["nbm", "tfw", "sizing"]
};

const allowedMeasureTypes = [
  "lead", "tech", "business",
  "task",
  "nbm", "tfw", "sizing"
];

// ----------------------------------------
//  Hierarchy Rank (lower = more senior)
// ----------------------------------------
const roleRank = {
  economicBuyer: 1,
  businessChampion: 2,
  techChampion: 3,
  coach: 4,
  influential: 5,
  detractor: 6,
  unknown: 7,
  noPower: 8
};

// ----------------------------------------
//  Names + Designations
// ----------------------------------------
const names = [
  "Joe", "Michael", "Kristina", "Cathy", "Alice", "Bob", "Eve", "John", "Sara", "Leo",
  "Nina", "Paul", "Olivia", "David", "Sophia", "James", "Emma", "Liam", "Mia", "Noah",
  "Chloe", "Lucas", "Amelia", "Mason", "Ella", "William", "Robert", "Krish", "Anika",
  "Priya", "Ravi", "Suresh", "Asha", "Nikhil", "Meera", "Vikram", "Arun", "Sunita", "Karan"
];

const designationsByType = {
  economicBuyer: [
    "Vice President – Technology", "Vice President – Operations", "CIO", "CTO", "Head of Procurement",
    "Director – Technology & Infra", "Chief Digital Officer", "Senior Vice President – IT",
    "Director – Finance", "Head of Finance"
  ],
  businessChampion: [
    "Product Owner", "Senior Business Manager", "Transformation Lead", "Director – Business Operations",
    "Business Process Manager", "Strategy & Innovation Lead", "Program Manager",
    "Head of Digital Initiatives", "Senior Business Analyst", "Business Solutions Manager"
  ],
  techChampion: [
    "Senior Solutions Architect", "Lead Cloud Architect", "Platform Engineering Lead",
    "Senior DevOps Engineer", "Principal Software Engineer", "Data Engineering Lead",
    "IT Systems Architect", "Technology Innovation Lead", "Engineering Manager", "AI/ML Architect"
  ],
  coach: [
    "IT Manager", "Senior Engineering Manager", "Enterprise Architect", "Infrastructure Manager",
    "Head of Cloud Engineering", "Database Administration Lead", "DevOps Manager",
    "Platform Engineering Manager"
  ],
  influential: [
    "Senior Architect", "Senior Business Manager", "Lead Product Manager", "Senior Consultant",
    "Operations Lead", "Solutions Consultant", "Senior Project Manager", "Enterprise Program Lead"
  ],
  unknown: [
    "Consultant", "Associate", "Analyst", "Manager", "Specialist", "Executive", "Advisor"
  ],
  noPower: [
    "Software Engineer", "Data Analyst", "IT Support Engineer", "Junior Developer", "Business Analyst",
    "Cloud Support Engineer", "Operations Executive", "Associate Engineer", "Tech Support Analyst", "QA Engineer"
  ],
  detractor: [],
};

// ----------------------------------------
//  Utility helpers
// ----------------------------------------
function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickDesignation(type) { return getRandom(designationsByType[type]); }

function generateUniqueTitle(existingTitles) {
  let title = faker.company.catchPhrase() + " " + faker.hacker.adjective();
  while (existingTitles.has(title)) {
    title = faker.company.catchPhrase() + " " + faker.hacker.adjective();
  }
  existingTitles.add(title);
  return title;
}

// ----------------------------------------
// Validity Period Generator
// ----------------------------------------
function buildValidityPeriod(type) {
  const now = new Date();
  const start = new Date(now.getTime() - randomInt(0, 15) * 86400000);
  const expiry = new Date(start);

  switch (type) {
    case "weekly": expiry.setDate(expiry.getDate() + randomInt(7, 14)); break;
    case "monthly": expiry.setMonth(expiry.getMonth() + randomInt(1, 2)); break;
    case "quarterly": expiry.setMonth(expiry.getMonth() + randomInt(3, 5)); break;
    case "halfyearly": expiry.setMonth(expiry.getMonth() + randomInt(6, 7)); break;
    default: expiry.setMonth(expiry.getMonth() + 3);
  }

  return {
    type,
    startDate: start.toISOString(),
    expiryDate: expiry.toISOString()
  };
}

// ----------------------------------------
//  Stakeholder Picker (Preferred Senior Roles)
// ----------------------------------------
function pickStakeholdersForAccount(accountEmails, customersByType, count = 2) {
  const pool = [];

  // Build weighted pool by seniority
  Object.keys(customersByType)
    .sort((a, b) => roleRank[a] - roleRank[b])
    .forEach(type => {
      const weight = Math.max(1, 8 - roleRank[type]); // higher role = more weight
      customersByType[type].forEach(cust => {
        for (let i = 0; i < weight; i++) {
          pool.push(cust.email);
        }
      });
    });

  if (pool.length === 0) return [];

  const shuffled = faker.helpers.shuffle(pool);
  const selected = [...new Set(shuffled)].slice(0, count);
  return selected;
}

// =======================================================================
// MAIN SEED FUNCTION
// =======================================================================

(async () => {
  try {
    console.log("🌱 Starting database seeding...");

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "chimu"
    });

    // Clean DB
    await Promise.all([
      User.deleteMany({}),
      Account.deleteMany({}),
      Wig.deleteMany({}),
      Customer.deleteMany({})
    ]);

    // ----------------------------------------
    // Create Accounts (NO domain stored in DB)
    // ----------------------------------------
    const accountDocs = await Account.insertMany([
      { name: "DHL", region: ["Global"], description: "Global logistics leader" },
      { name: "Bosch", region: ["EMEA", "APAC"], description: "Mobility & consumer tech supplier" },
      { name: "HDFC Bank", region: ["APAC"], description: "India's largest private bank" },
      { name: "JPMC", region: ["Global"], description: "Global financial services firm" }
    ]);

    console.log("✅ Accounts seeded.");

    // ---------------------------
    // SEED.JS — PART 2/2 (continued)
    // ---------------------------

    // ----------------------------------------
    // Hardcoded domains map (local variable used below)
    // ----------------------------------------
    const accountDomainsLocal = accountDomains; // from part 1 top-level

    // ------------------------
    // Create Users
    // ------------------------
    const users = [];

    // Fixed USERS
    const adminUser = await new User({
      username: "admin",
      displayName: "System Admin",
      email: "admin@chimu.io",
      password: "Admin@123",
      roles: ["Admin"],
      region: "Global",
      accountIds: accountDocs.map(a => ({ _id: a._id, name: a.name }))
    }).save();

    const leadUser = await new User({
      username: "lead_user",
      displayName: "Team Lead",
      email: "lead@chimu.io",
      password: "Lead@123",
      roles: ["Lead"],
      region: "APAC",
      accountIds: [{ _id: accountDocs[0]._id, name: accountDocs[0].name }]
    }).save();

    const memberUser = await new User({
      username: "member_user",
      displayName: "Team Member",
      email: "member@chimu.io",
      password: "Member@123",
      roles: ["Member"],
      region: "APAC",
      accountIds: [
        { _id: accountDocs[0]._id, name: accountDocs[0].name },
        { _id: accountDocs[2]._id, name: accountDocs[2].name }
      ]
    }).save();

    users.push(adminUser, leadUser, memberUser);

    // Random Users (25)
    for (let i = 0; i < 25; i++) {
      const nm = names[i % names.length];
      const username = `${nm.toLowerCase()}_${Math.floor(Math.random() * 900 + 100)}`;
      const region = getRandom(regions);
      const role = getRandom(roles);
      const accountCount = Math.floor(Math.random() * 3) + 1;
      const assignedAccounts = faker.helpers
        .shuffle(accountDocs)
        .slice(0, accountCount)
        .map(a => ({ _id: a._id, name: a.name }));

      const randomUser = new User({
        username,
        displayName: nm,
        email: `${username}@chimu.io`,
        password: "Password@123",
        roles: [role],
        region,
        accountIds: assignedAccounts
      });

      await randomUser.save();
      users.push(randomUser);
    }

    console.log(`✅ ${users.length} users seeded.`);

    // -------------------------
    // Customers (Option A hierarchy per account)
    // Each account: economicBuyer:1, businessChampion:2, techChampion:3,
    // technicalBuyer:4, influential:4, unknown:4, noPower:6  => 24 per account
    // Add +1 noPower per account => 25 per account => 100 total
    // -------------------------
    const perLayerCounts = {
      economicBuyer: 1,
      businessChampion: 2,
      techChampion: 3,
      coach: 4,
      influential: 4,
      detractor: 4,
      unknown: 4,
      noPower: 6
    };

    const customers = [];
    const accountCustomerBuckets = {}; // accountId -> [emails]
    const customersByAccountAndType = {}; // accountId -> { typeName: [customerObjs...] }

    // create customers per account and per-layer
    for (const a of accountDocs) {
      const acctId = a._id.toString();
      accountCustomerBuckets[acctId] = [];
      customersByAccountAndType[acctId] = {};
      Object.keys(perLayerCounts).forEach(type => customersByAccountAndType[acctId][type] = []);

      // create main layers
      Object.entries(perLayerCounts).forEach(([type, cnt]) => {
        for (let i = 0; i < cnt; i++) {
          const first = faker.name.firstName().toLowerCase();
          const last = faker.name.lastName().toLowerCase();
          const localPart = `${first}.${last}${Math.floor(Math.random() * 900 + 100)}`;
          const domain = accountDomainsLocal[a.name] || `${a.name.toLowerCase().replace(/\s+/g, "")}.com`;
          const email = `${localPart}@${domain}`;
          const name = `${faker.company.companyName()} - ${first.charAt(0).toUpperCase() + first.slice(1)}`;
          const designation = pickDesignation(type);

          const cust = {
            name,
            email,
            designation,
            sentiment: getRandom(["High", "Medium", "Low", "Unknown"]),
            awareness: getRandom(["High", "Medium", "Low", "Unknown"]),
            decisionMaker: (type === "economicBuyer" || type === "businessChampion"),
            type,
            accountId: a._id,
            reportingTo: [],
            reportees: [],
            logHistory: []
          };

          // logs (1-3)
          const logCount = randomInt(1, 3);
          for (let l = 0; l < logCount; l++) {
            const cb = getRandom(users);
            cust.logHistory.push({
              timestamp: new Date(Date.now() - randomInt(0, 180) * 24 * 60 * 60 * 1000),
              summary: faker.lorem.sentence(),
              email: cust.email,
              sentiment: getRandom(["High", "Medium", "Low", "Unknown"]),
              awareness: getRandom(["High", "Medium", "Low", "Unknown"]),
              createdById: cb._id
            });
          }

          customers.push(cust);
          accountCustomerBuckets[acctId].push(cust.email);
          customersByAccountAndType[acctId][type].push(cust);
        }
      });

      // Add one extra noPower to reach 25 per account
      const extraFirst = faker.name.firstName().toLowerCase();
      const extraLast = faker.name.lastName().toLowerCase();
      const extraLocal = `${extraFirst}.${extraLast}${Math.floor(Math.random() * 900 + 100)}`;
      const extraDomain = accountDomainsLocal[a.name] || `${a.name.toLowerCase().replace(/\s+/g, "")}.com`;
      const extraEmail = `${extraLocal}@${extraDomain}`;
      const extraCust = {
        name: `${faker.company.companyName()} - ${extraFirst.charAt(0).toUpperCase() + extraFirst.slice(1)}`,
        email: extraEmail,
        designation: pickDesignation("noPower"),
        sentiment: getRandom(["High", "Medium", "Low", "Unknown"]),
        awareness: getRandom(["High", "Medium", "Low", "Unknown"]),
        decisionMaker: false,
        type: "noPower",
        accountId: a._id,
        reportingTo: [],
        reportees: [],
        logHistory: []
      };
      const extraLogs = randomInt(1, 3);
      for (let l = 0; l < extraLogs; l++) {
        const cb = getRandom(users);
        extraCust.logHistory.push({
          timestamp: new Date(Date.now() - randomInt(0, 180) * 24 * 60 * 60 * 1000),
          summary: faker.lorem.sentence(),
          email: extraCust.email,
          sentiment: getRandom(["High", "Medium", "Low", "Unknown"]),
          awareness: getRandom(["High", "Medium", "Low", "Unknown"]),
          createdById: cb._id
        });
      }
      customers.push(extraCust);
      accountCustomerBuckets[acctId].push(extraCust.email);
      customersByAccountAndType[acctId]["noPower"].push(extraCust);
    }

    // Build reportingTo/reportees strictly respecting hierarchy (lower -> higher)
    for (const a of accountDocs) {
      const acctId = a._id.toString();
      // ordered types by seniority low -> high (economicBuyer most senior)
      const orderedTypes = Object.keys(roleRank).sort((x, y) => roleRank[x] - roleRank[y]); // economicBuyer ... noPower
      // iterate from lowest rank (noPower) upward to assign reportingTo
      for (let idx = orderedTypes.length - 1; idx >= 0; idx--) {
        const type = orderedTypes[idx];
        const group = customersByAccountAndType[acctId][type] || [];
        if (roleRank[type] === 1) continue; // economicBuyer highest, no reportingTo
        const higherTypes = orderedTypes.slice(0, idx); // more senior types
        const higherPool = [];
        higherTypes.forEach(ht => {
          const list = customersByAccountAndType[acctId][ht] || [];
          list.forEach(c => higherPool.push(c));
        });
        // assign reporting for each member in this group
        for (const member of group) {
          if (higherPool.length === 0) {
            member.reportingTo = [];
            continue;
          }
          const rtCount = Math.random() < 0.85 ? 1 : Math.min(2, higherPool.length);
          const chosen = faker.helpers.shuffle(higherPool).slice(0, rtCount);
          member.reportingTo = chosen.map(c => c.email);
          chosen.forEach(ch => {
            if (!ch.reportees) ch.reportees = [];
            ch.reportees.push(member.email);
          });
        }
      }
    }

    // Insert customers into DB
    const createdCustomers = await Customer.insertMany(customers);
    console.log(`✅ ${createdCustomers.length} customers seeded.`);

    // Build email -> customer map for lookups
    const createdCustomerMap = {};
    createdCustomers.forEach(c => { createdCustomerMap[c.email] = c; });

    // -------------------------
    // WIGS (25) - leadMeasures only
    // Stakeholders chosen from created customers (same account) preferring senior roles
    // -------------------------
    const totalWigs = 25;
    const wigTypesRequired = ["wig", "champion", "task", "opportunity"];
    const wigTypePool = [];
    wigTypesRequired.forEach(t => wigTypePool.push(t));
    while (wigTypePool.length < totalWigs) wigTypePool.push(getRandom(wigTypesRequired));
    faker.helpers.shuffle(wigTypePool);

    const measureTypesSeen = new Set();
    const wigs = [];
    const usedTitles = new Set();

    for (let i = 0; i < totalWigs; i++) {
      const wType = wigTypePool[i];
      const account = getRandom(accountDocs);
      const owner = getRandom(users);
      const measureCount = randomInt(1, 4);
      const leadMeasures = [];
      const acctId = account._id.toString();
      const custsByTypeForAccount = customersByAccountAndType[acctId];

      for (let m = 0; m < measureCount; m++) {
        const allowed = wigTypeAllowedMeasureTypes[wType];
        let subType = getRandom(allowed);

        const eligibleUsers = users.filter(u => u.accountIds.some(a => a._id.toString() === acctId));
        const assignedCount = Math.min(eligibleUsers.length, randomInt(1, Math.min(3, Math.max(1, eligibleUsers.length))));
        const assignedTo = faker.helpers.shuffle(eligibleUsers).slice(0, assignedCount).map(u => ({ _id: u._id, name: u.username }));

        // stakeholders: choose from createdCustomers in same account with seniority preference
        const stakeholders = [];
        const stakeholdersCount = Math.min(Math.max(1, randomInt(1, 3)), accountCustomerBuckets[acctId].length || 1);
        const stakeholderEmails = pickStakeholdersForAccount(accountCustomerBuckets[acctId], custsByTypeForAccount, stakeholdersCount);
        stakeholderEmails.forEach(se => {
          const email = typeof se === "string" ? se : (se.email || "");
          const customerObj = createdCustomerMap[email] || customers.find(c => c.email === email);
          stakeholders.push({
            name: customerObj ? customerObj.name : (email.split ? email.split("@")[0] : String(email)),
            email
          });
        });

        // comments
        const comments = [];
        const cmCount = randomInt(0, 3);
        for (let c = 0; c < cmCount; c++) {
          const cb = getRandom(users);
          comments.push({
            text: faker.lorem.sentences(randomInt(1, 2)),
            createdAt: new Date(Date.now() - randomInt(0, 120) * 24 * 60 * 60 * 1000),
            createdById: cb._id,
            createdByName: cb.displayName || cb.username
          });
        }

        const name = wType === "opportunity" ? faker.company.bsNoun() : faker.hacker.verb() + " " + faker.hacker.noun();
        const targetValue = randomInt(10, 100);
        const currentValue = Math.floor(Math.random() * (targetValue + 1));

        measureTypesSeen.add(subType);

        leadMeasures.push({
          name,
          type: subType,
          targetValue,
          currentValue,
          assignedTo,
          stakeholdersContact: stakeholders,
          comments,
          createdById: owner._id,
          createdByName: owner.displayName || owner.username,
          modifiedById: owner._id,
          modifiedByName: owner.displayName || owner.username,
          createdAt: new Date(),
          modifiedAt: new Date()
        });
      }

      const vp = buildValidityPeriod(getRandom(wigValidityTypes));

      const wig = {
        accountId: account._id,
        accountName: account.name,
        type: wType,
        title: generateUniqueTitle(usedTitles),
        statement: faker.lorem.sentence(),
        validityPeriod: { type: vp.type, startDate: vp.startDate, expiryDate: vp.expiryDate },
        leadMeasures,
        ownerId: owner._id,
        ownerName: owner.displayName || owner.username,
        createdById: owner._id,
        createdByName: owner.displayName || owner.username,
        modifiedById: owner._id,
        modifiedByName: owner.displayName || owner.username,
        status: getRandom(statusOptions),
        progress: Math.floor(Math.random() * 100),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      wigs.push(wig);
    }

    // Ensure all allowed measure subtypes appear at least once
    const missingMeasureTypes = allowedMeasureTypes.filter(t => !measureTypesSeen.has(t));
    missingMeasureTypes.forEach(mt => {
      const wigIdx = Math.floor(Math.random() * wigs.length);
      const wig = wigs[wigIdx];
      const account = accountDocs.find(a => a._id.toString() === wig.accountId.toString());
      const owner = getRandom(users);
      const acctId = account._id.toString();
      const eligibleUsers = users.filter(u => u.accountIds.some(a => a._id.toString() === acctId));
      const assignedTo = faker.helpers.shuffle(eligibleUsers).slice(0, Math.min(3, eligibleUsers.length)).map(u => ({ _id: u._id, name: u.username }));
      const custsByTypeForAccount = customersByAccountAndType[acctId] || {};
      const stakeholderEmails = pickStakeholdersForAccount(accountCustomerBuckets[acctId], custsByTypeForAccount, Math.min(2, accountCustomerBuckets[acctId].length || 1));
      const stakeholders = stakeholderEmails.map(se => {
        const email = typeof se === "string" ? se : (se.email || "");
        const customerObj = createdCustomerMap[email] || customers.find(c => c.email === email);
        return { name: customerObj ? customerObj.name : (email.split ? email.split("@")[0] : String(email)), email };
      });
      const target = randomInt(10, 80);
      const curr = Math.floor(Math.random() * (target + 1));
      wig.leadMeasures.push({
        name: `auto-${mt}-${faker.hacker.verb()}`,
        type: mt,
        targetValue: target,
        currentValue: curr,
        assignedTo,
        stakeholdersContact: stakeholders,
        comments: [{
          text: "Auto-added measure to satisfy variety",
          createdAt: new Date(),
          createdById: owner._id,
          createdByName: owner.displayName || owner.username
        }],
        createdById: owner._id,
        createdByName: owner.displayName || owner.username,
        modifiedById: owner._id,
        modifiedByName: owner.displayName || owner.username,
        createdAt: new Date(),
        modifiedAt: new Date()
      });
    });

    // Insert wigs
    const createdWigs = await Wig.insertMany(wigs);
    console.log(`✅ ${createdWigs.length} WIGs seeded.`);

    // Optional: print summary counts by account & role
    const summary = {};
    createdCustomers.forEach(c => {
      const acc = c.accountId.toString();
      if (!summary[acc]) summary[acc] = {};
      summary[acc][c.type] = (summary[acc][c.type] || 0) + 1;
    });
    console.log("📊 Customer distribution by account and type:");
    accountDocs.forEach(a => {
      const acc = a._id.toString();
      console.log(`- ${a.name}:`);
      Object.keys(perLayerCounts).concat(["noPower"]).forEach(t => {
        const num = (summary[acc] && summary[acc][t]) || 0;
        console.log(`   ${t}: ${num}`);
      });
    });

    console.log("🌿 Seeding complete.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
})();
