import React, { useState, useEffect, useRef } from "react";
import OrgChart from "../components/OrgChart_old";
import api from "../api/api";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import CustomerMappingModal from "./modals/CustomerMappingModal";


export default function AccountOrgChart() {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");

    const [customers, setCustomers] = useState([]);
    const [focusEmail, setFocusEmail] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [orientation, setOrientation] = useState("vertical");
    const [mappingModalOpen, setMappingModalOpen] = useState(false);
    const [modalAccountId, setModalAccountId] = useState("");




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
            return;
        }

        (async () => {
            try {
                const res = await api.get(`/org-chart/${selectedAccountId}`);
                const data = res.data || [];
                setCustomers(data);

                // find CEO (no managers)
                const ceo =
                    data.find((x) => Array.isArray(x.reportingTo) && x.reportingTo.length === 0) ||
                    data[0];

                // only auto-focus CEO when no search term
                if (!searchTerm && ceo) {
                    setFocusEmail(ceo.email);
                }

                // reset pan
                setPosition({ x: 0, y: 0 });

            } catch (err) {
                console.error("Error loading org chart:", err);
            }
        })();
    }, [selectedAccountId]);

    /* ---------------- Search → Focus Only ---------------- */
    useEffect(() => {
        if (!searchTerm || customers.length === 0) return;

        const match = customers.find(
            (c) =>
                c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (match) {
            setFocusEmail(match.email);
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

    return (
        <div className="w-full h-full relative select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-700">Account Org Chart</h1>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        className="border px-3 py-2 rounded w-64"
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



                <div className="flex gap-2">
       

                    <button
                        onClick={() => {
                            if (!selectedAccountId) {
                                alert("Please select an account first.");
                                return;
                            }

                            // Use highlighted node OR fallback to __new__
                            const targetEmail = focusEmail ? focusEmail : "__new__";

                            setModalAccountId(selectedAccountId);
                            setMappingModalOpen(true);

                            // Pass the email to modal
                            setTimeout(() => {
                                // This ensures modal receives updated props
                                setFocusEmail(targetEmail);
                            }, 0);
                        }}
                        className="px-3 py-2 bg-teal-600 text-white rounded"
                    >
                        View
                    </button>


                    <button
                        onClick={() =>
                            setOrientation((o) =>
                                o === "vertical" ? "horizontal" : "vertical"
                            )
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
            </div>

            {/* Account Dropdown */}
            <div className="mb-4">
                <label className="block font-semibold mb-2">Select Account</label>
                <select
                    className="border rounded-lg px-3 py-2 w-64"
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

            {/* Main Org Chart */}
            <div
                ref={containerRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                style={{ height: 760 }}
                className="border rounded-xl shadow bg-white w-full overflow-hidden relative"
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
                            focusEmail={focusEmail}
                            orientation={orientation}
                            onSelect={(node) => setFocusEmail(node.email)}
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
                        <OrgChart customers={customers} focusEmail={focusEmail} />
                    </div>
                </div>
            </div>
            {mappingModalOpen && (
                <CustomerMappingModal
                    isOpen={mappingModalOpen}
                    onClose={() => setMappingModalOpen(false)}
                    customerEmail={focusEmail || "__new__"}
                    customerName=""         // new person
                    accountId={modalAccountId}
                    onMapPerson={() => { }}
                />
            )}

        </div>
    );
}
