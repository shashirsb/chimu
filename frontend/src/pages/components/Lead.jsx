import React, { useState } from "react"; 
import { Trash2 } from "lucide-react";

// Input styling for disabled state
const inputClass = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500";

const Lead = ({ measures, setMeasures, accountUsers = [], accountSpokes = [], isSaving = false }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [inputError, setInputError] = useState({}); // To hold errors for specific measures/fields

  const handleChange = (index, field, value) => {
    const updated = [...measures];
    updated[index][field] = value;
    setMeasures(updated);
    // Clear error for this field when user starts typing again
    setInputError(prev => ({ ...prev, [`${index}-${field}`]: null }));
  };

  const addMeasure = () => {
    // Basic validation check before adding a new measure if the last one is not named
    if (measures.length > 0 && !measures[measures.length - 1].name.trim()) {
      setInputError({ [`${measures.length - 1}-name`]: "Please name the current measure first." });
      return;
    }
    
    setMeasures([
      ...measures,
      {
        name: "",
        type: "lead",
        targetValue: 10,
        currentValue: 0,
        assignedTo: [],
        stakeholdersContact: [],
        comments: [],
        spokeId: "",
        spokeName: "",
      },
    ]);
    setExpandedIndex(measures.length);
  };

  const removeMeasure = (index) => {
    const updated = measures.filter((_, i) => i !== index);
    setMeasures(updated);
    if (expandedIndex === index) setExpandedIndex(null);
    else if (expandedIndex > index) setExpandedIndex(expandedIndex - 1);
  };

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Helper to validate and toggle expand
  const handleToggleExpand = (i) => {
    if (expandedIndex === i) {
        // If closing, ensure name and targetValue are present (minimal validation)
        if (!measures[i].name.trim()) {
             setInputError({ [`${i}-name`]: "Measure Name is required." });
             return;
        }
        if (measures[i].targetValue === undefined || measures[i].targetValue === null) {
            setInputError({ [`${i}-targetValue`]: "Target value is required." });
            return;
        }
        setInputError({}); // Clear errors on success
    }
    toggleExpand(i);
  };

  const renderError = (index, field) => {
    return inputError[`${index}-${field}`] ? (
        <p className="text-red-600 text-xs mt-1">{inputError[`${index}-${field}`]}</p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-4">
      {measures.map((m, i) => (
        <div
          key={i}
          className="bg-white/70 backdrop-blur-xl border border-gray-200/70 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden"
        >
          {/* HEADER */}
          <div
            className="flex justify-between items-center px-4 py-3 cursor-pointer border-b border-gray-200/60"
            onClick={() => handleToggleExpand(i)}
          >
            <span className="font-medium text-gray-700">
              {m.name || `Measure ${i + 1}`}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                removeMeasure(i);
              }}
              className="text-gray-500 hover:text-red-600 transition disabled:opacity-50"
              disabled={isSaving}
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* EXPANDED CONTENT */}
          {expandedIndex === i && (
            <div className="p-4 space-y-4 bg-white/50">
              {/* NAME */}
              <div>
                <input
                  type="text"
                  placeholder="Measure Name (Required)"
                  value={m.name}
                  onChange={(e) => handleChange(i, "name", e.target.value)}
                  className={inputClass}
                  disabled={isSaving}
                />
                {renderError(i, 'name')}
              </div>

              {/* SPOKE SELECTION */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Link to Spoke</label>
                <select
                  value={m.spokeId || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                      const selectedSpoke = accountSpokes.find((s) => s._id === selectedId);
                      if (selectedSpoke) {
                        handleChange(i, "spokeId", selectedSpoke._id);
                        handleChange(i, "spokeName", selectedSpoke.spoke); 
                      }
                    } else {
                      handleChange(i, "spokeId", "");
                      handleChange(i, "spokeName", "");
                    }
                  }}
                  className={inputClass}
                  disabled={isSaving}
                >
                  <option value="">-- Select Spoke (Optional) --</option>
                  {accountSpokes.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.spoke}
                    </option>
                  ))}
                </select>
              </div>

              {/* VALUES */}
              <div className="flex gap-3">
                {/* Target Value */}
                <div className="w-1/3">
                    <input
                      type="number"
                      placeholder="Target Value (Required)"
                      value={m.targetValue}
                      onChange={(e) => handleChange(i, "targetValue", Number(e.target.value))}
                      className={inputClass}
                      disabled={isSaving}
                    />
                    {renderError(i, 'targetValue')}
                </div>
                
                {/* Current Value */}
                <input
                  type="number"
                  placeholder="Current Value"
                  value={m.currentValue}
                  onChange={(e) => handleChange(i, "currentValue", Number(e.target.value))}
                  className={`${inputClass} w-1/3`}
                  disabled={isSaving}
                />

                {/* AssignedTo */}
                <select
                  multiple
                  value={m.assignedTo.map((u) => u._id)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions);
                    const users = selected.map((opt) =>
                      accountUsers.find((u) => u._id === opt.value)
                    ).filter(Boolean); 

                    handleChange(
                      i,
                      "assignedTo",
                      users.map((u) => ({ _id: u._id, name: u.displayName }))
                    );
                  }}
                  className={`${inputClass} w-1/3`}
                  disabled={isSaving}
                >
                  {accountUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* PROGRESS */}
              <div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((m.currentValue / m.targetValue) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1 block">
                  {m.currentValue} / {m.targetValue}
                </span>
              </div>

              {/* STAKEHOLDERS */}
              <div>
                <h5 className="font-medium text-gray-700 mb-1">Stakeholders</h5>
                {m.stakeholdersContact.map((s, sIdx) => (
                  <div key={sIdx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={s.name}
                      onChange={(e) => {
                        const updated = [...measures];
                        updated[i].stakeholdersContact[sIdx].name = e.target.value;
                        setMeasures(updated);
                      }}
                      className={`${inputClass} flex-1`}
                      disabled={isSaving}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={s.email}
                      onChange={(e) => {
                        const updated = [...measures];
                        updated[i].stakeholdersContact[sIdx].email = e.target.value;
                        setMeasures(updated);
                      }}
                      className={`${inputClass} flex-1`}
                      disabled={isSaving}
                    />
                    <button
                      onClick={() => {
                        const updated = [...measures];
                        updated[i].stakeholdersContact.splice(sIdx, 1);
                        setMeasures(updated);
                      }}
                      className="text-gray-500 hover:text-red-600 text-sm disabled:opacity-50"
                      disabled={isSaving}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const updated = [...measures];
                    updated[i].stakeholdersContact.push({ name: "", email: "" });
                    setMeasures(updated);
                  }}
                  className="text-gray-600 hover:text-black text-sm disabled:opacity-50"
                  disabled={isSaving}
                >
                  + Add Stakeholder
                </button>
              </div>

              {/* COMMENTS */}
              <div>
                <h5 className="font-medium text-gray-700 mb-1">Comments</h5>
                {m.comments.map((c, cIdx) => (
                  <div key={cIdx} className="flex gap-2 mb-2">
                    <textarea
                      placeholder="Comment"
                      value={c.text}
                      onChange={(e) => {
                        const updated = [...measures];
                        updated[i].comments[cIdx].text = e.target.value;
                        setMeasures(updated);
                      }}
                      className={`${inputClass} flex-1`}
                      disabled={isSaving}
                    />
                    <button
                      onClick={() => {
                        const updated = [...measures];
                        updated[i].comments.splice(cIdx, 1);
                        setMeasures(updated);
                      }}
                      className="text-gray-500 hover:text-red-600 text-sm disabled:opacity-50"
                      disabled={isSaving}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const updated = [...measures];
                    updated[i].comments.push({ text: "", createdAt: new Date() });
                    setMeasures(updated);
                  }}
                  className="text-gray-600 hover:text-black text-sm disabled:opacity-50"
                  disabled={isSaving}
                >
                  + Add Comment
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addMeasure}
        className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm hover:bg-black transition w-max disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSaving}
      >
        + Add Measure
      </button>
    </div>
  );
};

export default Lead;