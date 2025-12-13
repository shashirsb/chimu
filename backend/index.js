// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();


const dotenv = require('dotenv');
dotenv.config();

// ✅ Initialize app FIRST
const app = express();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Import routes AFTER app is initialized
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const accountRoutes = require('./routes/accountRoutes');
const wigRoutes = require('./routes/wigRoutes');
const customerRoutes = require("./routes/customerRoutes");
const accountOrgChartRoutes = require("./routes/acctOrgChartRoutes");
 const agentRoute = require("./routes/agentRoutes");
const spokeRoutes = require('./routes/spokeRoutes');

// ... after app created and middleware registered, add:
app.use('/api/spoke', spokeRoutes);



// ✅ Use routes
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/wigs', wigRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/org-chart", accountOrgChartRoutes);



    app.use("/api/agent", agentRoute);


// ✅ Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chimu';

mongoose
  .connect(MONGO_URI, { dbName: "chimu" })
  .then(() => {
    console.log("✅ Connected to MongoDB");

    // FIX 🔥 — Attach raw MongoDB db instance for agentQuery  
    const connection = mongoose.connection;
    const nativeDb = connection.client.db("chimu");

    app.locals.db = nativeDb;   // <--- THIS FIXES THE ERROR

   
  })
  .catch((err) => console.error("❌ Mongo connection error:", err));


// ✅ Default route
app.get('/', (req, res) => {
  res.send('Chimu API is running 🚀');
});

// ✅ Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
