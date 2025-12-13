// src/pages/CreateSpoke.jsx - MINIMALIST UI REWRITE (FINAL SCHEMA)
import React, { useMemo, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

// Shared Tailwind classes for minimalist inputs
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";
const textareaStyle = "w-full p-3 border rounded-lg border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";

export default function CreateSpoke() {
  const navigate = useNavigate();

  const stored = typeof window !== "undefined" && localStorage.getItem("user");
  const currentUser = stored ? JSON.parse(stored) : null;
  
  const initialUserEmail = currentUser?.email || "";

  // --- Map accountIds: handles objects { _id, name } or simple strings ---
  const accountOptions = useMemo(() => {
    return (currentUser?.accountIds || []).map((a) => {
      // Case 1: Object structure { _id, name }
      if (typeof a === "object" && a._id && a.name) {
        return { id: a._id, name: a.name };
      }
      // Case 2: Simple string (Fallback)
      return { id: a, name: a };
    });
  }, [currentUser]);

  const [accountName, setAccountName] = useState("");

  // --- FORM STATE ---
  const [form, setForm] = useState({
    User: initialUserEmail,
    spoke: "",
    live: false,
    
    partners: "",
    whoCares: "",
    techStack: "",
    
    descriptionRelevancy: "",
    bigRockGoal: "",
    challengesPainPoints: "",
    whyMongoDB: "",
    whyNow: "",
    proofPoint: "",
    talkTrack: "",
    
    internalNotes: "",
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submitForm = async () => {
    if (!accountName) {
        alert("Please select an Account.");
        return;
    }
    if (!form.spoke?.trim()) {
        alert("Please enter a Spoke name.");
        return;
    }
    
    // 1. Find the corresponding accountId from the selected accountName
    const selectedAccount = accountOptions.find(opt => opt.name === accountName);
    
    if (!selectedAccount?.id) {
        alert("Could not find account ID for the selected account name.");
        return;
    }

    // 2. Build the payload including the required accountId
    const payload = { 
        ...form, 
        accountName: accountName,
        accountId: selectedAccount.id, 
    };

    try {
      await api.post("/spoke", payload);
      navigate("/spoke");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Save failed");
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-light text-gray-800 tracking-wide mb-8">
            Create New Spoke Record
        </h2>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            
            {/* 1. Account select (Required for accountId mapping) */}
            <div className="flex flex-col">
              <label className={labelStyle}>Account <span className="text-red-500">*</span></label>
              <select
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className={inputStyle}
              >
                <option value="">Select Account</option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-400 mt-2">
                Choose the account (from your mapped accounts)
              </div>
            </div>

            {/* 2. User read-only */}
            <div className="flex flex-col">
              <label className={labelStyle}>Seller</label>
              <input
                value={form.User}
                readOnly
                className={`${inputStyle} text-gray-500 bg-gray-50/50`}
                placeholder="logged in user email"
              />
            </div>

            {/* 3. Spoke */}
            <div className="flex flex-col">
              <label className={labelStyle}>Spoke <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.spoke}
                onChange={(e) => update("spoke", e.target.value)}
                className={inputStyle}
                placeholder="e.g., Data Lake Modernization"
              />
            </div>

            {/* 4. Live Status (Boolean field) */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center space-x-2">
                  <input
                      type="checkbox"
                      id="live-status"
                      checked={form.live}
                      onChange={(e) => update("live", e.target.checked)}
                      className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="live-status" className="font-medium text-gray-700">
                      Mark as **LIVE** (Ready for use)
                  </label>
              </div>
            </div>

            
            <div className="md:col-span-2 pt-6">
                <h3 className="text-xl font-medium text-gray-700 mb-4 border-b pb-2">Strategic Relationships</h3>
            </div>


            {/* 5. Partners */}
            <div className="md:col-span-2 flex flex-col">
              <label className={labelStyle}>Partners (Enter each partner on a new line)</label>
              <textarea
                value={form.partners}
                onChange={(e) => update("partners", e.target.value)}
                rows={3}
                className={textareaStyle}
                placeholder="AWS, Google Cloud, ISVs, SIs... (Each partner on a new line)"
              />
            </div>
            
            {/* 6. Who Cares */}
            <div className="md:col-span-2 flex flex-col">
              <label className={labelStyle}>Who Cares (Enter each persona/role on a new line)</label>
              <textarea
                value={form.whoCares}
                onChange={(e) => update("whoCares", e.target.value)}
                rows={3}
                className={textareaStyle}
                placeholder="CTO, VP of Engineering, Data Architect... (Each persona on a new line)"
              />
            </div>

            {/* 7. Tech Stack */}
            <div className="md:col-span-2 flex flex-col">
              <label className={labelStyle}>Tech Stack (Enter each technology on a new line)</label>
              <textarea
                value={form.techStack}
                onChange={(e) => update("techStack", e.target.value)}
                rows={3}
                className={textareaStyle}
                placeholder="Kafka, Kubernetes, S3, Spark... (Each technology on a new line)"
              />
            </div>

            {/* ============================================== */}
            {/* 8. 📝 CORE CONTENT & TALK TRACK FIELDS */}
            {/* ============================================== */}
            <div className="md:col-span-2 pt-6">
                <h3 className="text-xl font-medium text-gray-700 mb-4 border-b pb-2">Core Narrative & Strategy</h3>
            </div>


            {/* Description / Relevancy */}
            <div className="md:col-span-2 flex flex-col">
              <label className={labelStyle}>Description / Relevancy (Enter points on new lines)</label>
              <textarea
                value={form.descriptionRelevancy}
                onChange={(e) => update("descriptionRelevancy", e.target.value)}
                rows={4}
                className={textareaStyle}
                placeholder="What is the platform? Why is it relevant? (Each point on a new line)"
              />
            </div>
            
            {/* Big Rock Goal */}
            <div className="md:col-span-2 flex flex-col pt-4">
              <label className={labelStyle}>Big Rock / Business Goal (Enter points on new lines)</label>
              <textarea
                value={form.bigRockGoal}
                onChange={(e) => update("bigRockGoal", e.target.value)}
                rows={4}
                className={textareaStyle}
                placeholder="What is the critical business objective? (Each point on a new line)"
              />
            </div>

            {/* Why Now */}
            <div className="md:col-span-2 flex flex-col pt-4">
              <label className={labelStyle}>Why Now (Enter points on new lines)</label>
              <textarea
                value={form.whyNow}
                onChange={(e) => update("whyNow", e.target.value)}
                rows={4}
                className={textareaStyle}
                placeholder="Why is this a priority right now? (Each point on a new line)"
              />
            </div>

            {/* Challenges / Pain Points */}
            <div className="md:col-span-2 flex flex-col pt-4">
              <label className={labelStyle}>Challenges / Pain Points (Enter points on new lines)</label>
              <textarea
                value={form.challengesPainPoints}
                onChange={(e) => update("challengesPainPoints", e.target.value)}
                rows={4}
                className={textareaStyle}
                placeholder="Siloed data, legacy tech, lack of real-time... (Each point on a new line)"
              />
            </div>

            {/* Why MongoDB */}
            <div className="md:col-span-2 flex flex-col pt-4">
              <label className={labelStyle}>Why MongoDB? (Enter points on new lines)</label>
              <textarea
                value={form.whyMongoDB}
                onChange={(e) => update("whyMongoDB", e.target.value)}
                rows={4}
                className={textareaStyle}
                placeholder="Ingest flexible data, accommodate change... (Each point on a new line)"
              />
            </div>

            {/* Proof Point */}
            <div className="md:col-span-2 flex flex-col pt-4">
              <label className={labelStyle}>Proof Point (Enter points on new lines)</label>
              <textarea
                value={form.proofPoint}
                onChange={(e) => update("proofPoint", e.target.value)}
                rows={3}
                className={textareaStyle}
                placeholder="Relevant customer wins, demos... (Each point on a new line)"
              />
            </div>

            {/* Talk Track */}
            <div className="md:col-span-2 flex flex-col pt-4">
              <label className={labelStyle}>Talk Track (Enter points on new lines)</label>
              <textarea
                value={form.talkTrack}
                onChange={(e) => update("talkTrack", e.target.value)}
                rows={3}
                className={textareaStyle}
                placeholder="Key talking points for discussion (Each point on a new line)"
              />
            </div>


            {/* Internal Notes */}
            <div className="md:col-span-2 flex flex-col pt-4">
              <label className={labelStyle}>Internal Notes</label>
              <textarea
                value={form.internalNotes}
                onChange={(e) => update("internalNotes", e.target.value)}
                rows={3}
                className={textareaStyle}
                placeholder="Any internal team notes or context"
              />
            </div>
          </div>

          {/* 13. actions */}
          <div className="flex justify-end gap-3 mt-10 border-t pt-6">
            
            <button
              onClick={() => navigate("/spoke")}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Cancel
            </button>

            <button
              onClick={submitForm}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2 font-medium"
            >
                <Plus size={16} /> Create Spoke
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}