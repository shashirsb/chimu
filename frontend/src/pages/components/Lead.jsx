import React, { useState } from "react"; 
import { Trash2 } from "lucide-react";

const Lead = ({ measures, setMeasures, accountUsers = [], accountSpokes = [] }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  // You can keep this log for debugging purposes, but remove it once confirmed working.
  // console.log("Lead.jsx received accountSpokes:", accountSpokes);

  const handleChange = (index, field, value) => {
    const updated = [...measures];
    updated[index][field] = value;
    setMeasures(updated);
  };

  const addMeasure = () => {
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
        spokeId: "", // Initialized for Spoke selection
        spokeName: "", // Must be initialized for consistency
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
            onClick={() => toggleExpand(i)}
          >
            <span className="font-medium text-gray-700">
              {m.name || `Measure ${i + 1}`}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                removeMeasure(i);
              }}
              className="text-gray-500 hover:text-red-600 transition"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* EXPANDED CONTENT */}
          {expandedIndex === i && (
            <div className="p-4 space-y-4 bg-white/50">
              {/* NAME */}
              <input
                type="text"
                placeholder="Measure Name"
                value={m.name}
                onChange={(e) => handleChange(i, "name", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white"
              />

              {/* SPOKE SELECTION - Corrected logic to populate dropdown */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Link to Spoke</label>
                <select
                  // 1. VALUE: Bind to a single string ID
                  value={m.spokeId || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;

                    if (selectedId) {
                      // 2. Find the selected spoke object using its _id
                      const selectedSpoke = accountSpokes.find((s) => s._id === selectedId);

                      if (selectedSpoke) {
                        // 3. Update both ID and Name in the measure object
                        handleChange(i, "spokeId", selectedSpoke._id);
                        handleChange(i, "spokeName", selectedSpoke.spoke); 
                      }
                    } else {
                      // Handle selection of the default option (clear values)
                      handleChange(i, "spokeId", "");
                      handleChange(i, "spokeName", "");
                    }
                  }}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-gray-300 outline-none"
                >
                  <option value="">-- Select Spoke (Optional) --</option>
                  
                  {/* CRITICAL: Mapping the accountSpokes prop to <option> elements */}
                  {accountSpokes.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.spoke} {/* Display the spoke name */}
                    </option>
                  ))}
                </select>
              </div>

              {/* VALUES */}
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Target Value"
                  value={m.targetValue}
                  onChange={(e) => handleChange(i, "targetValue", Number(e.target.value))}
                  className="w-1/3 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white"
                />

                <input
                  type="number"
                  placeholder="Current Value"
                  value={m.currentValue}
                  onChange={(e) => handleChange(i, "currentValue", Number(e.target.value))}
                  className="w-1/3 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white"
                />

                {/* AssignedTo */}
                <select
                  multiple
                  value={m.assignedTo.map((u) => u._id)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions);
                    // Map selected IDs back to user objects, filtering out undefined
                    const users = selected.map((opt) =>
                      accountUsers.find((u) => u._id === opt.value)
                    ).filter(Boolean); 

                    // Map to final structure
                    handleChange(
                      i,
                      "assignedTo",
                      users.map((u) => ({ _id: u._id, name: u.displayName }))
                    );
                  }}
                  className="w-1/3 border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-gray-300 outline-none"
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
                    className="bg-gray-700 h-full rounded-full transition-all"
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
                      className="border border-gray-300 rounded-xl px-2 py-1 text-sm flex-1 bg-white focus:ring-2 focus:ring-gray-300 outline-none"
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
                      className="border border-gray-300 rounded-xl px-2 py-1 text-sm flex-1 bg-white focus:ring-2 focus:ring-gray-300 outline-none"
                    />
                    <button
                      onClick={() => {
                        const updated = [...measures];
                        updated[i].stakeholdersContact.splice(sIdx, 1);
                        setMeasures(updated);
                      }}
                      className="text-gray-500 hover:text-red-600 text-sm"
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
                  className="text-gray-600 hover:text-black text-sm"
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
                      className="border border-gray-300 rounded-xl px-2 py-1 text-sm flex-1 bg-white focus:ring-2 focus:ring-gray-300 outline-none"
                    />
                    <button
                      onClick={() => {
                        const updated = [...measures];
                        updated[i].comments.splice(cIdx, 1);
                        setMeasures(updated);
                      }}
                      className="text-gray-500 hover:text-red-600 text-sm"
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
                  className="text-gray-600 hover:text-black text-sm"
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
        className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm hover:bg-black transition w-max"
      >
        + Add Measure
      </button>
    </div>
  );
};

export default Lead;