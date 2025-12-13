import React, { useState } from "react";
import { Trash2 } from "lucide-react";

const Lag = ({ measures, setMeasures, accountUsers = [] }) => {
    const [expandedIndex, setExpandedIndex] = useState(null);

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
                type: "lag",
                targetValue: 10,
                currentValue: 0,
                assignedTo: [],
                stakeholdersContact: [],
                comments: [],
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
            {/* <h3 className="text-xl font-bold text-teal-600">Lag Measures</h3> */}

            {measures.map((m, i) => (
                <div
                    key={i}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition transform hover:-translate-y-1 overflow-hidden"
                >
                    {/* Card Header */}
                    <div
                        className="flex justify-between items-center cursor-pointer px-4 py-3 bg-gradient-to-r from-teal-100 to-teal-200"
                        onClick={() => toggleExpand(i)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="inline-block px-3 py-1 rounded-full bg-teal-400 text-white font-semibold shadow-sm">
                                {m.name || `Measure ${i + 1} - Unnamed`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeMeasure(i);
                                }}
                                className="text-red-600 hover:text-red-800"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Expandable Content */}
                    {expandedIndex === i && (
                        <div className="p-4 space-y-3 bg-gray-50">
                            {/* Name & Values */}
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    placeholder="Measure Name"
                                    value={m.name}
                                    onChange={(e) => handleChange(i, "name", e.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                />

                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Target Value"
                                        value={m.targetValue}
                                        onChange={(e) => handleChange(i, "targetValue", Number(e.target.value))}
                                        className="w-1/3 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Current Value"
                                        value={m.currentValue}
                                        onChange={(e) => handleChange(i, "currentValue", Number(e.target.value))}
                                        className="w-1/3 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                    />
                                    <select
                                        multiple
                                        value={m.assignedTo.map(u => u._id)}
                                        onChange={(e) => {
                                            const selectedOptions = Array.from(e.target.selectedOptions); // all selected <option> elements
                                            const assignedUsers = selectedOptions.map(opt => {
                                                const user = accountUsers.find(u => u._id === opt.value);
                                                return { _id: user._id, name: user.displayName };
                                            });
                                            handleChange(i, "assignedTo", assignedUsers);
                                        }}
                                        className="w-1/3 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                    >
                                        {accountUsers.map(u => (
                                            <option key={u._id} value={u._id}>{u.displayName}</option>
                                        ))}
                                    </select>

                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-3 bg-gray-200 rounded-full mt-1">
                                    <div
                                        className="h-3 rounded-full bg-teal-500 transition-all"
                                        style={{
                                            width: `${Math.min((m.currentValue / m.targetValue) * 100, 100)}%`
                                        }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-600 mt-1">{m.currentValue}/{m.targetValue}</span>
                            </div>

                            {/* Stakeholders */}
                            <div>
                                <h5 className="font-medium mb-1">Stakeholders</h5>
                                {m.stakeholdersContact.map((s, sIdx) => (
                                    <div key={sIdx} className="flex gap-2 mb-1">
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={s.name}
                                            onChange={(e) => {
                                                const updated = [...measures];
                                                updated[i].stakeholdersContact[sIdx].name = e.target.value;
                                                setMeasures(updated);
                                            }}
                                            className="border rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
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
                                            className="border rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                        />
                                        <button
                                            onClick={() => {
                                                const updated = [...measures];
                                                updated[i].stakeholdersContact.splice(sIdx, 1);
                                                setMeasures(updated);
                                            }}
                                            className="text-red-500 text-sm hover:text-red-700 transition"
                                        >
                                            x
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
                                    className="text-green-600 text-sm mt-1 hover:text-green-800 transition"
                                >
                                    + Add Stakeholder
                                </button>
                            </div>

                            {/* Comments */}
                            <div>
                                <h5 className="font-medium mb-1 mt-2">Comments</h5>
                                {m.comments.map((c, cIdx) => (
                                    <div key={cIdx} className="flex gap-2 mb-1 items-center">
                                        <textarea
                                            placeholder="Comment"
                                            value={c.text}
                                            onChange={(e) => {
                                                const updated = [...measures];
                                                updated[i].comments[cIdx].text = e.target.value;
                                                setMeasures(updated);
                                            }}
                                            className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                        />
                                        <button
                                            onClick={() => {
                                                const updated = [...measures];
                                                updated[i].comments.splice(cIdx, 1);
                                                setMeasures(updated);
                                            }}
                                            className="text-red-500 text-sm hover:text-red-700 transition"
                                        >
                                            x
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
                                    className="text-green-600 text-sm mt-1 hover:text-green-800 transition"
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
                className="bg-gradient-to-r from-green-500 to-green-400 text-white px-4 py-2 rounded-2xl font-semibold hover:from-green-600 hover:to-green-500 transition"
            >
                + Add Lag Measure
            </button>
        </div>
    );
};

export default Lag;
