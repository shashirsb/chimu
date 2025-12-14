// src/pages/Users.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { Pencil, Search, Plus, X } from "lucide-react"; // Added 'X' icon

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

export default function Users() {
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [filters, setFilters] = useState({
    role: "",
    region: "",
    account: "",
    businessUnit: ""
  });
  const [search, setSearch] = useState("");
  
  // --- 2. NEW: State for error handling ---
  const [error, setError] = useState(null); 

  const navigate = useNavigate();

  // Load all users initially
  useEffect(() => {
    api
      .get("/users")
      .then((res) => setUsers(res.data))
      // --- 3. ENHANCED: Error handling for initial load ---
      .catch((err) => {
        console.error("Failed to load users:", err);
        let userMessage = "We could not load the user list. is DB running?";

        // Attempt to get a more specific reason from the API response
        if (err.response && err.response.status === 403) {
            userMessage = "You do not have permission to view users (Error 403 Forbidden).";
        } else if (err.response) {
             userMessage = `User list failed to load: ${err.response.statusText} (${err.response.status}). Please try again.`;
        }
        
        setError(userMessage);
      });
  }, []);

  // Unique values for filters (Memoized for performance)
  const uniqueRoles = useMemo(() => [...new Set(users.flatMap((u) => u.roles || []))], [users]);
  const uniqueRegions = useMemo(() => [...new Set(users.map((u) => u.region).filter(Boolean))], [users]);
  const uniqueAccounts = useMemo(() => [
    ...new Set((users || []).flatMap((u) => (u.accountIds || []).map((a) => a.name).filter(Boolean))),
  ], [users]);

  // When ACCOUNT changes → load BUs from API
  const handleAccountChange = async (e) => {
    const selectedAccount = e.target.value;

    setFilters({
      ...filters,
      account: selectedAccount,
      businessUnit: "" // reset BU when account changes
    });

    if (!selectedAccount) {
      setBusinessUnits([]); // clear BU list
      return;
    }

    try {
      const res = await api.get(`/accounts/name/${encodeURIComponent(selectedAccount)}`);
      setBusinessUnits(res.data.businessUnit || []); // save BU array
    } catch (err) {
      // --- 4. ENHANCED: Error handling for BU load ---
      console.error("Failed to load business units:", err);
      setBusinessUnits([]); // Clear BUs to prevent stale data
      
      let userMessage = `Failed to load Business Units for account "${selectedAccount}".`;

      if (err.response) {
          if (err.response.status === 404) {
              userMessage = `Account "${selectedAccount}" was not found or does not exist.`;
          } else {
              userMessage = `Failed to load Business Units: ${err.response.statusText} (${err.response.status}).`;
          }
      }
      
      setError(userMessage);
    }
  };

  // Final filtered user list (unchanged)
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();

    return users.filter((u) => {
      const searchMatch =
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.roles || []).some((r) => r.toLowerCase().includes(q));

      const roleMatch = filters.role ? u.roles?.includes(filters.role) : true;
      const regionMatch = filters.region ? u.region === filters.region : true;
      const accountMatch = filters.account
        ? (u.accountIds || []).some((a) => a.name === filters.account)
        : true;

      const businessUnitMatch = filters.businessUnit
        ? (u.businessUnit || []).includes(filters.businessUnit)
        : true;

      return searchMatch && roleMatch && regionMatch && accountMatch && businessUnitMatch;
    });
  }, [users, search, filters]);

  // Shared classes for minimalist design (unchanged)
  const filterInputStyle = "p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-white transition w-full";
  const labelStyle = "block text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";


  return (
    <div className="p-8 min-h-screen bg-gray-50">
      
      {/* --- 5. RENDER THE POPUP --- */}
      <ErrorPopup 
        message={error} 
        onClose={() => setError(null)} 
      />

      {/* Header (unchanged) */}
      <div className="flex flex-col md:flex-row justify-between mb-8">
        <h2 className="text-3xl font-light text-gray-800 tracking-wide">User Directory</h2>
        <button
          onClick={() => navigate("/users/new")}
          className="border border-teal-500 text-teal-600 px-5 py-2 rounded-lg hover:bg-teal-50 transition flex items-center gap-2 font-medium mt-4 md:mt-0"
        >
          <Plus size={16} /> New User
        </button>
      </div>

      {/* Filters Container (unchanged) */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
        
        {/* Search (unchanged) */}
        <div className="flex items-center gap-3 w-full border-b border-gray-200 focus-within:border-teal-500 transition mb-6 pb-1">
          <Search size={18} className="text-gray-400" />
          <input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none p-1 bg-transparent text-sm"
          />
        </div>

        {/* Filters Grid (unchanged) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Role Filter (unchanged) */}
          <div>
            <label className={labelStyle}>Role</label>
            <select
              className={filterInputStyle}
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">All Roles</option>
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter (unchanged) */}
          <div>
            <label className={labelStyle}>Region</label>
            <select
              className={filterInputStyle}
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            >
              <option value="">All Regions</option>
              {uniqueRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter (uses enhanced handler) */}
          <div>
            <label className={labelStyle}>Account</label>
            <select
              className={filterInputStyle}
              value={filters.account}
              onChange={handleAccountChange} 
            >
              <option value="">All Accounts</option>
              {uniqueAccounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Business Unit Filter (unchanged) */}
          <div>
            <label className={labelStyle}>Business Unit</label>
            <select
              className={filterInputStyle}
              value={filters.businessUnit}
              onChange={(e) => setFilters({ ...filters, businessUnit: e.target.value })}
              disabled={!filters.account || businessUnits.length === 0}
            >
              <option value="">All BUs</option>
              {businessUnits.map((bu) => (
                <option key={bu} value={bu}>
                  {bu}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* User Cards (unchanged) */}
      <div className="space-y-4">
        {/* ... (user map rendering is the same) ... */}
        {filteredUsers.map((u) => (
          <div
            key={u._id}
            className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 hover:border-teal-100 hover:shadow-md transition duration-300"
          >
             {/* LEFT - User Info Block */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-semibold text-sm shrink-0">
                {(u.displayName || u.username || "?").charAt(0)}
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-800 truncate">
                  {u.displayName || u.username}
                </h3>

                <div className="text-sm text-gray-500 truncate">{u.email}</div>

                {/* Badges/Tags */}
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {/* Region & Active Status (Subtle) */}
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                    {u.region || "Unknown Region"}
                  </span>
                  
                  <span className={`px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>

                  {/* Role */}
                  <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                    {u.roles?.join(", ") || "No Role"}
                  </span>

                  {/* Business Units */}
                  {(u.businessUnit || []).map((bu) => (
                    <span
                      key={bu}
                      className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                    >
                      {bu}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT - Account Name and Edit Button */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {u.accountIds?.length > 0
                    ? u.accountIds.map((a) => a.name).join(", ")
                    : "No Accounts Assigned"}
                </p>
              </div>

              {/* Edit Button (Icon-only for minimalism) */}
              <button
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition"
                title="Edit User"
                onClick={() => navigate(`/users/${u._id}/edit`)}
              >
                <Pencil size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}