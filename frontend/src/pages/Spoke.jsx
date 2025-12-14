// src/pages/Spoke.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { Pencil, Trash2, Plus, Search, X } from "lucide-react"; // Added 'X' icon
import { useNavigate } from "react-router-dom";

// Utility to convert Array to a searchable string for filtering (unchanged)
const arrayToSearchableString = (arr) => {
    return Array.isArray(arr) ? arr.filter(s => s?.trim()).join(' ').toLowerCase() : "";
};

// --- 1. NEW: Error Popup Component ---
const ErrorPopup = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-500">
                <div className="flex justify-between items-start p-5">
                    <div>
                        <h3 className="text-lg font-semibold text-red-700">Operation Failed</h3>
                        <p className="mt-1 text-sm text-gray-600">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        aria-label="Close error message"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Spoke() {
    const [spokes, setSpokes] = useState([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [accountFilter, setAccountFilter] = useState("All");
    
    // --- 2. NEW: State for error handling ---
    const [error, setError] = useState(null); 

    const pageSize = 6;
    const navigate = useNavigate();

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const res = await api.get("/spoke"); 
            // Handle possibility of res.data being null or undefined
            setSpokes(res.data?.docs || res.data || []);
        } catch (err) {
            // --- 3. ENHANCED: Error handling for initial load ---
            console.error("Failed to load spokes:", err);
            let userMessage = "Could not load the Spoke directory. Please check your network connection.";
            
            if (err.response) {
                // Specific error messages based on status codes
                if (err.response.status === 403) {
                    userMessage = "You do not have permission to access the Spoke directory (Error 403).";
                } else {
                    userMessage = `Failed to load data: ${err.response.statusText} (${err.response.status}).`;
                }
            }
            setError(userMessage);
        }
    };


    // --- FILTERED SPOKES LOGIC (unchanged) ---
    const filteredSpokes = useMemo(() => {
        const q = (search || "").trim().toLowerCase();
        
        return spokes.filter((s) => {
            // ... filtering logic (omitted for brevity, assume unchanged)
            const accountMatch = 
                accountFilter === "All" || s.accountName === accountFilter;
            
            if (!accountMatch) return false;

            if (q) {
                const simpleMatch = 
                    s.accountName?.toLowerCase().includes(q) ||
                    s.spoke?.toLowerCase().includes(q) ||
                    s.User?.toLowerCase().includes(q) ||
                    s.internalNotes?.toLowerCase().includes(q);

                const arrayMatch = 
                    arrayToSearchableString(s.partners).includes(q) ||
                    arrayToSearchableString(s.whoCares).includes(q) ||
                    arrayToSearchableString(s.techStack).includes(q) ||
                    arrayToSearchableString(s.descriptionRelevancy).includes(q) ||
                    arrayToSearchableString(s.bigRockGoal).includes(q) ||
                    arrayToSearchableString(s.challengesPainPoints).includes(q) ||
                    arrayToSearchableString(s.whyMongoDB).includes(q) ||
                    arrayToSearchableString(s.whyNow).includes(q) ||
                    arrayToSearchableString(s.proofPoint).includes(q) ||
                    arrayToSearchableString(s.talkTrack).includes(q);

                if (!simpleMatch && !arrayMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [spokes, search, accountFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredSpokes.length / pageSize));
    const pageItems = filteredSpokes.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const openNew = () => navigate("/spoke/new");

    const openEdit = (item) => {
        navigate(`/spoke/${item._id}/edit`, { state: { spoke: item } });
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Are you sure you want to delete the Spoke: "${item.spoke || item.accountName}"?`)) return;
        
        try {
            await api.delete(`/spoke/${item._id}`);
            setSpokes((prev) => prev.filter((p) => p._id !== item._id));
        } catch (err) {
            // --- 4. ENHANCED: Error handling for delete operation ---
            console.error("Delete failed:", err);
            
            let userMessage = `Failed to delete Spoke "${item.spoke || item.accountName}".`;
            
            if (err.response) {
                if (err.response.status === 404) {
                    userMessage = `The Spoke record was not found or has already been deleted.`;
                } else if (err.response.status === 403) {
                    userMessage = `You do not have permission to delete this Spoke (Error 403).`;
                } else {
                    userMessage = `Delete failed: ${err.response.statusText} (${err.response.status}).`;
                }
            }
            
            setError(userMessage);
        }
    };

    const availableAccounts = useMemo(() => {
        const s = new Set();
        spokes.forEach((a) => {
            if (a.accountName?.trim()) s.add(a.accountName.trim());
        });
        return ["All", ...Array.from(s).sort()];
    }, [spokes]);


    // Utility to check if a field array has content (unchanged)
    const hasContent = (arr) => Array.isArray(arr) && arr.filter(s => s?.trim()).length > 0;


    return (
        <div className="p-8 min-h-screen bg-gray-50">
            
            {/* --- 5. RENDER THE POPUP --- */}
            <ErrorPopup 
                message={error} 
                onClose={() => setError(null)} 
            />

            {/* Header (unchanged) */}
            <div className="flex flex-col md:flex-row justify-between mb-8">
                <h2 className="text-3xl font-light text-gray-800 tracking-wide">Spoke Directory</h2>
                <button
                    onClick={openNew}
                    className="border border-teal-500 text-teal-600 px-5 py-2 rounded-lg hover:bg-teal-50 transition flex items-center gap-2 font-medium mt-4 md:mt-0"
                >
                    <Plus size={16} /> New Spoke
                </button>
            </div>

            {/* Filters Container (unchanged) */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-end gap-6">
                    
                    {/* Search */}
                    <div className="flex items-center gap-3 flex-1">
                        <Search size={18} className="text-gray-400" />
                        <input
                            placeholder="Search Account, Spoke, Content..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none transition"
                        />
                    </div>

                    {/* Account Name Filter */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Account</label>
                        <select
                            value={accountFilter}
                            onChange={(e) => {
                                setAccountFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-white transition w-full"
                        >
                            {availableAccounts.map((a) => (
                                <option key={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                </div>
            </div>

            {/* CARDS (unchanged rendering logic) */}
            <div className="grid grid-cols-1 gap-4">
                {pageItems.map((s) => (
                    <div
                        key={s._id}
                        className={`bg-white p-5 rounded-xl border border-gray-100 transition duration-300
                          `}
                    >
                        {/* Adjusted grid columns */}
                        <div className="grid grid-cols-[2fr_1.5fr_1fr_auto] items-center gap-8 w-full">

                            {/* COLUMN 1 — Spoke Name (Title) + Account Name (Subtitle) */}
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-md shrink-0 
                                   bg-teal-50 text-teal-600">
                                    {s.accountName ? s.accountName.charAt(0) : "?"}
                                </div>

                                <div className="flex flex-col min-w-0">
                                    {/* Spoke Name (TITLE) */}
                                    <span className="text-base font-semibold text-gray-800 truncate">
                                        {s.spoke || "No Spoke Defined"}
                                    </span>

                                    {/* Account Name (SUBTITLE) */}
                                    <span className="text-xs text-gray-500 mt-1 truncate font-medium">
                                        {s.accountName || "No Account Name"}
                                    </span>
                                </div>
                            </div>

                            {/* COLUMN 2 — Status & User */}
                            <div className="flex flex-col">
                                
                                {/* LIVE Status (Boolean) */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                                        ${s.live ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                    >
                                        {s.live ? 'LIVE' : 'NOT USED'}
                                    </span>
                                </div>

                                {/* User (Seller) */}
                                <div className="text-xs text-gray-500 mt-1">
                                    created by: {s.User ? s.User.split('@')[0] : 'N/A'}
                                </div>
                            </div>


                            {/* COLUMN 3 — Who Cares Value Display */}
                            <div className="flex flex-col min-w-[150px] text-left">
                                <span className="text-xs text-gray-500 mb-1 font-medium">Who Cares?</span>
                                {(() => {
                                    const filteredCares = Array.isArray(s.whoCares) 
                                        ? s.whoCares.filter(item => item?.trim()) 
                                        : [];
                                    
                                    if (filteredCares.length > 0) {
                                        // Display first two items joined by comma, truncate if more
                                        const display = filteredCares.slice(0, 2).join(', ');
                                        const truncated = filteredCares.length > 2;

                                        return (
                                            <span className="text-sm text-gray-700 truncate" title={filteredCares.join(', ')}>
                                                {display}{truncated ? '...' : ''}
                                            </span>
                                        );
                                    } else {
                                        return (
                                            <span className="text-sm text-gray-400">N/A</span>
                                        );
                                    }
                                })()}
                            </div>

                            {/* COLUMN 4 — Actions */}
                            <div className="flex gap-1 justify-end shrink-0">

                                <button
                                    onClick={() => openEdit(s)}
                                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition"
                                    title="Edit"
                                >
                                    <Pencil size={16} />
                                </button>

                                <button
                                    onClick={() => handleDelete(s)}
                                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>

                            </div>

                        </div>
                    </div>
                ))}
            </div>


            {/* Pagination (unchanged) */}
            <div className="mt-8 flex justify-center items-center gap-4">
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="font-medium text-gray-600 hover:text-teal-600 disabled:opacity-30 p-2 transition"
                >
                    &larr; Previous
                </button>

                <span className="text-sm text-gray-600 px-3 py-1 border rounded-full">
                    {currentPage} of {totalPages}
                </span>

                <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="font-medium text-gray-600 hover:text-teal-600 disabled:opacity-30 p-2 transition"
                >
                    Next &rarr;
                </button>
            </div>
        </div>
    );
}