// src/components/CustomerMappingModal.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../api/api";
import OrgChart from "../../components/OrgChart_old";
import { X, User, Mail, Briefcase, ChevronRight, ChevronDown, Search, Trash2 } from "lucide-react";

// Constants
const SENTIMENTS = ["High", "Medium", "Low", "Unknown"];
const AWARENESS = ["Hold", "Email only", "Low", "Unknown"];
const ROLES = [
    { value: "techChampion", label: "Tech Champion" },
    { value: "businessChampion", label: "Business Champion" },
    { value: "economicBuyer", label: "Economic Buyer" },
    { value: "coach", label: "Coach" },
    { value: "influential", label: "Influential" },
    { value: "noPower", label: "No Power" },
    { value: "unknown", label: "Unknown" },
    { value: "detractor", label: "Detractor" },
];

export default function CustomerMappingModal({
    isOpen,
    onClose,
    customerEmail,
    customerName,
    accountId,
    onMapPerson
}) {
    // UI state
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [existingCustomers, setExistingCustomers] = useState([]);
    const [accountBUOptions, setAccountBUOptions] = useState([]); // account-level BU suggestions

    // drawer / selection
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null); // used in header

    // user
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const [user] = useState(storedUser);

    // compact defaults form
    const emptyForm = useMemo(() => ({
        name: "",
        email: "",
        designation: "",
        location: "",
        stage: "",
        tgo: "",
        cto: "",
        ao: "",
        appNames: [],
        annualCost: "$ 0.00",
        annualMDBCost: "$ 0.00",
        monthlyMDBCost: "$ 0.00",
        sentiment: "Unknown",
        awareness: "Unknown",
        type: "unknown",
        decisionMaker: false,
        reportingTo: [],
        reportees: [],
        accountId: accountId || "",
        businessUnit: [],
        logHistory: []
    }), [accountId]);

    const [form, setForm] = useState(emptyForm);

    // suggestions for reportingTo/reportees
    const suggestions = useMemo(() =>
        (existingCustomers || []).map(c => ({
            email: c.email,
            name: c.name,
            label: c.name ? `${c.name} <${c.email}>` : c.email
        })), [existingCustomers]);


    // load account BU options (if account endpoint exists)
    useEffect(() => {
        if (!accountId) {
            setAccountBUOptions([]);
            return;
        }
        // try to get account info (safe fallback)
        api.get(`/accounts/${accountId}`)
            .then(res => {
                const bu = res.data?.businessUnit || [];
                setAccountBUOptions(Array.isArray(bu) ? bu.map(String) : []);
            })
            .catch(() => setAccountBUOptions([]));
    }, [accountId]);

    // load customers for suggestions (account-scoped)
    useEffect(() => {
        if (!isOpen || !accountId) return;
        api.get(`/customer/account/${accountId}`)
            .then(res => setExistingCustomers(res.data || []))
            .catch(() => setExistingCustomers([]));
    }, [isOpen, accountId]);

    // Load org chart tree and bind form to root node (if present)
    const loadTree = useCallback(async () => {
        if (!isOpen || !customerEmail) return;
        setLoading(true);
        setNotFound(false);
        setEditMode(false);

        try {
            const res = await api.get(`/customer/tree/${encodeURIComponent(customerEmail)}`);
            setCustomers(flattenTree(res.data));

            const root = res.data || null;
            if (root && root.email) {
                setForm({
                    name: root.name || "",
                    email: root.email || "",
                    designation: root.designation || "",
                    location: root.location || "",
                    stage: root.stage || "",
                    tgo: root.tgo || "",
                    cto: root.cto || "",
                    ao: root.ao || "",
                    appNames: Array.isArray(root.appNames) ? root.appNames : [],
                    annualCost: root.annualCost || "$ 0.00",
                    annualMDBCost: root.annualMDBCost || "$ 0.00",
                    monthlyMDBCost: root.monthlyMDBCost || "$ 0.00",
                    sentiment: root.sentiment || "Unknown",
                    awareness: root.awareness || "Unknown",
                    type: root.type || "unknown",
                    decisionMaker: !!root.decisionMaker,
                    reportingTo: Array.isArray(root.reportingTo) ? root.reportingTo : [],
                    reportees: Array.isArray(root.reportees) ? root.reportees : [],
                    accountId: accountId || root.accountId || "",
                    businessUnit: Array.isArray(root.businessUnit) ? root.businessUnit : [],
                    logHistory: Array.isArray(root.logHistory) ? root.logHistory : []
                });

                setSelectedNode(root);
                setEditMode(true);
            }

            setDrawerOpen(true);
        } catch (err) {
            if (err?.response?.status === 404) {
                setNotFound(true);
                setForm(f => ({
                    ...f,
                    email: customerEmail,
                    name: customerName || f.name,
                    accountId: accountId || f.accountId,
                    businessUnit: []
                }));
                setEditMode(false);
                setDrawerOpen(true);
            } else {
                console.error("loadTree error:", err);
            }
        } finally {
            setLoading(false);
        }
    }, [isOpen, customerEmail, accountId, customerName]);

    useEffect(() => { loadTree(); }, [loadTree]);

    // When selecting a node from chart → fetch full node and load form
    const handleSelectNode = (nodeLike) => {
        // nodeLike is expected to be full node (if we fetched), else fetch upstream
        const bindNode = (node) => {
            setSelectedNode(node);
            setEditMode(true);
            setDrawerOpen(true);
            setForm({
                name: node.name || "",
                email: node.email || "",
                designation: node.designation || "",
                location: node.location || "",
                stage: node.stage || "",
                tgo: node.tgo || "",
                cto: node.cto || "",
                ao: node.ao || "",
                appNames: Array.isArray(node.appNames) ? node.appNames : [],
                annualCost: node.annualCost || "$ 0.00",
                annualMDBCost: node.annualMDBCost || "$ 0.00",
                monthlyMDBCost: node.monthlyMDBCost || "$ 0.00",
                sentiment: node.sentiment || "Unknown",
                awareness: node.awareness || "Unknown",
                type: node.type || "unknown",
                decisionMaker: !!node.decisionMaker,
                reportingTo: Array.isArray(node.reportingTo) ? node.reportingTo : [],
                reportees: Array.isArray(node.reportees) ? node.reportees : [],
                accountId: node.accountId || accountId || "",
                businessUnit: Array.isArray(node.businessUnit) ? node.businessUnit : [],
                logHistory: Array.isArray(node.logHistory) ? node.logHistory : []
            });
        };

        // if nodeLike has more fields, bind directly; otherwise fetch by email
        if (nodeLike && nodeLike.appNames !== undefined) {
            bindNode(nodeLike);
            return;
        }

        // fetch full node
        (async () => {
            try {
                const res = await api.get(`/customer/tree/${encodeURIComponent(nodeLike.email)}`);
                if (res?.data) bindNode(res.data);
            } catch (err) {
                console.error("Failed to fetch node details:", err);
            }
        })();
    };

    // SAVE / UPSERT customer
    const upsert = async () => {
        let logEntry = null;

        if (form.newLogSummary?.trim()) {
            logEntry = {
                summary: form.newLogSummary.trim(),
                sentiment: form.sentiment,
                awareness: form.awareness,
                createdById: user?.id,
                email: user?.email
            };
        }

        const payload = {
            name: form.name?.trim(),
            email: form.email?.trim(),
            designation: form.designation?.trim(),
            location: form.location?.trim(),
            stage: form.stage?.trim(),
            tgo: form.tgo?.trim(),
            cto: form.cto?.trim(),
            ao: form.ao?.trim(),
            appNames: form.appNames || [],
            annualCost: form.annualCost,
            annualMDBCost: form.annualMDBCost,
            monthlyMDBCost: form.monthlyMDBCost,
            sentiment: form.sentiment,
            awareness: form.awareness,
            type: form.type,
            decisionMaker: !!form.decisionMaker,
            reportingTo: form.reportingTo,
            reportees: form.reportees,
            accountId,
            businessUnit: Array.isArray(form.businessUnit) ? form.businessUnit : [],
            logEntry
        };

        try {
            setLoading(true);
            if (editMode) {
                await api.put(`/customer/${encodeURIComponent(payload.email)}`, payload);
            } else {
                await api.post("/customer", payload);
            }
            await loadTree();
            setDrawerOpen(false);
        } catch (err) {
            console.error("upsert error:", err);
            alert("Unable to save. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
                onClick={onClose}
            />

            <div className="absolute inset-0 flex">

                {/* LEFT: ORG CHART */}
                <div className="flex-1 min-w-0 bg-white rounded-r-2xl shadow-xl overflow-hidden border-r">
                    <div className="h-14 px-4 flex items-center justify-between border-b bg-gray-50">
                        <div>
                            <div className="text-teal-700 font-semibold">Org Chart</div>
                            <div className="text-xs text-gray-500">Focus: {customerEmail}</div>
                        </div>

                        <div className="flex items-center gap-2">

                            {!notFound && (
                                <button
                                    className="text-sm px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                                    onClick={() => {
                                        setSelectedNode(null);
                                        setForm({
                                            ...emptyForm,
                                            accountId,
                                            businessUnit: [],
                                            email: "",
                                            name: ""
                                        });
                                        setEditMode(false);
                                        setDrawerOpen(true);
                                    }}
                                >
                                    + New Person
                                </button>
                            )}

                            <button
                                className="p-2 rounded-full hover:bg-gray-200"
                                onClick={onClose}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* ORG CHART CONTENT */}
                    <div className="h-[calc(100%-56px)] p-3">
                        {loading ? (
                            <div className="h-full grid place-items-center text-gray-500">
                                Loading…
                            </div>
                        ) : notFound ? (
                            <div className="h-full grid place-items-center text-gray-500 text-sm">
                                No profile found for <b>{customerEmail}</b>. Create one using the form.
                            </div>
                        ) : (
                            <OrgChart
                                customers={customers}
                                focusEmail={customerEmail}
                                onSelect={(node) => {
                                    handleSelectNode(node);
                                    onMapPerson?.(node);
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* RIGHT: COMPACT DRAWER */}
                <div
                    className={`relative w-full sm:w-[360px] bg-white border-l shadow-2xl transform transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                >
                    {/* Drawer Header */}
                    <div className="sticky top-0 bg-white border-b p-3 flex items-center justify-between">
                        <div>
                            <div className="font-semibold text-gray-800">
                                {editMode ? "Edit Person" : "Create Person"}
                            </div>
                            <div className="text-[10px] text-gray-500">
                                Auto-complete inside this account
                            </div>
                        </div>

                        <button
                            className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium flex items-center gap-1"
                            onClick={() => setDrawerOpen(!drawerOpen)}
                        >
                            {drawerOpen ? (
                                <ChevronDown size={14} />
                            ) : (
                                <ChevronRight size={14} />
                            )}
                            Form
                        </button>
                    </div>

                    {/* Drawer Scroll Area */}
                    <div className="p-3 space-y-3 overflow-y-auto h-[calc(100%-50px)]">

                        {/* NAME */}
                        <Field label="Full Name" icon={User}>
                            <input
                                className="w-full border rounded-lg px-9 py-1.5 text-sm"
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                placeholder="e.g., Priya Sharma"
                            />
                        </Field>

                        {/* EMAIL */}
                        <Field label="Email" icon={Mail}>
                            <input
                                className={`w-full border rounded-lg px-9 py-1.5 text-sm ${editMode ? "bg-gray-100" : ""
                                    }`}
                                value={form.email}
                                disabled={editMode}
                                onChange={(e) =>
                                    !editMode &&
                                    setForm({ ...form, email: e.target.value })
                                }
                                placeholder="name@company.com"
                            />
                        </Field>

                        {/* DESIGNATION */}
                        <Field label="Designation" icon={Briefcase}>
                            <input
                                className="w-full border rounded-lg px-9 py-1.5 text-sm"
                                value={form.designation}
                                onChange={(e) =>
                                    setForm({ ...form, designation: e.target.value })
                                }
                                placeholder="e.g., VP Procurement"
                            />
                        </Field>

                        {/* LOCATION & STAGE */}
                        <div className="grid grid-cols-2 gap-2">
                            <Labeled label="Location">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.location}
                                    onChange={(e) =>
                                        setForm({ ...form, location: e.target.value })
                                    }
                                />
                            </Labeled>

                            <Labeled label="Stage">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.stage}
                                    onChange={(e) =>
                                        setForm({ ...form, stage: e.target.value })
                                    }
                                />
                            </Labeled>
                        </div>

                        {/* ORG DETAILS */}
                        <section className="border rounded-lg p-3 bg-gray-50 space-y-2">
                            <div className="font-semibold text-gray-700 text-sm">
                                Org Details
                            </div>

                            <Labeled label="TGO">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.tgo}
                                    onChange={(e) =>
                                        setForm({ ...form, tgo: e.target.value })
                                    }
                                />
                            </Labeled>

                            <Labeled label="CTO">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.cto}
                                    onChange={(e) =>
                                        setForm({ ...form, cto: e.target.value })
                                    }
                                />
                            </Labeled>

                            <Labeled label="AO">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.ao}
                                    onChange={(e) =>
                                        setForm({ ...form, ao: e.target.value })
                                    }
                                />
                            </Labeled>
                        </section>

                        {/* APPLICATION INFO */}
                        <section className="border rounded-lg p-3 bg-gray-50 space-y-2">
                            <div className="font-semibold text-gray-700 text-sm">
                                Applications Info
                            </div>

                            <Labeled label="Applications">
                                <AppNamesSelect
                                    value={form.appNames}
                                    onChange={(arr) => setForm({ ...form, appNames: arr })}
                                />
                            </Labeled>

                            <Labeled label="Annual Cost">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.annualCost}
                                    onChange={(e) =>
                                        setForm({ ...form, annualCost: e.target.value })
                                    }
                                />
                            </Labeled>

                            <Labeled label="Annual MDB Cost">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.annualMDBCost}
                                    onChange={(e) =>
                                        setForm({ ...form, annualMDBCost: e.target.value })
                                    }
                                />
                            </Labeled>

                            <Labeled label="Monthly MDB Cost">
                                <input
                                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                    value={form.monthlyMDBCost}
                                    onChange={(e) =>
                                        setForm({ ...form, monthlyMDBCost: e.target.value })
                                    }
                                />
                            </Labeled>
                        </section>

                        {/* BUSINESS UNITS */}
                        <Labeled label="Business Units">
                            <BUSelect
                                value={form.businessUnit}
                                onChange={(arr) =>
                                    setForm({ ...form, businessUnit: arr })
                                }
                                options={accountBUOptions}
                            />
                        </Labeled>

                        {/* SENTIMENT + AWARENESS */}
                        <div className="grid grid-cols-2 gap-2">
                            <Labeled label="Sentiment">
                                <select
                                    className={`w-full border rounded-lg px-3 py-1.5 text-sm ${sentimentColor(
                                        form.sentiment
                                    )}`}
                                    value={form.sentiment}
                                    onChange={(e) =>
                                        setForm({ ...form, sentiment: e.target.value })
                                    }
                                >
                                    {SENTIMENTS.map((s) => (
                                        <option key={s}>{s}</option>
                                    ))}
                                </select>
                            </Labeled>

                            <Labeled label="Out Reach">
                                <select
                                    className={`w-full border rounded-lg px-3 py-1.5 text-sm ${awarenessColor(
                                        form.awareness
                                    )}`}
                                    value={form.awareness}
                                    onChange={(e) =>
                                        setForm({ ...form, awareness: e.target.value })
                                    }
                                >
                                    {AWARENESS.map((s) => (
                                        <option key={s}>{s}</option>
                                    ))}
                                </select>
                            </Labeled>
                        </div>

                        {/* ROLE */}
                        <Labeled label="Role / Type">
                            <select
                                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                                value={form.type}
                                onChange={(e) =>
                                    setForm({ ...form, type: e.target.value })
                                }
                            >
                                {ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </Labeled>

                        {/* DECISION MAKER */}
                        <Labeled label="Decision Maker?">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4"
                                    checked={!!form.decisionMaker}
                                    onChange={(e) =>
                                        setForm({ ...form, decisionMaker: e.target.checked })
                                    }
                                />
                                <span className="text-sm">Has signing authority</span>
                            </label>
                        </Labeled>

                        {/* REPORTING LINES */}
                        <MultiEmailSelect
                            label="Reporting To"
                            placeholder="Type email, press Enter"
                            value={form.reportingTo}
                            onChange={(arr) =>
                                setForm({ ...form, reportingTo: arr })
                            }
                            suggestions={suggestions}
                        />

                        <MultiEmailSelect
                            label="Reportees"
                            placeholder="Type email, press Enter"
                            value={form.reportees}
                            onChange={(arr) =>
                                setForm({ ...form, reportees: arr })
                            }
                            suggestions={suggestions}
                        />

                        {/* HISTORY */}
                        <section className="border rounded-lg p-3 bg-gray-50 space-y-2">
                            <div className="font-semibold text-gray-700 text-sm">
                                History
                            </div>

                            <textarea
                                className="w-full border rounded-lg p-2 text-sm"
                                rows={3}
                                value={form.newLogSummary || ""}
                                onChange={(e) =>
                                    setForm({ ...form, newLogSummary: e.target.value })
                                }
                                placeholder="Add new log entry…"
                            />

                            {/* CONTACTED BY */}
                            <div className="pt-2 border-t">
                                <div className="text-xs font-semibold mb-1">
                                    Contacted By
                                </div>
                                {form.logHistory?.length ? (
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(
                                            new Set(
                                                form.logHistory
                                                    .map((l) => l.email)
                                                    .filter(Boolean)
                                            )
                                        ).map((email) => (
                                            <span
                                                key={email}
                                                className="px-2 py-1 bg-gray-100 border rounded text-[11px]"
                                            >
                                                {email}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-gray-500 italic">
                                        No contacts yet.
                                    </div>
                                )}
                            </div>

                            {/* LOG LIST */}
                            <div className="text-xs font-semibold mt-2">Previous Logs</div>

                            {form.logHistory?.length ? (
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                                    {form.logHistory.map((entry, i) => (
                                        <div
                                            key={i}
                                            className="p-2 bg-white border rounded-lg shadow-sm text-xs"
                                        >
                                            <div>{entry.summary}</div>
                                            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                                                <span>
                                                    {entry.timestamp
                                                        ? new Date(
                                                            entry.timestamp
                                                        ).toLocaleString()
                                                        : ""}
                                                </span>
                                                <span>{entry.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[11px] text-gray-500 italic">
                                    No history yet.
                                </div>
                            )}
                        </section>

                        {/* SAVE BUTTON */}
                        <div>
                            <button
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg font-semibold text-sm shadow"
                                onClick={upsert}
                            >
                                {editMode ? "Save Changes" : "Save & Build Org Chart"}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
} // end of main component
/* ============================================================
   FIELD WRAPPER
============================================================ */
function Field({ label, icon: Icon, children }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-700 mb-1">
                {label}
            </label>
            <div className="relative">
                {Icon && (
                    <Icon
                        size={16}
                        className="absolute left-3 top-2 text-gray-400"
                    />
                )}
                {children}
            </div>
        </div>
    );
}

/* ============================================================
   LABEL WRAPPER
============================================================ */
function Labeled({ label, children }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-700 mb-1">
                {label}
            </label>
            {children}
        </div>
    );
}

/* ============================================================
   MULTI EMAIL SELECT (ReportingTo / Reportees)
============================================================ */
function MultiEmailSelect({
    label,
    value = [],
    onChange,
    suggestions = [],
    placeholder
}) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return suggestions
            .filter(
                (s) =>
                    s.email.toLowerCase().includes(q) ||
                    (s.name || "").toLowerCase().includes(q)
            )
            .slice(0, 8);
    }, [query, suggestions]);

    const addEmail = (email) => {
        const v = (email || "").trim();
        if (!v) return;
        if (!isEmail(v)) return alert("Enter a valid email");
        if (value.includes(v)) return;
        onChange([...(value || []), v]);
        setQuery("");
    };

    const removeEmail = (email) =>
        onChange((value || []).filter((x) => x !== email));

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addEmail(query);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">
                {label}
            </label>

            <div className="border rounded-lg p-2">
                {/* TAGS */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {(value || []).map((email) => (
                        <span
                            key={email}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs"
                        >
                            {email}
                            <button
                                onClick={() => removeEmail(email)}
                                className="hover:text-red-600"
                            >
                                <Trash2 size={11} />
                            </button>
                        </span>
                    ))}
                </div>

                {/* SEARCH BOX */}
                <div className="relative">
                    <Search
                        size={14}
                        className="absolute left-3 top-2 text-gray-400"
                    />
                    <input
                        className="w-full border rounded-lg px-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                    {/* SUGGESTIONS */}
                    {query && filtered.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-48 overflow-auto">
                            {filtered.map((s) => (
                                <button
                                    key={s.email}
                                    type="button"
                                    onClick={() => addEmail(s.email)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                >
                                    <div className="text-sm font-medium">
                                        {s.label}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {s.email}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   BUSINESS UNIT SELECT (Freeform + Suggestions)
============================================================ */
function BUSelect({ value = [], onChange, options = [] }) {
    const [query, setQuery] = useState("");

    const selectedValues = useMemo(
        () => (Array.isArray(value) ? value : []),
        [value]
    );

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return (options || []).filter((o) =>
            o.toLowerCase().includes(q)
        );
    }, [query, options]);

    const addBU = (txt) => {
        const v = (txt || "").trim();
        if (!v) return;
        if (!selectedValues.includes(v))
            onChange([...(selectedValues || []), v]);
        setQuery("");
    };

    const removeBU = (bu) =>
        onChange(selectedValues.filter((x) => x !== bu));

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addBU(query);
        }
    };

    return (
        <div className="border rounded-lg p-2">
            {/* SELECTED TAGS */}
            <div className="flex flex-wrap gap-1 mb-2">
                {selectedValues.map((bu) => (
                    <span
                        key={bu}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs"
                    >
                        {bu}
                        <button
                            onClick={() => removeBU(bu)}
                            className="hover:text-red-600"
                        >
                            <Trash2 size={11} />
                        </button>
                    </span>
                ))}
            </div>

            {/* INPUT */}
            <div className="relative">
                <Search
                    size={14}
                    className="absolute left-3 top-2 text-gray-400"
                />
                <input
                    className="w-full border rounded-lg px-8 py-1.5 text-sm"
                    placeholder="Add BU, press Enter"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                {/* SUGGESTIONS IF ANY */}
                {query && filtered.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-48 overflow-auto">
                        {filtered.map((bu) => (
                            <button
                                key={bu}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                onClick={() => addBU(bu)}
                            >
                                {bu}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================
   APP NAMES SELECT (Free-text chip input)
============================================================ */
function AppNamesSelect({ value = [], onChange }) {
    const [query, setQuery] = useState("");

    const selected = useMemo(
        () => (Array.isArray(value) ? value : []),
        [value]
    );

    const addApp = (txt) => {
        const v = (txt || "").trim();
        if (!v) return;
        if (!selected.includes(v))
            onChange([...(selected || []), v]);
        setQuery("");
    };

    const removeApp = (a) =>
        onChange(selected.filter((x) => x !== a));

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addApp(query);
        }
    };

    return (
        <div className="border rounded-lg p-2">
            {/* TAGS */}
            <div className="flex flex-wrap gap-1 mb-2">
                {selected.map((app) => (
                    <span
                        key={app}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs"
                    >
                        {app}
                        <button
                            onClick={() => removeApp(app)}
                            className="hover:text-red-600"
                        >
                            <Trash2 size={11} />
                        </button>
                    </span>
                ))}
            </div>

            {/* INPUT */}
            <div className="relative">
                <Search
                    size={14}
                    className="absolute left-3 top-2 text-gray-400"
                />
                <input
                    className="w-full border rounded-lg px-8 py-1.5 text-sm"
                    placeholder="Add application, press Enter"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
        </div>
    );
}

/* ============================================================
   UTILITIES
============================================================ */
function isEmail(v) {
    return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
}

function sentimentColor(v) {
    return (
        {
            High: "bg-green-50 text-green-700",
            Medium: "bg-yellow-50 text-yellow-700",
            Low: "bg-red-50 text-red-700",
            Unknown: "bg-gray-50 text-gray-600"
        }[v] || ""
    );
}

function awarenessColor(v) {
    return (
        {
            High: "bg-blue-50 text-blue-700",
            Medium: "bg-indigo-50 text-indigo-700",
            Low: "bg-red-50 text-red-700",
            Unknown: "bg-gray-50 text-gray-600"
        }[v] || ""
    );
}

function flattenTree(tree) {
    const arr = [];
    const vis = new Set();
    const dfs = (node) => {
        if (!node || vis.has(node.email)) return;
        vis.add(node.email);
        arr.push(node);
        (node.reportingToTree || []).forEach(dfs);
        (node.reporteesTree || []).forEach(dfs);
    };
    dfs(tree);
    return arr;
}
