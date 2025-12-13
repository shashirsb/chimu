import React, { useState } from "react";
import api from "../api/api";
import { FaUser, FaCalendarAlt, FaComments, FaTasks } from "react-icons/fa";

export default function AiSearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  async function runQuery(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("/agent/query", { query });
      setResult(res.data);
      setOpen(true);
    } catch (err) {
      console.error("AI error:", err);
      setResult({ error: err.message });
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={runQuery} className="flex items-center space-x-2">
        <input
          className="border rounded px-3 py-1 w-72 shadow-sm"
          placeholder='Ask AI — e.g. "What did Joe do last week?"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="bg-teal-600 text-white px-3 py-1 rounded shadow-sm"
          disabled={loading}
        >
          {loading ? "Thinking…" : "Ask AI"}
        </button>
      </form>

      {open && result && (
        <div className="absolute right-4 top-16 z-50 w-[420px] bg-white shadow-2xl rounded-xl p-5 border border-gray-100">

          {/* Header */}
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-xl text-gray-700">AI Insights</h3>
            <button
              className="text-sm"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Error */}
          {result.error && (
            <div className="text-red-600 mt-3">{result.error}</div>
          )}

          {/* Summary */}
          {result.summary && (
            <div className="mt-4 bg-teal-50 border border-teal-200 p-3 rounded-lg">
              <div className="font-medium text-teal-700 text-lg mb-1 flex items-center">
                <FaUser className="mr-2" /> Summary
              </div>
              <p className="text-sm text-gray-700">{result.summary}</p>
            </div>
          )}

          {/* WIG Activities */}
          {result.rawData?.wigActivities?.length > 0 && (
            <div className="mt-5">
              <div className="font-semibold text-gray-800 flex items-center mb-2">
                <FaTasks className="mr-2 text-teal-600" /> WIG Activities
              </div>

              <div className="max-h-48 overflow-auto space-y-3">
                {result.rawData.wigActivities.map((act, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-3 shadow-sm bg-gray-50"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {act.measureName} — <span className="text-teal-700">{act.wigTitle}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <FaCalendarAlt className="inline mr-1" />
                      {new Date(act.createdAt || act.timestamp).toLocaleString()}
                    </div>

                    {act.kind === "comment" && (
                      <p className="text-sm text-gray-700 mt-2 flex items-start">
                        <FaComments className="mr-2 mt-0.5 text-gray-500" />
                        {act.text}
                      </p>
                    )}

                    {act.kind === "assignment" && (
                      <p className="text-sm text-gray-700 mt-2">
                        Assigned to: <span className="font-medium">{act.assignedTo}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Activities */}
          {result.rawData?.customerActivities?.length > 0 && (
            <div className="mt-5">
              <div className="font-semibold text-gray-800 flex items-center mb-2">
                <FaComments className="mr-2 text-blue-600" /> Customer Logs
              </div>

              <div className="max-h-48 overflow-auto space-y-3">
                {result.rawData.customerActivities.map((cust, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-3 shadow-sm bg-blue-50"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {cust.customerName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <FaCalendarAlt className="inline mr-1" />
                      {new Date(cust.timestamp).toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-700 mt-2">
                      {cust.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nothing detected */}
          {result.summary &&
            result.rawData?.wigActivities?.length === 0 &&
            result.rawData?.customerActivities?.length === 0 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                No specific activity found for this query.
              </div>
            )}
        </div>
      )}
    </>
  );
}
