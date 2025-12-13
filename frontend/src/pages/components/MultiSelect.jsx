import React, { useState } from "react";

export default function MultiSelect({
  label,
  placeholder,
  options = [],
  value = [],
  onChange,
  displayKey = "label",
  valueKey = "value",
}) {
  const [input, setInput] = useState("");

  const addValue = (item) => {
    if (!value.some(v => v[valueKey] === item[valueKey])) {
      onChange([...value, item]);
    }
    setInput("");
  };

  const removeValue = (val) => {
    onChange(value.filter(v => v[valueKey] !== val[valueKey]));
  };

  const filtered = options.filter(
    (o) =>
      o[displayKey].toLowerCase().includes(input.toLowerCase()) &&
      !value.some(v => v[valueKey] === o[valueKey])
  );

  return (
    <div className="space-y-1">
      {label && <label className="font-semibold text-gray-700">{label}</label>}

      <div className="border rounded-xl p-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((v) => (
            <span
              key={v[valueKey]}
              className="bg-teal-100 text-teal-700 px-3 py-1 rounded-lg flex items-center gap-2"
            >
              {v[displayKey]}
              <button
                className="text-red-500 hover:text-red-700"
                onClick={() => removeValue(v)}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          type="text"
          className="w-full border-none outline-none p-1"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {input && filtered.length > 0 && (
          <div className="mt-2 bg-white shadow rounded-lg max-h-40 overflow-auto border">
            {filtered.map((opt) => (
              <div
                key={opt[valueKey]}
                onClick={() => addValue(opt)}
                className="p-2 cursor-pointer hover:bg-gray-100"
              >
                {opt[displayKey]}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
