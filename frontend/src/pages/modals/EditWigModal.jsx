// src/pages/EditWigModal.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, Suspense, useState } from "react";
import { ClipboardList, Save, X, ArrowLeft } from "lucide-react";
import api from "../../api/api";

const Lead = React.lazy(() => import("../components/Lead"));

// Shared Tailwind classes for minimalist design (reusing from previous components)
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition disabled:bg-gray-50/50";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase block";

// --- 1. NEW: Error Popup Component ---
const ErrorPopup = ({ message, onClose, title = "Validation Required" }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-500">
                <div className="flex justify-between items-start p-5">
                    <div>
                        <h3 className="text-lg font-semibold text-red-700">{title}</h3>
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


export default function EditWigModal({
  newWig,
  setNewWig,
  accountName,
  accountUsers,
  setAccountUsers,
  accountSpokes,
  onSave,
  onCancel,
  isSaving = false, // <--- 🚨 NEW PROP FOR SAVING STATE
}) {
  const [dataFetchError, setDataFetchError] = useState(null); // API fetch errors
  const [internalError, setInternalError] = useState(null); // Internal validation errors

  // Fetch Users and Account ID
  useEffect(() => {
    const fetchUsersByAccountName = async () => {
      setDataFetchError(null);
      try {
        if (!accountName) return;

        // 1. Get Account ID
        const accRes = await api.get(`/accounts/name/${encodeURIComponent(accountName)}`);
        const accountId = accRes.data?._id;
        
        if (accountId && newWig.accountId !== accountId) {
            setNewWig(prev => ({ ...prev, accountId: accountId }));
        }

        if (!accountId) {
          setDataFetchError(`Account ID not found for "${accountName}". Cannot load assigned users.`);
          setAccountUsers([]);
          return;
        }

        // 2. Get Users for that Account ID
        const userRes = await api.get(`/users/${accountId}`);
        setAccountUsers(userRes.data || []);
      } catch (err) {
        // --- ENHANCED: Error handling for data fetch ---
        console.error("Failed to load users:", err);
        setAccountUsers([]);
        
        let userMessage = "Failed to load the user list for this account. You may not be able to assign measures.";
        if (err.response) {
            if (err.response.status === 404) {
                userMessage = `Account "${accountName}" not found on the server.`;
            } else if (err.response.status === 403) {
                userMessage = "Permission denied while fetching users.";
            }
        }
        setDataFetchError(userMessage);
      }
    };

    fetchUsersByAccountName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountName]); // Run when accountName prop changes

  // Preserve assignedTo (unchanged logic)
  useEffect(() => {
    if (accountUsers.length === 0) return;

    setNewWig((prev) => ({
      ...prev,
      leadMeasures: (prev.leadMeasures || []).map((m) => ({
        ...m,
        assignedTo: (m.assignedTo || []).filter((u) =>
          accountUsers.some((a) => a._id === u._id)
        ),
      })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountUsers]);

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

  const handleSectionUpdate = (sectionType, newMeasures) => {
    const updated = newMeasures.map((m) => ({ ...m, type: sectionType }));
    const filtered = (newWig.leadMeasures || []).filter(
      (m) => m.type !== sectionType
    );
    setNewWig({ ...newWig, leadMeasures: [...filtered, ...updated] });
  };

  const handleValidityTypeChange = (type) => {
    // ... (logic remains unchanged)
    const today = new Date();
    let expiry = new Date(today);

    switch (type) {
      case "weekly":
        expiry.setDate(today.getDate() + 7);
        break;
      case "monthly":
        expiry = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "quarterly":
        expiry = new Date(today.getFullYear(), today.getMonth() + 3, 0);
        break;
      case "half_yearly":
        expiry = new Date(today.getFullYear(), today.getMonth() + 6, 0);
        break;
      default:
        expiry = today;
    }

    setNewWig({
      ...newWig,
      validityPeriod: {
        ...newWig.validityPeriod,
        type,
        startDate: today.toISOString().split("T")[0],
        expiryDate: expiry.toISOString().split("T")[0],
      },
    });
  };

  // --- 🚨 NEW: Internal Validation Handler for Save ---
  const handleSaveClick = () => {
    setInternalError(null);

    if (!newWig.title || !newWig.title.trim()) {
      setInternalError("The Work Item must have a Title.");
      return;
    }
    // Simple check to ensure measures are present if sections are defined
    if (sections.length > 0 && (!newWig.leadMeasures || newWig.leadMeasures.length === 0)) {
        setInternalError(`The selected Item Type (${newWig.type}) requires at least one Lead Measure to be configured.`);
        return;
    }

    // Pass the validation, call external save function
    onSave();
  };
  // =====================================================

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      
      {/* RENDER POPUPS */}
      {/* API Fetch Error (for background operations) */}
      <ErrorPopup message={dataFetchError} onClose={() => setDataFetchError(null)} title="Data Fetch Error" />
      {/* Internal Validation Error */}
      <ErrorPopup message={internalError} onClose={() => setInternalError(null)} title="Validation Error" />

      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex border border-gray-100">

        {/* LEFT PANEL — Minimal Details & Actions */}
        <div className="w-1/3 h-full flex flex-col border-r border-gray-100 bg-gray-50/50">
          
          {/* HEADER/TITLE */}
          <div className="p-6 border-b border-gray-100">
             <h2 className="text-2xl font-light text-gray-800 tracking-wide">
                Edit Work Item
            </h2>
            <p className="text-sm text-gray-500 mt-1 capitalize">
                {newWig?.type} for {accountName}
            </p>
          </div>

          {/* Form Fields - Scrolled Content */}
          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
            
            {/* Account (Read-Only) */}
            <div>
              <label className={labelStyle}>Account</label>
              <div className="text-base text-gray-800 font-medium">
                {accountName}
              </div>
            </div>
            
            {/* Type (Read-Only) */}
            <div>
              <label className={labelStyle}>Type</label>
              <div className="text-base text-teal-600 font-medium capitalize">
                {newWig?.type}
              </div>
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
                className={`${inputStyle} h-32 resize-y`}
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
                    onChange={(e) => handleValidityTypeChange(e.target.value)}
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
                    value={newWig.validityPeriod?.startDate?.split('T')[0] || ""}
                    onChange={(e) =>
                      setNewWig({
                        ...newWig,
                        validityPeriod: {
                          ...newWig.validityPeriod,
                          startDate: e.target.value,
                        },
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
                    value={newWig.validityPeriod?.expiryDate?.split('T')[0] || ""}
                    onChange={(e) =>
                      setNewWig({
                        ...newWig,
                        validityPeriod: {
                          ...newWig.validityPeriod,
                          expiryDate: e.target.value,
                        },
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
            {/* Update */}
            <button
              onClick={handleSaveClick}
              className="w-full bg-teal-500 text-white py-2.5 rounded-lg font-medium hover:bg-teal-600 transition flex items-center justify-center gap-2 disabled:bg-teal-400 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              <Save size={16} /> {isSaving ? "Updating..." : "Update Changes"}
            </button>

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isSaving}
            >
              <X size={16} /> Cancel / Close
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
                    <div className="text-gray-500 text-center mt-20">No sections available for this type.</div>
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
                                measures={(newWig.leadMeasures || []).filter(
                                    (m) => m.type === section
                                )}
                                setMeasures={(m) => handleSectionUpdate(section, m)}
                                accountUsers={accountUsers}
                                accountSpokes={accountSpokes}
                                isSaving={isSaving} // Pass down saving state
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