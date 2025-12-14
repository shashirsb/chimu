// src/pages/NewWigModal.jsx - REVISED WITH INTERNAL VALIDATION AND POPUP STRUCTURE
import React, { Suspense, useState } from "react";
import { ClipboardList, Plus, X } from "lucide-react";
import Lead from "../components/Lead";

// --- REUSED ERROR POPUP (Assuming the container component provides this or similar) ---
const ErrorPopup = ({ message, onClose }) => {
    if (!message) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-500">
                <div className="flex justify-between items-start p-5">
                    <div>
                        <h3 className="text-lg font-semibold text-red-700">Validation Required</h3>
                        <p className="mt-1 text-sm text-gray-600">{message}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Close error message">
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
// ------------------------------------

// Shared Tailwind classes for minimalist design (unchanged)
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition disabled:bg-gray-50/50";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase block";


export default function NewWigModal({
  newWig,
  setNewWig,
  accounts = [], // Defaulting to [] for safety
  accountUsers = [], 
  accountSpokes = [], 
  onSave,
  onCancel,
  isSaving = false, // <--- 🚨 NEW PROP FOR SAVING STATE
}) {
  const [internalError, setInternalError] = useState(null); // Internal validation errors

  const handleTypeChange = (e) => {
    const selectedType = e.target.value;
    setNewWig({ ...newWig, type: selectedType, leadMeasures: [] });
  };

  const renderSections = () => {
    switch (newWig.type) {
      case "wig": return ["lag", "lead"];
      case "champion": return ["tech", "business"];
      case "task": return ["task"];
      case "opportunity": return ["nbm", "tfw", "sizing"];
      default: return [];
    }
  };

  const sections = renderSections();

  const handleSectionMeasures = (sectionType, newMeasures) => {
    const updated = newMeasures.map((m) => ({ ...m, type: sectionType }));
    const filtered = (newWig.leadMeasures || []).filter((m) => m.type !== sectionType);
    setNewWig({ ...newWig, leadMeasures: [...filtered, ...updated] });
  };

  const handleValidityChange = (type) => {
    const today = new Date();
    let expiry = new Date(today);
    switch (type) {
      case "weekly": expiry.setDate(today.getDate() + 7); break;
      case "monthly": expiry = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
      case "quarterly": expiry = new Date(today.getFullYear(), today.getMonth() + 3, 0); break;
      case "half_yearly": expiry = new Date(today.getFullYear(), today.getMonth() + 6, 0); break;
      default: expiry = today;
    }
    setNewWig({
      ...newWig,
      validityPeriod: {
        type,
        startDate: today.toISOString().split("T")[0],
        expiryDate: expiry.toISOString().split("T")[0],
      },
    });
  };

  // --- 🚨 NEW: Internal Validation Handler ---
  const handleSaveClick = () => {
    setInternalError(null);

    // 1. Check basic requirements
    if (!newWig.type) {
      setInternalError("Please select a valid Work Item Type.");
      return;
    }
    if (!newWig.accountId) {
      setInternalError("Please select the target Account.");
      return;
    }
    if (!newWig.title || !newWig.title.trim()) {
      setInternalError("A Title is required for the work item.");
      return;
    }
    
    // 2. Check if measures are configured, if applicable
    if (sections.length > 0 && (!newWig.leadMeasures || newWig.leadMeasures.length === 0)) {
        setInternalError(`The selected Item Type (${newWig.type}) requires at least one Lead Measure to be configured.`);
        return;
    }

    // If validation passes, call the external onSave function
    onSave({ ...newWig, type: newWig.type || "wig" });
  };

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      
      {/* 🚨 RENDER INTERNAL VALIDATION POPUP */}
      <ErrorPopup message={internalError} onClose={() => setInternalError(null)} />

      <div className="w-full max-w-7xl h-[90vh] rounded-xl bg-white shadow-2xl overflow-hidden flex border border-gray-100">

        {/* LEFT PANEL — Minimal Details & Actions */}
        <div className="w-1/3 h-full flex flex-col border-r border-gray-100 bg-gray-50/50">

          {/* Header/Title */}
          <div className="p-6 border-b border-gray-100">
             <h2 className="text-2xl font-light text-gray-800 tracking-wide">
                Create New Work Item
            </h2>
          </div>
          
          {/* Form Fields - Scrolled Content */}
          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">

            {/* Type selector */}
            <div>
              <label className={labelStyle}>Item Type</label>
              <select
                value={newWig.type || ""}
                onChange={handleTypeChange}
                className={inputStyle}
                disabled={isSaving}
              >
                <option value="">Select Type</option>
                <option value="wig">WIG</option>
                <option value="champion">Champion</option>
                <option value="task">Task</option>
              </select>
            </div>


            {/* Account */}
            <div>
              <label className={labelStyle}>Account</label>
              <select
                value={newWig.accountId || ""}
                onChange={(e) => setNewWig({ ...newWig, accountId: e.target.value })}
                className={inputStyle}
                disabled={isSaving}
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className={labelStyle}>Title</label>
              <input
                type="text"
                placeholder="Title"
                value={newWig.title}
                onChange={(e) => setNewWig({ ...newWig, title: e.target.value })}
                className={inputStyle}
                disabled={isSaving}
              />
            </div>

            {/* Statement */}
            <div>
              <label className={labelStyle}>Statement (WIG/Goal)</label>
              <textarea
                placeholder="Statement or goal description"
                value={newWig.statement}
                onChange={(e) => setNewWig({ ...newWig, statement: e.target.value })}
                className={`${inputStyle} h-28 resize-y`}
                disabled={isSaving}
              />
            </div>

            {/* Validity */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Validity Period</h3>

              <div>
                  <label className={labelStyle}>Period Type</label>
                  <select
                    value={newWig.validityPeriod?.type || "quarterly"}
                    onChange={(e) => handleValidityChange(e.target.value)}
                    className={inputStyle}
                    disabled={isSaving}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half-Yearly</option>
                  </select>
              </div>

              <div>
                  <label className={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    value={newWig.validityPeriod?.startDate || ""}
                    onChange={(e) =>
                      setNewWig({
                        ...newWig,
                        validityPeriod: { ...newWig.validityPeriod, startDate: e.target.value },
                      })
                    }
                    className={inputStyle}
                    disabled={isSaving}
                  />
              </div>

              <div>
                  <label className={labelStyle}>Expiry Date</label>
                  <input
                    type="date"
                    value={newWig.validityPeriod?.expiryDate || ""}
                    onChange={(e) =>
                      setNewWig({
                        ...newWig,
                        validityPeriod: { ...newWig.validityPeriod, expiryDate: e.target.value },
                      })
                    }
                    className={inputStyle}
                    disabled={isSaving}
                  />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 flex flex-col gap-2 sticky bottom-0 bg-white border-t border-gray-100">
            {/* Save */}
            <button
              onClick={handleSaveClick}
              className="w-full bg-teal-500 text-white py-2.5 rounded-lg font-medium hover:bg-teal-600 transition flex items-center justify-center gap-2 disabled:bg-teal-400 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              <Plus size={16} /> {isSaving ? "Saving..." : "Create Work Item"}
            </button>

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isSaving}
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>

     {/* RIGHT PANEL — Measures */}
        <div className="w-2/3 h-full p-6 bg-white overflow-y-auto space-y-6">
            <h3 className="text-xl font-light text-gray-800 border-b pb-3 sticky top-0 bg-white z-10">
                Measure Configuration
            </h3>

            <Suspense fallback={<div className="text-gray-500">Loading measures...</div>}>

                {sections.length === 0 ? (
                    <div className="text-gray-500 text-center mt-20 text-lg">
                        Select an **Item Type** to begin configuring measures.
                    </div>
                ) : (
                    sections.map((section) => (
                        <div
                            key={section}
                            className="bg-gray-50 border border-gray-100 rounded-xl p-6 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-700 flex items-center gap-3 capitalize">
                                    <ClipboardList size={20} className="text-teal-500" /> {section} Measures
                                </h4>
                                <span className="text-xs text-gray-500 uppercase tracking-wider">
                                    Type: {section}
                                </span>
                            </div>

                            <Lead
                                measures={(newWig.leadMeasures || []).filter((m) => m.type === section)}
                                setMeasures={(m) => handleSectionMeasures(section, m)}
                                accountUsers={accountUsers}
                                accountSpokes={accountSpokes}
                                // Pass down saving state to sub-component to disable inputs
                                isSaving={isSaving} 
                            />
                        </div>
                    ))
                )}

            </Suspense>
        </div>

      </div>
    </div>
  );
}