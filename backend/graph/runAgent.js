const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* -------------------------------------------------------------
   1. LLM — ENTITY + INTENT EXTRACTION
------------------------------------------------------------- */
async function extractEntitiesFromQuery(query) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
Your job is to extract:
1. intent → one of: "user_activity", "top_performer", "unknown"
2. all person names appearing in the query (0, 1, or many)
3. timeframe converted to numerical days
4. whether date range is required but missing

Output STRICT JSON with:
{
  "intent": "...",
  "names": ["..."],
  "days": <number or null>,
  "needs_date_range": true/false
}

Rules:
- "last week" → 7
- "last month" → 30
- "last 30 days" → 30
- "yesterday" → 1
- "last quarter" → 90
- If intent is top_performer and no days provided → days=null + needs_date_range=true
`
      },
      { role: "user", content: query }
    ]
  });

  return JSON.parse(completion.choices[0].message.content);
}

/* -------------------------------------------------------------
   2. MONGODB USER LOOKUP
------------------------------------------------------------- */
async function lookupUsers(db, name) {
  // Search REAL app users
  const users = await db.collection("users").find({
    $or: [
      { displayName: { $regex: name, $options: "i" } },
      { username: { $regex: name, $options: "i" } },
      { email:    { $regex: name, $options: "i" } }
    ]
  }).toArray();

  return users;
}

/* -------------------------------------------------------------
   3. USER ACTIVITY FETCH
------------------------------------------------------------- */
async function findUserActivity(db, userId, days) {
  const since = new Date(Date.now() - days * 86400000);

  // WIGs touched by user
  const wigs = await db.collection("wigs").find({
    $or: [
      { "leadMeasures.assignedTo._id": userId },
      { "leadMeasures.comments.createdById": userId },
      { createdById:  userId },
      { modifiedById: userId }
    ],
    updatedAt: { $gte: since }
  }).toArray();

  // Customer logs
  const customerLogs = await db.collection("customers")
    .aggregate([
      { $unwind: "$logHistory" },
      {
        $match: {
          "logHistory.createdById": userId,
          "logHistory.timestamp": { $gte: since }
        }
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          email: { $first: "$email" },
          designation: { $first: "$designation" },
          accountId: { $first: "$accountId" },
          logHistory: { $push: "$logHistory" }
        }
      }
    ])
    .toArray();

  return { wigs, customerLogs };
}

/* -------------------------------------------------------------
   4. TOP PERFORMER AGGREGATION
------------------------------------------------------------- */
async function getTopPerformers(db, days) {
  const since = new Date(Date.now() - days * 86400000);

  const wigAgg = await db.collection("wigs").aggregate([
    { $match: { updatedAt: { $gte: since } } },
    {
      $project: {
        contributors: {
          $setUnion: [
            "$leadMeasures.assignedTo._id",
            "$leadMeasures.comments.createdById",
            ["$createdById"],
            ["$modifiedById"]
          ]
        }
      }
    },
    { $unwind: "$contributors" },
    {
      $group: {
        _id: "$contributors",
        wigCount: { $sum: 1 }
      }
    }
  ]).toArray();

  const customerAgg = await db.collection("customers").aggregate([
    { $unwind: "$logHistory" },
    { $match: { "logHistory.timestamp": { $gte: since } } },
    {
      $group: {
        _id: "$logHistory.createdById",
        logCount: { $sum: 1 }
      }
    }
  ]).toArray();

  const perfMap = new Map();

  wigAgg.forEach(w => {
    const id = String(w._id);
    if (!perfMap.has(id)) perfMap.set(id, { userId: w._id, wigCount: 0, logCount: 0 });
    perfMap.get(id).wigCount = w.wigCount;
  });

  customerAgg.forEach(c => {
    const id = String(c._id);
    if (!perfMap.has(id)) perfMap.set(id, { userId: c._id, wigCount: 0, logCount: 0 });
    perfMap.get(id).logCount = c.logCount;
  });

  const leaderboard = Array.from(perfMap.values())
    .map(x => ({ ...x, total: x.wigCount + x.logCount }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const userIds = leaderboard.map(x => x.userId);

  const users = await db.collection("users")
    .find({ _id: { $in: userIds } })
    .toArray();

  const userMap = new Map(users.map(u => [String(u._id), u]));

  return leaderboard.map(x => ({
    user: userMap.get(String(x.userId)),
    wigCount: x.wigCount,
    logCount: x.logCount,
    total: x.total
  }));
}

/* -------------------------------------------------------------
   5. LLM SUMMARIZATION (CORRECT BULLET FORMAT)
------------------------------------------------------------- */
async function generateActivitySummary(user, activity, days) {
  const prompt = `
Summarize the user's last ${days} days of activity STRICTLY using the provided MongoDB JSON.
Never hallucinate. If a field doesn't exist, write "Not available".

Format EXACTLY like this:

## User Summary (Last ${days} days)

### 1. Task
- task | lead measure | assignedTo | createdAt | modifiedAt

### 2. Comments
- comment text | context | timestamp

### 3. Status Updates
- status | timestamp

### 4. Customer Interaction Logs
- customer | summary | timestamp | sentiment | awareness

### 5. Summary Metrics
- total WIG items touched
- total comments
- total customer logs

-----------------------
RAW JSON:
${JSON.stringify(activity, null, 2)}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a precise summarization engine. Only use the JSON provided."
      },
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0].message.content;
}

/* -------------------------------------------------------------
   6. MAIN AGENT
------------------------------------------------------------- */
async function runAgent(query, db, explicitUserId = null) {
  if (!db) throw new Error("Database missing");

  /* --------------------------
     STEP 1: LLM INTENT PARSE
  -------------------------- */
  const info = await extractEntitiesFromQuery(query);

  /* --- Top performer mode --- */
  if (info.intent === "top_performer") {
    if (!info.days) {
      return { type: "need_date_range" };
    }

    const performers = await getTopPerformers(db, info.days);
    return { type: "top_performers", performers };
  }

  /* --------------------------
     STEP 2: USER RESOLUTION
  -------------------------- */

  const days = info.days ?? 7;
  const names = info.names;

  if (explicitUserId) {
    const user = await db.collection("users").findOne({ _id: explicitUserId });
    if (!user) return { type: "not_found", message: "Selected user not found." };

    const activity = await findUserActivity(db, user._id, days);
    const summary = await generateActivitySummary(user, activity, days);

    return {
      type: "summary",
      user,
      summary
    };
  }

  if (!names || names.length === 0) {
    return { type: "need_name" };
  }

  /* --- Resolve each name --- */
  let resolved = [];

  for (const name of names) {
    const matches = await lookupUsers(db, name);

    if (matches.length === 0) {
      return { type: "not_found", missing: [name] };
    }

    if (matches.length > 1) {
      return {
        type: "need_disambiguation",
        disambiguation: [
          {
            name,
            options: matches.map(u => ({
              id: u._id,
              displayName: u.displayName,
              email: u.email,
              region: u.region
            }))
          }
        ]
      };
    }

    resolved.push(matches[0]);
  }

  /* --------------------------
     STEP 3: MULTI SUMMARY
  -------------------------- */
  const results = [];

  for (const user of resolved) {
    const activity = await findUserActivity(db, user._id, days);
    const summary = await generateActivitySummary(user, activity, days);

    results.push({ user, summary });
  }

  return {
    type: "multi_summary",
    days,
    results
  };
}

module.exports = { runAgent };
