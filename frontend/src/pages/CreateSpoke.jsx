// src/pages/CreateSpoke.jsx - REVISED WITH ERROR POPUP
import React, { useMemo, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react"; // Added X for the popup

// --- 1. NEW: Error Popup Component ---
const ErrorPopup = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-500">
                <div className="flex justify-between items-start p-5">
                    <div>
                        <h3 className="text-lg font-semibold text-red-700">Creation Failed</h3>
                        <p className="mt-1 text-sm text-gray-600">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        aria-label="Close error message"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
// ------------------------------------

// Shared Tailwind classes (unchanged)
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";
const textareaStyle = "w-full p-3 border rounded-lg border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";

export default function CreateSpoke() {
  const navigate = useNavigate();

  const stored = typeof window !== "undefined" && localStorage.getItem("user");
  const currentUser = stored ? JSON.parse(stored) : null;
  
  const initialUserEmail = currentUser?.email || "";

  // --- 2. NEW: State for error/submitting ---
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountOptions = useMemo(() => {
    return (currentUser?.accountIds || []).map((a) => {
      if (typeof a === "object" && a._id && a.name) {
        return { id: a._id, name: a.name };
      }
      return { id: a, name: a };
    });
  }, [currentUser]);

  const [accountName, setAccountName] = useState("");

  // --- FORM STATE --- (unchanged)
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
    setError(null);
    setIsSubmitting(true);

    // --- 3. ENHANCED: Internal Validation & Account ID Resolution ---
    if (!accountName) {
        setError("Please select an Account from the dropdown.");
        setIsSubmitting(false);
        return;
    }
    if (!form.spoke?.trim()) {
        setError("Please enter a Spoke name. This is required.");
        setIsSubmitting(false);
        return;
    }
    
    const selectedAccount = accountOptions.find(opt => opt.name === accountName);
    
    if (!selectedAccount?.id) {
        setError(`Could not find a valid Account ID for the selected account "${accountName}". Ensure your user profile is correctly mapped.`);
        setIsSubmitting(false);
        return;
    }

    // Prepare payload (convert multiline strings back to arrays)
    const payload = { 
        ...form, 
        accountName: accountName,
        accountId: selectedAccount.id,
        
        // CRITICAL: Convert multiline string fields back into arrays for the server
        partners: form.partners?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        whoCares: form.whoCares?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        techStack: form.techStack?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        descriptionRelevancy: form.descriptionRelevancy?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        bigRockGoal: form.bigRockGoal?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [], 
        challengesPainPoints: form.challengesPainPoints?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        whyMongoDB: form.whyMongoDB?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        whyNow: form.whyNow?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        proofPoint: form.proofPoint?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
        talkTrack: form.talkTrack?.split('\n').map(s => s.trim()).filter(s => s.length > 0) || [],
    };

    try {
      await api.post("/spoke", payload);
      navigate("/spoke"); // Success
    } catch (err) {
      // --- 4. ENHANCED: Error handling for submission ---
      console.error("Spoke creation failed:", err);
      
      let userMessage = "Spoke record creation failed due to a server error or network issue.";

      if (err.response) {
          if (err.response.status === 400 && err.response.data?.message) {
              // Validation error from the backend
              userMessage = `Validation Error: ${err.response.data.message}`;
          } else if (err.response.status === 403) {
              userMessage = "You do not have permission to create Spoke records.";
          } else {
              userMessage = `Creation failed: Server responded with ${err.response.status}.`;
          }
      }
      setError(userMessage);
    } finally {
        setIsSubmitting(false);
    }
  };

  // Extract only the names for the select options
  const accountNames = accountOptions.map(a => a.name);


  return (
    <div className="p-8 min-h-screen bg-gray-50">
        
        {/* RENDER THE POPUP */}
        <ErrorPopup 
            message={error} 
            onClose={() => setError(null)} 
        />

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
                disabled={isSubmitting}
              >
                <option value="">Select Account</option>
                {accountNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>

            {/* 8. CORE CONTENT & TALK TRACK FIELDS */}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* actions */}
          <div className="flex justify-end gap-3 mt-10 border-t pt-6">
            
            <button
              onClick={() => navigate("/spoke")}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              onClick={submitForm}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2 font-medium disabled:bg-teal-400 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
                <Plus size={16} /> {isSubmitting ? "Creating..." : "Create Spoke"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}