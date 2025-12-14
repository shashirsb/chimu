// src/pages/EditSpoke.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Save, X } from "lucide-react";

// --- 1. NEW: Error Popup Component ---
const ErrorPopup = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-500">
                <div className="flex justify-between items-start p-5">
                    <div>
                        <h3 className="text-lg font-semibold text-red-700">Operation Failed</h3>
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

// Utility to convert [String] to "\n" separated String for Textarea (unchanged)
const arrayToString = (arr) => (Array.isArray(arr) ? arr.filter(s => s?.trim()).join('\n') : "");
// Utility to convert "\n" separated String from Textarea to [String] for Payload (unchanged)
const stringToArray = (str) => {
    if (!str) return [];
    return String(str).split('\n').map(s => s.trim()).filter(s => s.length > 0);
};


export default function EditSpoke() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    // User data derived from localStorage (unchanged)
    const stored = typeof window !== "undefined" && localStorage.getItem("user");
    const currentUser = stored ? JSON.parse(stored) : null;
    const userEmail = currentUser?.email || "";
    const userAccountIds = currentUser?.accountIds || [];

    const accountOptions = useMemo(() => {
        return userAccountIds.map((a) => {
            if (typeof a === "object" && (a._id || a.id) && a.name) {
                return { id: a._id || a.id, name: a.name };
            }
            return { id: a, name: a };
        });
    }, [userAccountIds]);

    const existing = location.state?.spoke || null;

    // --- STATE ---
    const [loading, setLoading] = useState(true); // NEW: Loading state for initial fetch
    const [isSaving, setIsSaving] = useState(false); // NEW: Saving state
    const [error, setError] = useState(null); // NEW: Error state for popup

    const [form, setForm] = useState({
        accountName: "",
        accountId: "", 
        User: userEmail,
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

    
    // ----------------------------
    // LOAD EXISTING SPOKE
    // ----------------------------
    useEffect(() => {
        const load = async () => {
            try {
                let data = existing;

                if (!data && id) {
                    const res = await api.get(`/spoke/${id}`);
                    data = res.data;
                }

                if (data) {
                    setForm((p) => ({
                        ...p,
                        ...(data || {}), 
                        
                        accountId: data.accountId || "", 
                        spoke: data.Spoke || data.spoke || "", 
                        internalNotes: data.Notes || data.internalNotes || "",

                        partners: arrayToString(data.partners),
                        whoCares: arrayToString(data.whoCares),
                        techStack: arrayToString(data.techStack),
                        descriptionRelevancy: arrayToString(data.descriptionRelevancy),
                        bigRockGoal: arrayToString(data.bigRockGoal), 
                        challengesPainPoints: arrayToString(data.challengesPainPoints),
                        whyMongoDB: arrayToString(data.whyMongoDB),
                        whyNow: arrayToString(data.whyNow),
                        proofPoint: arrayToString(data.proofPoint),
                        talkTrack: arrayToString(data.talkTrack),

                        User: data.User || userEmail,
                        live: !!data.live,
                    }));
                }
                setLoading(false); // Success path
            } catch (err) {
                // --- ENHANCED: Error handling for initial load ---
                console.error("Failed loading spoke:", err);
                setLoading(false); // Stop loading

                let userMessage = "Failed to retrieve the Spoke record. Please check the network.";

                if (err.response) {
                    if (err.response.status === 404) {
                        userMessage = `Spoke ID ${id} was not found. It may have been deleted.`;
                    } else if (err.response.status === 403) {
                        userMessage = "You do not have permission to view this Spoke.";
                    } else {
                        userMessage = `Data fetch failed: ${err.response.statusText} (${err.response.status}).`;
                    }
                }
                setError(userMessage); // Set error state to show popup
            }
        };

        load();
    }, [id, existing, userEmail]); 

    const handleAccountChange = (value) => {
        const selectedAccount = accountOptions.find(opt => opt.name === value);

        setForm((p) => ({ 
            ...p, 
            accountName: value,
            accountId: selectedAccount ? selectedAccount.id : "",
        }));
    };

    const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    // ----------------------------
    // SAVE = UPDATE (PUT)
    // ----------------------------
    const save = async () => {
        if (!form.accountId) {
            setError("Cannot save: The associated Account ID is missing.");
            return;
        }

        setIsSaving(true);
        setError(null); // Clear previous errors

        try {
            // CRITICAL: Convert all multiline string fields back into arrays for the server
            const payload = { 
                ...form,
                partners: stringToArray(form.partners),
                whoCares: stringToArray(form.whoCares),
                techStack: stringToArray(form.techStack),
                descriptionRelevancy: stringToArray(form.descriptionRelevancy),
                bigRockGoal: stringToArray(form.bigRockGoal), 
                challengesPainPoints: stringToArray(form.challengesPainPoints),
                whyMongoDB: stringToArray(form.whyMongoDB),
                whyNow: stringToArray(form.whyNow),
                proofPoint: stringToArray(form.proofPoint),
                talkTrack: stringToArray(form.talkTrack),
                
                accountName: form.accountName,
                accountId: form.accountId,
            };

            await api.put(`/spoke/${id}`, payload);
            navigate("/spoke"); // Success: navigate away
        } catch (err) {
            // --- ENHANCED: Error handling for update operation ---
            console.error(err.response?.data?.error || "Update failed", err);
            
            let userMessage = "Failed to save the Spoke record. Please check the form data and try again.";

            if (err.response) {
                if (err.response.status === 400 && err.response.data?.message) {
                    // Validation or bad request error
                    userMessage = `Validation Error: ${err.response.data.message}`;
                } else if (err.response.status === 403) {
                    userMessage = "You do not have permission to edit this Spoke record.";
                } else {
                    userMessage = `Update failed: ${err.response.statusText} (${err.response.status}).`;
                }
            }
            setError(userMessage); // Set error state to show popup
        } finally {
            setIsSaving(false);
        }
    };

    if (!id) return <div className="p-8 text-red-600">Error: Spoke ID not found in URL.</div>;
    
    // Display loading state if data is still fetching and no error occurred
    if (loading && !error) return <div className="p-8 min-h-screen bg-gray-50 text-gray-600">Loading Spoke record...</div>;

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
                Edit Spoke Record
            </h2>
      
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
      
                {/* 1. 📂 Core Record & Ownership Details */}
                
                {/* Account */}
                <div className="flex flex-col">
                  <label className={labelStyle}>Account</label>
                  <select
                    value={form.accountName}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className={inputStyle}
                    // Prevent changing accountName on edit
                    disabled={true} 
                  >
                    <option value="">Select Account</option>
                    {accountNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
      
                {/* User (Read-only) */}
                <div className="flex flex-col">
                  <label className={labelStyle}>Seller</label>
                  <input
                    value={form.User}
                    readOnly
                    className={`${inputStyle} text-gray-500 bg-gray-50/50`}
                    placeholder="logged in user email"
                  />
                </div>
                
                {/* Spoke (TEXT INPUT) */}
                <div className="flex flex-col">
                  <label className={labelStyle}>Spoke</label>
                  <input
                    type="text" 
                    value={form.spoke}
                    onChange={(e) => update("spoke", e.target.value)}
                    className={inputStyle}
                    placeholder="e.g., Data Lake Modernization"
                    disabled={isSaving}
                  />
                </div>

                {/* Live Status (Boolean field) */}
                <div className="flex flex-col justify-end">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="live-status"
                            checked={form.live}
                            onChange={(e) => update("live", e.target.checked)}
                            className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            disabled={isSaving}
                        />
                        <label htmlFor="live-status" className="font-medium text-gray-700">
                            Mark as **LIVE** (Ready for use)
                        </label>
                    </div>
                </div>

                
                {/* 2. 👥 Strategic Relationships & Tech Stack */}
                <div className="md:col-span-2 pt-6">
                    <h3 className="text-xl font-medium text-gray-700 mb-4 border-b pb-2">Strategic Relationships</h3>
                </div>

                {/* Partners */}
                <div className="md:col-span-2 flex flex-col">
                    <label className={labelStyle}>Partners (Enter each partner on a new line)</label>
                    <textarea
                        value={form.partners}
                        onChange={(e) => update("partners", e.target.value)}
                        rows={3}
                        className={textareaStyle}
                        placeholder="AWS, Google Cloud, ISVs, SIs... (Each partner on a new line)"
                        disabled={isSaving}
                    />
                </div>
                
                {/* Who Cares */}
                <div className="md:col-span-2 flex flex-col">
                    <label className={labelStyle}>Who Cares (Enter each persona/role on a new line)</label>
                    <textarea
                        value={form.whoCares}
                        onChange={(e) => update("whoCares", e.target.value)}
                        rows={3}
                        className={textareaStyle}
                        placeholder="CTO, VP of Engineering, Data Architect... (Each persona on a new line)"
                        disabled={isSaving}
                    />
                </div>

                {/* Tech Stack */}
                <div className="md:col-span-2 flex flex-col">
                    <label className={labelStyle}>Tech Stack (Enter each technology on a new line)</label>
                    <textarea
                        value={form.techStack}
                        onChange={(e) => update("techStack", e.target.value)}
                        rows={3}
                        className={textareaStyle}
                        placeholder="Kafka, Kubernetes, S3, Spark... (Each technology on a new line)"
                        disabled={isSaving}
                    />
                </div>
                
                {/* 3. 📝 CORE CONTENT & TALK TRACK FIELDS */}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
                  />
                </div>

              </div>
      
              {/* 4. 🚀 Action Footer */}
              <div className="flex justify-end gap-3 mt-10 border-t pt-6">
                
                <button
                  onClick={() => navigate("/spoke")}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition disabled:opacity-50"
                  disabled={isSaving}
                >
                  Cancel
                </button>
      
                <button
                  onClick={save}
                  className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2 font-medium disabled:bg-teal-400 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                    <Save size={16} /> {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
}