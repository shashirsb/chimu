// src/pages/EditSpoke.jsx - MINIMALIST UI REWRITE (FINAL SCHEMA)
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Save } from "lucide-react";

// Shared Tailwind classes
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";
const textareaStyle = "w-full p-3 border rounded-lg border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";

// Utility to convert [String] to "\n" separated String for Textarea
const arrayToString = (arr) => (Array.isArray(arr) ? arr.filter(s => s?.trim()).join('\n') : "");
// Utility to convert "\n" separated String from Textarea to [String] for Payload
const stringToArray = (str) => {
    if (!str) return [];
    return String(str).split('\n').map(s => s.trim()).filter(s => s.length > 0);
};


export default function EditSpoke() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    // 🌟 STABILIZE USER DATA 🌟
    const stored = typeof window !== "undefined" && localStorage.getItem("user");
    const currentUser = stored ? JSON.parse(stored) : null;
    // Extract stable email and accountIds reference
    const userEmail = currentUser?.email || "";
    const userAccountIds = currentUser?.accountIds || [];

    // --- Map accountIds: handles objects { _id, name } or simple strings ---
    const accountOptions = useMemo(() => {
        return userAccountIds.map((a) => {
            if (typeof a === "object" && (a._id || a.id) && a.name) {
                return { id: a._id || a.id, name: a.name };
            }
            return { id: a, name: a };
        });
    }, [userAccountIds]); // Depend only on the stable array reference

    const existing = location.state?.spoke || null;

    // --- FORM STATE ---
    const [form, setForm] = useState({
        accountName: "",
        accountId: "", 
        User: userEmail, // Use the stable derived value
        spoke: "", 
        
        live: false, 
        
        // NEW ARRAY FIELDS
        partners: "",
        whoCares: "",
        techStack: "",
        
        // CORE CONTENT FIELDS
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
    // Dependencies: id (from URL), existing (from location state), userEmail (stable reference)
    useEffect(() => {
        const load = async () => {
            try {
                let data = existing;

                if (!data && id) {
                    const res = await api.get(`/spoke/${id}`);
                    data = res.data;
                }

                if (data) {
                    // 🌟 CRITICAL FIX: Only merge properties you need to override, 
                    // and ensure you don't call setForm in a way that creates an unstable dependency 
                    // loop with the data itself.

                    setForm((p) => ({
                        ...p,
                        // Update with data fields
                        ...(data || {}), 
                        
                        // Map specific fields and ensure correct types/formats for UI
                        accountId: data.accountId || "", 
                        spoke: data.Spoke || data.spoke || "", 
                        internalNotes: data.Notes || data.internalNotes || "",

                        // Map ALL array fields by converting them to a single string for the textarea
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

                        User: data.User || userEmail, // Use stable userEmail
                        live: !!data.live, // Ensure live is a boolean
                    }));
                }
            } catch (err) {
                console.error("Failed loading spoke:", err);
            }
        };

        load();
    // 🌟 Use stable dependencies: id, existing object (stable via useLocation), and userEmail 🌟
    // Note: If 'existing' is modified outside this component, you might need memoization.
    // Assuming 'existing' comes purely from location state and is stable.
    }, [id, existing, userEmail]); 

    const handleAccountChange = (value) => {
        // Find the corresponding account ID when the name changes
        const selectedAccount = accountOptions.find(opt => opt.name === value);

        setForm((p) => ({ 
            ...p, 
            accountName: value,
            accountId: selectedAccount ? selectedAccount.id : "", // Update ID based on name change
        }));
    };

    const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    // ----------------------------
    // SAVE = UPDATE (PUT)
    // ----------------------------
    const save = async () => {
        if (!form.accountId) {
            alert("Account ID is missing. Cannot save.");
            return;
        }

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
                
                // Ensure accountName and ID are passed
                accountName: form.accountName,
                accountId: form.accountId,
            };

            await api.put(`/spoke/${id}`, payload);
            navigate("/spoke");
        } catch (err) {
            console.error(err.response?.data?.error || "Update failed", err);
            alert(err.response?.data?.error || "Update failed");
        }
    };

    if (!id) return <div className="p-8 text-red-600">Error: Spoke ID not found.</div>;
    
    // Extract only the names for the select options
    const accountNames = accountOptions.map(a => a.name);


    return (
        <div className="p-8 min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-light text-gray-800 tracking-wide mb-8">
                Edit Spoke Record
            </h2>
      
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
      
                {/* ============================================== */}
                {/* 1. 📂 Core Record & Ownership Details */}
                {/* ============================================== */}
      
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
                        />
                        <label htmlFor="live-status" className="font-medium text-gray-700">
                            Mark as **LIVE** (Ready for use)
                        </label>
                    </div>
                </div>

                
                {/* ============================================== */}
                {/* 2. 👥 Strategic Relationships & Tech Stack */}
                {/* ============================================== */}
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
                    />
                </div>
                
                {/* ============================================== */}
                {/* 3. 📝 CORE CONTENT & TALK TRACK FIELDS */}
                {/* ============================================== */}
                <div className="md:col-span-2 pt-6">
                    <h3 className="text-xl font-medium text-gray-700 mb-4 border-b pb-2">Core Narrative & Strategy</h3>
                </div>

                {/* Description / Relevancy (Textarea bound to single string) */}
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
                
                {/* Big Rock Goal (Textarea bound to single string) */}
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

                {/* Why Now (Textarea bound to single string) */}
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
                
                {/* Challenges / Pain Points (Textarea bound to single string) */}
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

                {/* Why MongoDB (Textarea bound to single string) */}
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

                {/* Proof Point (Textarea bound to single string) */}
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

                {/* Talk Track (Textarea bound to single string) */}
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
      
              {/* 4. 🚀 Action Footer */}
              <div className="flex justify-end gap-3 mt-10 border-t pt-6">
                
                <button
                  onClick={() => navigate("/spoke")}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Cancel
                </button>
      
                <button
                  onClick={save}
                  className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2 font-medium"
                >
                    <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      );
}