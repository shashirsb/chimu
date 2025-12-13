import React, { useState, useEffect, useRef } from "react";
import api from "../api/api";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import CustomerMappingModal from "./modals/CustomerMappingModal";

export default function AccountOrgChart() {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");

    const [customers, setCustomers] = useState([]);
    const [ceos, setCeos] = useState([]); // <-- new: store all top-level nodes
    const [focusEmail, setFocusEmail] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [orientation, setOrientation] = useState("vertical");
    const [mappingModalOpen, setMappingModalOpen] = useState(false);
    const [modalAccountId, setModalAccountId] = useState("");

    // Right side details panel
    const [selectedNode, setSelectedNode] = useState(null);

    // Panning Only (no zoom)
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const innerRef = useRef(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    /* ---------------- Load Accounts ---------------- */
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/accounts");
                setAccounts(res.data || []);
            } catch (err) {
                console.error("Error loading accounts:", err);
            }
        })();
    }, []);

    /* ---------------- Load Customers ---------------- */
    useEffect(() => {
        if (!selectedAccountId) {
            setCustomers([]);
            setFocusEmail("");
            setCeos([]);
            setSelectedNode(null);
            return;
        }

        (async () => {
            try {
                const res = await api.get(`/org-chart/${selectedAccountId}`);
                const data = res.data || [];
                setCustomers(data);

                // find ALL CEOs (no managers)
                const allCeos = data.filter(
                    (x) => Array.isArray(x.reportingTo) && x.reportingTo.length === 0
                );

                setCeos(allCeos);

                // only auto-focus first CEO when no search term
                if (!searchTerm && allCeos.length > 0) {
                    setFocusEmail(allCeos[0].email);
                }

                // reset pan & details
                setPosition({ x: 0, y: 0 });
                setSelectedNode(null);

            } catch (err) {
                console.error("Error loading org chart:", err);
            }
        })();
    }, [selectedAccountId]);

    /* ---------------- Search → Focus Only (improved ranking) ---------------- */
    useEffect(() => {
        if (!searchTerm || customers.length === 0) return;

        const text = searchTerm.toLowerCase().trim();
        if (!text) return;

        // 1) startsWith on name or email
        let match =
            customers.find((c) => (c.name || "").toLowerCase().startsWith(text)) ||
            customers.find((c) => (c.email || "").toLowerCase().startsWith(text));

        // 2) includes on name or email
        if (!match) {
            match =
                customers.find((c) => (c.name || "").toLowerCase().includes(text)) ||
                customers.find((c) => (c.email || "").toLowerCase().includes(text));
        }

        // 3) fallback: exact match on email
        if (!match) {
            match = customers.find(
                (c) => (c.email || "").toLowerCase() === text
            );
        }

        if (match) {
            setFocusEmail(match.email);
            // Also select node (populate details panel)
            setSelectedNode(match);
        }
    }, [searchTerm, customers]);

    /* ---------------- Drag to Pan ---------------- */
    const onMouseDown = (e) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setPosition((p) => ({ x: p.x + dx, y: p.y + dy }));
    };

    const endDrag = () => {
        isDragging.current = false;
    };

    /* ---------------- Download PNG ---------------- */
    const downloadPNG = async () => {
        if (!innerRef.current) return;
        const dataUrl = await htmlToImage.toPng(innerRef.current, {
            backgroundColor: "#ffffff",
        });
        const link = document.createElement("a");
        link.download = "org-chart.png";
        link.href = dataUrl;
        link.click();
    };

    /* ---------------- Download PDF ---------------- */
    const downloadPDF = async () => {
        if (!innerRef.current) return;
        const dataUrl = await htmlToImage.toPng(innerRef.current, {
            backgroundColor: "#ffffff",
        });
        const pdf = new jsPDF("l", "pt", "a4");
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("org-chart.pdf");
    };

    /* ---------------- Toolbar: View button behavior ---------------- */
    const onViewClick = () => {
        if (!selectedAccountId) {
            alert("Please select an account first.");
            return;
        }

        // Use highlighted node OR fallback to first CEO OR __new__
        const targetEmail = focusEmail || (ceos[0] && ceos[0].email) || "__new__";

        setModalAccountId(selectedAccountId);
        setMappingModalOpen(true);

        // Ensure modal receives updated props
        setTimeout(() => {
            setFocusEmail(targetEmail);
        }, 0);
    };

    /* ---------------- Node select handler (from OrgChart) ---------------- */
    const handleSelectNode = (node) => {
        setFocusEmail(node.email);
        setSelectedNode(node);
    };

    return (
        <div className="w-full h-full relative select-none p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-700 mb-2">Account Org Chart</h1>

                    <div className="flex gap-3 items-center">
                        <label className="text-sm font-medium mr-2">Select Account</label>
                        <select
                            className="border rounded-lg px-3 py-2"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                        >
                            <option value="">-- Choose Account --</option>
                            {accounts.map((acc) => (
                                <option key={acc._id} value={acc._id}>
                                    {acc.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        className="border px-3 py-2 rounded w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        onClick={() => setSearchTerm("")}
                        className="px-3 py-2 bg-gray-100 rounded"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Sub-toolbar */}
            <div className="flex items-center gap-2 mb-4">
                <button onClick={onViewClick} className="px-4 py-2 bg-teal-600 text-white rounded">
                    View Person
                </button>
                <button
                    onClick={() =>
                        setOrientation((o) => (o === "vertical" ? "horizontal" : "vertical"))
                    }
                    className="px-3 py-2 bg-gray-200 rounded"
                >
                    🔁 Orientation
                </button>
                <button onClick={downloadPNG} className="px-3 py-2 bg-gray-200 rounded">
                    🖼 PNG
                </button>
                <button onClick={downloadPDF} className="px-3 py-2 bg-gray-200 rounded">
                    📄 PDF
                </button>
            </div>

            {/* Main layout: Chart area + Right Details panel */}
            <div className="flex gap-4 w-full" style={{ minHeight: 720 }}>
                {/* Chart column */}
                <div
                    className="flex-1 border rounded-xl shadow bg-white overflow-hidden relative"
                    style={{ minHeight: 720 }}
                >
                    <div
                        ref={containerRef}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={endDrag}
                        onMouseLeave={endDrag}
                        style={{ height: "100%" }}
                    >
                        <div
                            ref={innerRef}
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px)`,
                                transformOrigin: "top left",
                                transition: isDragging.current ? "none" : "transform 0.25s ease-out",
                            }}
                        >
                            {selectedAccountId && customers.length > 0 ? (
                                <OrgChart
                                    customers={customers}
                                    ceos={ceos}
                                    focusEmail={focusEmail}
                                    orientation={orientation}
                                    onSelect={handleSelectNode}
                                />
                            ) : selectedAccountId ? (
                                <div className="p-4 text-gray-400">Loading org data…</div>
                            ) : (
                                <div className="p-4 text-gray-400">Select an account to view org</div>
                            )}
                        </div>

                        {/* Minimap */}
                        <div
                            className="absolute bottom-4 right-4 bg-white border shadow-lg rounded p-2"
                            style={{ width: 220, height: 160, overflow: "hidden" }}
                        >
                            <div
                                style={{
                                    transform: "scale(0.12)",
                                    transformOrigin: "top left",
                                    opacity: 0.7,
                                    pointerEvents: "none",
                                }}
                            >
                                <OrgChart customers={customers} ceos={ceos} focusEmail={focusEmail} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right details panel */}
                <div className="w-96 border rounded-xl p-4 bg-white">
                    {selectedNode ? (
                        <>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-lg font-semibold">{selectedNode.name || emailHandle(selectedNode.email)}</div>
                                    <div className="text-sm text-gray-500">{selectedNode.designation}</div>
                                    <div className="text-xs text-gray-400 mt-1">{selectedNode.email}</div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500">Sentiment</div>
                                    <div className="mt-1"><Badge value={selectedNode.sentiment || "Unknown"} /></div>
                                </div>
                            </div>

                            <hr className="my-3" />

                            <div className="text-sm font-medium mb-2">Log History</div>
                            {selectedNode.logHistory && selectedNode.logHistory.length ? (
                                <div className="space-y-2 max-h-56 overflow-auto">
                                    {selectedNode.logHistory.map((l, i) => (
                                        <div key={i} className="p-2 bg-gray-50 border rounded">
                                            <div className="text-gray-800 text-sm">{l.summary}</div>
                                            <div className="flex justify-between text-[12px] text-gray-500 mt-1">
                                                <span>{l.timestamp ? new Date(l.timestamp).toLocaleString() : ""}</span>
                                                <span>{l.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-400 italic">No logs</div>
                            )}

                            <div className="mt-4 flex gap-2">
                                <button
                                    className="flex-1 px-3 py-2 bg-teal-600 text-white rounded"
                                    onClick={() => {
                                        setModalAccountId(selectedAccountId);
                                        setMappingModalOpen(true);
                                    }}
                                >
                                    Edit Mapping
                                </button>
                                <button
                                    className="px-3 py-2 bg-gray-100 rounded"
                                    onClick={() => {
                                        // center on node
                                        if (selectedNode && selectedNode.email) setFocusEmail(selectedNode.email);
                                    }}
                                >
                                    Center
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-gray-500">Select a node to view details</div>
                    )}
                </div>
            </div>

            {mappingModalOpen && (
                <CustomerMappingModal
                    isOpen={mappingModalOpen}
                    onClose={() => setMappingModalOpen(false)}
                    customerEmail={focusEmail || "__new__"}
                    customerName={selectedNode?.name || ""} // new person
                    accountId={modalAccountId}
                    onMapPerson={() => { }}
                />
            )}
        </div>
    );
}

/* ---------------- Small helper reused here ---------------- */
function emailHandle(email) {
    if (!email) return "";
    return String(email).split("@")[0];
}

function Badge({ value }) {
    const cls =
        {
            High: "bg-green-50 text-green-700 border-green-200",
            Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
            Low: "bg-red-50 text-red-700 border-red-200",
            Unknown: "bg-gray-50 text-gray-600 border-gray-200",
        }[value] || "bg-gray-50 text-gray-600 border-gray-200";

    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cls}`}>
            {value}
        </span>
    );
}
