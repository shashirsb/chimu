import React, { useState } from "react";
import api from "../api/api"; // axios instance

/* -------------------------------------------------------------
   Summary Renderer — Converts agent summary text → Beautiful UI
------------------------------------------------------------- */
function SummaryRenderer({ user, summary }) {
    if (!summary) return null;

    // cleanup
    const lines = summary.split("\n").map(l => l.trim());

    // parse summary sections
    const sections = [];
    let current = { title: "", lines: [] };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // ignore top-level "## User Summary..."
        if (line.startsWith("## ")) continue;

        // detect section header "### Something"
        if (line.startsWith("### ")) {
            if (current.title || current.lines.length) sections.push(current);
            current = { title: line.replace(/^###\s*/, ""), lines: [] };
            continue;
        }

        if (line !== "") current.lines.push(line);
    }
    if (current.title || current.lines.length) sections.push(current);

    /* -------------------------------------------------------------
       Render a block of lines (tables for pipe rows, bullets otherwise)
    ------------------------------------------------------------- */
    const renderLines = (lines) => {
        const items = lines.filter(l => l.startsWith("- "));
        if (items.length === 0) return null;

        // If all items contain pipes → table
        const allPipe = items.every(it => it.includes(" | "));
        if (allPipe) {
            const headerParts = items[0].replace(/^-+\s*/, "").split("|").map(s => s.trim());
            const rows = items.slice(1).map(it => {
    const cleaned = it.replace(/^-+\s*/, "");
    const parts = cleaned.split("|").map(s => s.trim());
    return parts;
});


            return (
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                {headerParts.map((h, i) => (
                                    <th key={i} className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, ri) => (
                                <tr key={ri} className="odd:bg-white even:bg-gray-50">
                                    {r.map((c, ci) => (
                                        <td key={ci} className="px-3 py-2 text-sm text-gray-800 border-b align-top">
                                            {c === "Not available" ? (
                                                <span className="text-gray-400">Not available</span>
                                            ) : c}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // default bullet list
        return (
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-800">
                {items.map((it, i) => (
                    <li key={i} className="break-words">
                        {it.replace(/^-+\s*/, "")}
                    </li>
                ))}
            </ul>
        );
    };

    /* -------------------------------------------------------------
       SECTION TITLE MAPPING — Change “WIG Comments” → “Task History”
    ------------------------------------------------------------- */
    const prettyTitle = (rawTitle) => {
        if (rawTitle.toLowerCase().includes("comments")) return "Comments";
        return rawTitle;
    };

    return (
        <div className="p-5 bg-white border rounded-xl shadow-sm">
            {/* User Title */}
            <div className="mb-4">
                <div className="text-lg font-semibold">{user.displayName}</div>
                <div className="text-xs text-gray-500">User activity summary</div>
            </div>

            {/* Each parsed section */}
            {sections.map((sec, idx) => (
                <div key={idx} className="mb-6">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                        {prettyTitle(sec.title)}
                    </div>

                    {renderLines(sec.lines)}

                    {/* leftover non-bullet lines */}
                    {sec.lines
                        .filter(ln => !ln.startsWith("- "))
                        .map((ln, i) => (
                            <p key={i} className="text-sm text-gray-600 mt-2">
                                {ln}
                            </p>
                        ))}
                </div>
            ))}
        </div>
    );
}

/* -------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------- */
export default function AskAI() {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [disambiguation, setDisambiguation] = useState(null);
    const [lastQuery, setLastQuery] = useState("");

    /* -------------------------------------------------------------
       Send Query to Backend
    ------------------------------------------------------------- */
    const askAI = async (userId = null) => {
        if (!input.trim() && !userId) return;

        setLoading(true);
        setResult(null);
        setDisambiguation(null);

        const payload = userId
            ? { query: lastQuery, userId }   // chosen user
            : { query: input };              // first query

        try {
            const res = await api.post("/agent", payload);
            const data = res.data;

            if (!userId) setLastQuery(input);

            if (data.type === "need_disambiguation") {
                setDisambiguation(data.disambiguation);
            } else {
                setResult(data);
            }

        } catch (err) {
            setResult({ type: "error", message: "❗ Could not reach AI service." });
        }

        setLoading(false);
    };

    /* -------------------------------------------------------------
       Render Summary / Multi Summary / Errors
    ------------------------------------------------------------- */
    const renderResult = () => {
        if (!result) return null;

        switch (result.type) {
            case "need_date_range":
                return (
                    <div className="p-4 bg-yellow-50 border rounded-xl">
                        ⏳ Please specify a time period (e.g., “last week”, “last 30 days”).
                    </div>
                );

            case "need_name":
                return (
                    <div className="p-4 bg-yellow-50 border rounded-xl">
                        🙋 Please specify whose activity you want to see.
                    </div>
                );

            case "not_found":
                return (
                    <div className="p-4 bg-red-50 border rounded-xl">
                        ❌ Could not find: <b>{result.missing?.join(", ")}</b>
                    </div>
                );

            case "summary":
                return (
                    <div className="mt-4">
                        <SummaryRenderer user={result.user} summary={result.summary} />
                    </div>
                );

            case "multi_summary":
                return (
                    <div className="space-y-4 mt-4">
                        {result.results.map((item, idx) => (
                            <SummaryRenderer key={idx} user={item.user} summary={item.summary} />
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    /* -------------------------------------------------------------
       Render Disambiguation Options
    ------------------------------------------------------------- */
    const renderDisambiguation = () => {
        if (!disambiguation) return null;

        return (
            <div className="p-5 bg-yellow-50 border rounded-xl mt-4">
                <h3 className="font-semibold mb-3">Multiple users found:</h3>

                {disambiguation.map((group, idx) => (
                    <div key={idx} className="mb-4">
                        <p className="text-gray-700 mb-2">
                            Which <b>{group.name}</b> did you mean?
                        </p>

                        <div className="space-y-2">
                            {group.options.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => askAI(opt.id)}
                                    className="block w-full text-left p-3 bg-white border rounded-lg hover:bg-gray-100"
                                >
                                    <div className="font-semibold">{opt.displayName}</div>
                                    <div className="text-gray-600 text-sm">{opt.email}</div>
                                    <div className="text-gray-500 text-xs">{opt.region}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    /* -------------------------------------------------------------
       Full UI
    ------------------------------------------------------------- */
    return (
        <div className="bg-white p-8 rounded-2xl shadow border max-w-4xl mx-auto">

            {/* Input */}
            <textarea
                className="w-full p-4 border rounded-xl h-40 text-gray-800 bg-gray-50 focus:ring-2 focus:ring-blue-400"
                placeholder="we will integrate with GLEAN soon;) "
                value="we will integrate with GLEAN soon ;)"
                onChange={(e) => setInput(e.target.value)}
            />

            {/* Button */}
            {/* <button
                onClick={() => askAI()}
                disabled={loading}
                className="mt-4 px-6 py-3 bg-black text-white rounded-xl shadow hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? "Thinking..." : "Ask"}
            </button> */}

            {/* Disambiguation */}
            {renderDisambiguation()}

            {/* Results */}
            <div className="mt-6">{renderResult()}</div>
        </div>
    );
}
