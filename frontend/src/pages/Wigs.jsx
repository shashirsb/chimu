// src/pages/Wigs.jsx
import React, { useEffect, useState, Suspense, lazy, useMemo } from "react";
import api from "../api/api";
import { Plus, Calendar, User, Pencil, Trash2, Eye, UserCheck, LayoutList, KanbanSquare } from "lucide-react"; 
import Select from "react-select";
import { useNavigate } from "react-router-dom";

// Lazy-loaded modals
const NewWigModal = lazy(() => import("./modals/NewWigModal"));
const EditWigModal = lazy(() => import("./modals/EditWigModal"));

// Status definitions and colors
const STATUS_ORDER = ["on_track", "at_risk", "off_track"];
const statusLabel = {
    on_track: "On Track",
    at_risk: "At Risk",
    off_track: "Off Track",
};
const statusColor = {
    on_track: "bg-green-50 text-green-600 border border-green-200",
    at_risk: "bg-yellow-50 text-yellow-600 border border-yellow-200",
    off_track: "bg-red-50 text-red-600 border border-red-200",
};
const statusColumnBg = {
    on_track: "bg-green-50",
    at_risk: "bg-yellow-50",
    off_track: "bg-red-50",
};

// Type badge colors
const typeColor = {
    wig: "bg-teal-50 text-teal-600",
    task: "bg-blue-50 text-blue-600",
    opportunity: "bg-purple-50 text-purple-600",
    champion: "bg-orange-50 text-orange-600",
};

// Shared Tailwind classes for Select styling
const filterInputStyle = "p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-white transition w-full text-sm";
const selectStyle = {
    control: (provided) => ({
        ...provided,
        borderRadius: '0',
        border: 'none',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: 'none',
        minHeight: '38px', 
        '&:hover': {
            borderBottom: '1px solid #20c997',
        }
    }),
    valueContainer: (provided) => ({ 
        ...provided,
        padding: '0 8px', 
    }),
    indicatorsContainer: (provided) => ({ 
        ...provided,
        height: '38px',
    }),
    clearIndicator: (provided) => ({
        ...provided,
        padding: '8px',
    }),
    dropdownIndicator: (provided) => ({
        ...provided,
        padding: '8px',
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: '#f3f4f6',
        borderRadius: '9999px',
    }),
};

/* -------------------------- WIG CARD COMPONENT (Re-usable) -------------------------- */
const WigCard = React.memo(function WigCard({
    wig, 
    handleEdit, 
    handleDelete, 
    navigate, 
    isExpanded, 
    setExpandedId,
    viewMode // 'list' or 'kanban'
}) {
    
    // --- Card Calculations ---
    const progress =
        ((wig.leadMeasures.reduce((s, m) => s + m.currentValue, 0) || 0) /
            (wig.leadMeasures.reduce((s, m) => s + m.targetValue, 0) || 1)) *
        100;

    const expiryDate = wig.validityPeriod?.expiryDate 
        ? new Date(wig.validityPeriod.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';
    
    const shortStatement =
        wig.statement?.length > 100 
            ? wig.statement.substring(0, 100) + "..."
            : wig.statement;

    const assignedToNames = [
        ...new Set(
            (wig.leadMeasures || []).flatMap((m) =>
                (m.assignedTo || []).map((a) => a.name)
            )
        ),
    ];

    const statusClasses = statusColor[wig.status] || "bg-gray-100 text-gray-600 border border-gray-200";
    const typeClasses = typeColor[wig.type] || "bg-gray-100 text-gray-600";
    
    // --- List View Content ---
    if (viewMode === 'list') {
        return (
            <div
                className="bg-white border border-gray-100 rounded-xl p-5 hover:border-teal-100 hover:shadow-md transition duration-300"
            >
                <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4">
                    
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${typeClasses}`}>
                        {wig.type?.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex flex-col min-w-0">
                        
                        <div className="flex items-center gap-3 mb-1">
                            <div className="text-base font-semibold text-gray-800 truncate">
                                {wig.title}
                            </div>
                            <span className={`px-3 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${statusClasses}`}>
                                {wig.status.replace("_", " ")}
                            </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-1">
                            {isExpanded ? wig.statement : shortStatement}
                            {wig.statement?.length > 100 && (
                                <button
                                    className="text-teal-600 ml-2 hover:underline font-medium"
                                    onClick={() =>
                                        setExpandedId(isExpanded ? null : wig._id)
                                    }
                                >
                                    {isExpanded ? "less" : "more"}
                                </button>
                            )}
                        </p>

                        <div className="flex items-center gap-3 w-full pt-1">
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${statusClasses.split(' ')[0]
                                        }`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-12 shrink-0">{progress.toFixed(0)}%</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500 mt-2">
                            
                            <div className="flex items-center gap-1">
                                <UserCheck size={12} />
                                <span className="font-medium text-gray-600">{wig.accountName}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <User size={12} />
                                <span>{wig.createdByName}</span>
                            </div>

                            <div className="flex items-center gap-1 capitalize">
                                <Calendar size={12} />
                                <span>
                                    {wig.validityPeriod?.type || 'Period N/A'}
                                    {wig.validityPeriod?.expiryDate && (
                                        <span className="ml-1 font-medium text-gray-700">({expiryDate})</span>
                                    )}
                                </span>
                            </div>
                        </div>

                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
                        
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => navigate(`/wigs/${wig._id}/progress`)}
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition"
                                title="View Progress"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                onClick={() => handleEdit(wig)}
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition"
                                title="Edit"
                            >
                                <Pencil size={18} />
                            </button>

                            <button
                                onClick={() => handleDelete(wig._id)}
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-1 justify-end mt-2">
                            {assignedToNames.length > 0 ? (
                                assignedToNames.map((name) => (
                                    <span
                                        key={name}
                                        className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-700 text-xs font-medium whitespace-nowrap"
                                    >
                                        {name}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400 text-xs">No assignees</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Kanban View Content ---
    return (
        <div
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-300 mb-4 cursor-grab"
        >
            <div className="flex flex-col min-w-0">
                
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${typeClasses}`}>
                            {wig.type?.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm font-semibold text-gray-800 truncate" title={wig.title}>
                            {wig.title}
                        </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize whitespace-nowrap shrink-0 ${statusClasses}`}>
                        {wig.status.replace("_", " ")}
                    </span>
                </div>

                <p className="text-xs text-gray-600 mb-2">
                    {isExpanded ? wig.statement : shortStatement}
                    {wig.statement?.length > 100 && (
                        <button
                            className="text-teal-600 ml-1 hover:underline font-medium"
                            onClick={() =>
                                setExpandedId(isExpanded ? null : wig._id)
                            }
                        >
                            {isExpanded ? "less" : "more"}
                        </button>
                    )}
                </p>

                <div className="flex items-center gap-3 w-full pt-1">
                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${statusClasses.split(' ')[0]}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-8 shrink-0 text-right">{progress.toFixed(0)}%</span>
                </div>

                {/* Footer details and actions */}
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100">

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1" title="Account">
                            <UserCheck size={12} />
                            <span className="font-medium text-gray-600">{wig.accountName}</span>
                        </div>
                        <div className="flex items-center gap-1 capitalize" title="Expiry Date">
                            <Calendar size={12} />
                            <span>{expiryDate}</span>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex flex-wrap gap-1">
                            {assignedToNames.length > 0 ? (
                                assignedToNames.map((name) => (
                                    <span
                                        key={name}
                                        className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-700 text-xs font-medium whitespace-nowrap"
                                    >
                                        {name}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400 text-xs">No assignees</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/wigs/${wig._id}/progress`); }}
                                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition"
                                title="View Progress"
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(wig); }}
                                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition"
                                title="Edit"
                            >
                                <Pencil size={16} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(wig._id); }}
                                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});


/* -------------------------- MAIN COMPONENT -------------------------- */

export default function WigsPage({ user: propUser }) {
    const [wigs, setWigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [accountUsers, setAccountUsers] = useState([]);
    
    // ⭐ STATE FOR SPOKES
    const [accountSpokes, setAccountSpokes] = useState([]); 
    
    // ⭐ NEW STATE FOR VIEW MODE
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'

    const [showNewModal, setShowNewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedWig, setSelectedWig] = useState(null);

    const storedUser = propUser || JSON.parse(localStorage.getItem("user") || "null");
    const [user] = useState(storedUser);
    const [expandedId, setExpandedId] = useState(null);

    const emptyWig = {
        title: "",
        statement: "",
        accountId: "",
        status: "on_track",
        type: "wig", 
        leadMeasures: [
            {
                name: "",
                type: "lead",
                targetValue: 10,
                currentValue: 0,
                assignedTo: [],
                stakeholdersContact: [],
                comments: [],
                spokeId: "", // Initialize spokeId
                spokeName: "", // Initialize spokeName
            }
        ],
        validityPeriod: {
            type: "quarterly",
            startDate: new Date().toISOString().split("T")[0],
            expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
                .toISOString()
                .split("T")[0]
        }
    };

    const [newWig, setNewWig] = useState(emptyWig);

    const [filters, setFilters] = useState({
        createdByName: [],
        status: "",
        accountName: [],
        validityType: "",
        progress: "",
        assignedToName: [],
        type: "" 
    });

    const navigate = useNavigate();

    // Fetch Accounts
    useEffect(() => {
        api.get("/accounts").then((res) => setAccounts(res.data || []));
    }, []);

    const fetchWigs = async () => {
        setLoading(true);
        const res = await api.get("/wigs");
        setWigs(res.data || []);
        setLoading(false);
    };

    // Fetch Wigs on component mount
    useEffect(() => {
        fetchWigs();
    }, []);


    // 🌟 FETCH ACCOUNT USERS 🌟
    useEffect(() => {
        if (newWig.accountId) {
            api.get(`/users/${newWig.accountId}`)
                .then((res) => setAccountUsers(res.data || []))
                .catch(() => setAccountUsers([]));

        } else {
            setAccountUsers([]);
        }
    }, [newWig.accountId]);


    // 🌟 FETCH ACCOUNT SPOKES 🌟
    useEffect(() => {
        const fetchSpokes = async () => {
            if (newWig.accountId) {
                try {
                    const res = await api.get(`/spoke?accountId=${newWig.accountId}`); 
                    setAccountSpokes(res.data || []);
                } catch (err) {
                    console.error("Error fetching spokes for account:", err);
                    setAccountSpokes([]); 
                }
            } else {
                setAccountSpokes([]); 
            }
        };
        fetchSpokes();
    }, [newWig.accountId]);


    const prepareMeasuresForSave = (measures = []) =>
        measures.map((m) => ({
            ...m,
            spokeId: m.spokeId || "", 
            spokeName: m.spokeName || "", 
            
            assignedTo: (m.assignedTo || []).map((s) => ({
                _id: s._id || "",
                name: s.name || "",
            })),
            stakeholdersContact: (m.stakeholdersContact || []).map((s) => ({
                name: s.name || "",
                email: s.email || "",
                contacted: s.contacted || false,
            })),
            comments: (m.comments || []).map((c) => ({
                text: c.text,
                createdAt: c.createdAt || new Date(),
                createdById: c.createdById || user.id,
                createdByName: c.createdByName || user.displayName,
            })),
        }));

    const handleSaveNew = async () => {
        try {
            if (!newWig.title || !newWig.accountId)
                return alert("Title and Account required");

            const payload = {
                ...newWig,
                type: newWig.type?.toLowerCase() || "wig", 
                createdById: user.id,
                createdByName: user.displayName,
                modifiedById: user.id,
                modifiedByName: user.displayName,
                
                lagMeasures: prepareMeasuresForSave(newWig.lagMeasures), 
                leadMeasures: prepareMeasuresForSave(newWig.leadMeasures),
                accountName: accounts.find((a) => a._id === newWig.accountId)?.name || "",
            };

            await api.post("/wigs", payload);
            setShowNewModal(false);
            setNewWig(emptyWig);
            fetchWigs();
        } catch (err) {
            console.error(err);
            alert("Error saving WIG");
        }
    };

    const handleSaveEdit = async () => {
        try {
            const {
                _id,
                accountId,
                accountName,
                createdById,
                createdByName,
                createdAt,
                updatedAt,
                progress,
                __v,
                aiSummary,
                ...allowedFields
            } = newWig;

            const preparedLeadMeasures = prepareMeasuresForSave(newWig.leadMeasures);
            const preparedLagMeasures = prepareMeasuresForSave(newWig.lagMeasures);
            
            const payload = {
                ...allowedFields,
                leadMeasures: preparedLeadMeasures,
                lagMeasures: preparedLagMeasures,   
                
                type: newWig.type?.toLowerCase(),
                modifiedById: user.id,
                modifiedByName: user.displayName,
                updatedAt: new Date(),
            };

            await api.put(`/wigs/${selectedWig._id}`, payload);

            setShowEditModal(false);
            setSelectedWig(null);
            fetchWigs();

        } catch (err) {
            console.error(err);
            alert("Error updating WIG");
        }
    };


    const handleEdit = (wig) => {

        setSelectedWig(wig);
        // Ensure account users are fetched for the current account when editing
        if (wig.accountId) {
             api.get(`/users/${wig.accountId._id}`)
                .then((res) => setAccountUsers(res.data || []));
        }
        setNewWig(wig);
        setShowEditModal(true);
    };

    const handleDelete = async (wigId) => {
        if (!window.confirm("Are you sure?")) return;
        await api.delete(`/wigs/${wigId}`);
        fetchWigs();
    };

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const getAssignedToOptions = () => {
        const names = wigs.flatMap((w) =>
            w.leadMeasures.flatMap((m) => (m.assignedTo || []).map((a) => a.name))
        );
        return [...new Set(names)].map((name) => ({ value: name, label: name }));
    };

    const getOptions = (key) =>
        [...new Set(wigs.map((w) => w[key]))]
            .filter(Boolean)
            .map((v) => ({ value: v, label: v }));

    const filteredWigs = wigs.filter((wig) => {
        const wigType = (wig.type || "wig").toLowerCase();
        const filterType = (filters.type || "").toLowerCase();

        const matchesType = filterType === "" ? true : wigType === filterType;

        const matchesCreatedBy =
            filters.createdByName.length
                ? filters.createdByName.some((f) => f.value === wig.createdByName)
                : true;

        // Note: Status filter is handled by the primary grouping if in Kanban mode, but still needed for List mode/combined filters
        const matchesStatus = filters.status ? wig.status === filters.status : true; 

        const matchesAccount =
            filters.accountName.length
                ? filters.accountName.some((f) => f.value === wig.accountName)
                : true;

        const matchesValidity = filters.validityType
            ? wig.validityPeriod?.type === filters.validityType
            : true;

        const matchesAssignedTo = filters.assignedToName.length
            ? filters.assignedToName.some((f) =>
                wig.leadMeasures.some((m) =>
                    (m.assignedTo || []).some((a) => a.name === f.value)
                )
            )
            : true;

        return (
            matchesType &&
            matchesCreatedBy &&
            (filters.status ? matchesStatus : true) &&
            matchesAccount &&
            matchesValidity &&
            matchesAssignedTo
        );
    });
    
    // 🎨 KANBAN GROUPING LOGIC (only used if viewMode is 'kanban') 🎨
    const kanbanWigs = useMemo(() => {
        return STATUS_ORDER.reduce((acc, status) => {
            acc[status] = filteredWigs.filter(wig => wig.status === status)
            return acc;
        }, {});
    }, [filteredWigs]);


    // ----------------------------------------------------------------------------------
    // ------------------------------------ RENDER --------------------------------------
    // ----------------------------------------------------------------------------------

    return (
        <div className="p-8 min-h-screen bg-gray-50">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                
                <h2 className="text-3xl font-light text-gray-800 tracking-wide">
                    Work Tracker ({viewMode === 'kanban' ? 'Kanban' : 'List'} View)
                </h2>

                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    
                    {/* VIEW TOGGLE */}
                    <div className="inline-flex rounded-lg border border-gray-300 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-sm font-medium flex items-center gap-1 transition ${
                                viewMode === 'list' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <LayoutList size={16} /> List
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-1 text-sm font-medium flex items-center gap-1 transition ${
                                viewMode === 'kanban' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <KanbanSquare size={16} /> Kanban
                        </button>
                    </div>

                    {/* NEW WORK ITEM BUTTON */}
                    <button
                        onClick={() => {
                            setNewWig(emptyWig);
                            setShowNewModal(true);
                        }}
                        className="border border-teal-500 text-teal-600 px-5 py-2 rounded-lg hover:bg-teal-50 transition flex items-center gap-2 font-medium"
                    >
                        <Plus size={16} /> New Work Item
                    </button>
                </div>
            </div>

            {/* Filters Container */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">

                    {/* TYPE FILTER */}
                    <div className="flex flex-col justify-end">
                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange("type", e.target.value)}
                            className={filterInputStyle}
                        >
                            <option value="">All Types</option>
                            <option value="wig">WIG</option>
                            <option value="task">Task</option>
                            <option value="champion">Champion</option>
                        </select>
                    </div>


                    {/* ASSIGNED TO */}
                    <div className="flex flex-col justify-end">
                         <Select
                            isMulti
                            options={getAssignedToOptions()}
                            placeholder="All Assigned To"
                            onChange={(vals) => handleFilterChange("assignedToName", vals || [])}
                            styles={selectStyle}
                        />
                    </div>

                    {/* CREATORS */}
                    <div className="flex flex-col justify-end">
                        <Select
                            isMulti
                            options={getOptions("createdByName")}
                            placeholder="All Creators"
                            onChange={(vals) => handleFilterChange("createdByName", vals || [])}
                            styles={selectStyle}
                        />
                    </div>

                    {/* STATUS FILTER - Shown only in LIST mode */}
                    <div className="flex flex-col justify-end">
                        <select
                            value={viewMode === 'kanban' ? "" : filters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className={filterInputStyle}
                            disabled={viewMode === 'kanban'} // Disable if in Kanban view
                        >
                            <option value="">All Status</option>
                            {Object.keys(statusColor).map((s) => (
                                <option key={s} value={s}>
                                    {s.replace("_", " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ACCOUNTS */}
                    <div className="flex flex-col justify-end">
                        <Select
                            isMulti
                            options={getOptions("accountName")}
                            placeholder="All Accounts"
                            onChange={(vals) => handleFilterChange("accountName", vals || [])}
                            styles={selectStyle}
                        />
                    </div>

                    {/* VALIDITY TYPE */}
                    <div className="flex flex-col justify-end">
                        <select
                            value={filters.validityType}
                            onChange={(e) => handleFilterChange("validityType", e.target.value)}
                            className={filterInputStyle}
                        >
                            <option value="">All Validity Types</option>
                            {[...new Set(wigs.map((w) => w.validityPeriod?.type))]
                                .filter(Boolean)
                                .map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Area: List or Kanban */}
            {loading ? (
                <p className="text-gray-600">Loading work items...</p>
            ) : (
                <>
                    {/* LIST VIEW */}
                    {viewMode === 'list' && (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredWigs.map((wig) => (
                                <WigCard
                                    key={wig._id}
                                    wig={wig}
                                    handleEdit={handleEdit}
                                    handleDelete={handleDelete}
                                    navigate={navigate}
                                    isExpanded={expandedId === wig._id}
                                    setExpandedId={setExpandedId}
                                    viewMode={viewMode}
                                />
                            ))}
                            {filteredWigs.length === 0 && (
                                <div className="text-center text-gray-500 text-lg py-12 border border-gray-200 rounded-xl bg-white">
                                    No items match the current filters.
                                </div>
                            )}
                        </div>
                    )}

                    {/* KANBAN BOARD */}
                    {viewMode === 'kanban' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                            {STATUS_ORDER.map((statusKey) => (
                                <div 
                                    key={statusKey} 
                                    className={`flex flex-col rounded-xl p-4 min-h-[500px] ${statusColumnBg[statusKey] || 'bg-gray-100'}`}
                                >
                                    {/* Column Header */}
                                    <h3 className={`text-lg font-semibold capitalize border-b pb-2 mb-3 sticky top-0 ${statusColumnBg[statusKey].replace("50", "100")}`} style={{zIndex: 1}}>
                                        {statusLabel[statusKey]} ({kanbanWigs[statusKey]?.length || 0})
                                    </h3>
                                    
                                    {/* Column Content */}
                                    <div className="flex-1 overflow-y-auto pr-1">
                                        {kanbanWigs[statusKey]?.map((wig) => (
                                            <WigCard
                                                key={wig._id}
                                                wig={wig}
                                                handleEdit={handleEdit}
                                                handleDelete={handleDelete}
                                                navigate={navigate}
                                                isExpanded={expandedId === wig._id}
                                                setExpandedId={setExpandedId}
                                                viewMode={viewMode}
                                            />
                                        ))}
                                        
                                        {kanbanWigs[statusKey]?.length === 0 && (
                                            <div className="text-center text-gray-500 text-sm py-8 border border-dashed border-gray-300 rounded-lg">
                                                No items currently {statusLabel[statusKey].toLowerCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            <Suspense fallback={<div>Loading...</div>}>
                {showNewModal && (
                    <NewWigModal
                        newWig={newWig}
                        setNewWig={setNewWig}
                        accounts={accounts}
                        accountUsers={accountUsers}
                        // Passed the list of spokes fetched based on the selected account
                        accountSpokes={accountSpokes} 
                        onSave={handleSaveNew}
                        onCancel={() => setShowNewModal(false)}
                    />
                )}
                {showEditModal && selectedWig && (
                    <EditWigModal
                        newWig={newWig}
                        setNewWig={setNewWig}
                        accountName={selectedWig.accountName}
                        accountUsers={accountUsers}
                        // Passed the list of spokes fetched based on the selected account
                        accountSpokes={accountSpokes} 
                        setAccountUsers={setAccountUsers}
                        onSave={handleSaveEdit}
                        onCancel={() => setShowEditModal(false)}
                    />
                )}
            </Suspense>
        </div>
    );
}