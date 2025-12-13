// src/pages/Accounts.jsx - MINIMALIST UI REWRITE (COMPACT CARDS)
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { Pencil, Plus, Trash2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [businessUnitFilter, setBusinessUnitFilter] = useState("All"); // NEW
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const navigate = useNavigate();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [accRes, usersRes] = await Promise.all([
        api.get("/accounts"),
        api.get("/users")
      ]);
      setAccounts(accRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const availableRegions = useMemo(() => {
    const s = new Set();
    accounts.forEach((a) => (a.region || []).forEach((r) => s.add(r)));
    return ["All", ...Array.from(s).sort()];
  }, [accounts]);

  // NEW: Business Unit options
  const availableBusinessUnits = useMemo(() => {
    const s = new Set();
    accounts.forEach((a) =>
      (a.businessUnit || []).forEach((b) => s.add(b))
    );
    return ["All", ...Array.from(s).sort()];
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (
        q &&
        !a.name.toLowerCase().includes(q) &&
        !(a.description || "").toLowerCase().includes(q)
      )
        return false;

      if (
        regionFilter !== "All" &&
        !a.region?.map((r) => r.toLowerCase()).includes(regionFilter.toLowerCase())
      )
        return false;

      // NEW: Business Unit filter
      if (
        businessUnitFilter !== "All" &&
        !a.businessUnit
          ?.map((b) => b.toLowerCase())
          .includes(businessUnitFilter.toLowerCase())
      )
        return false;

      if (activeFilter !== "All") {
        if (activeFilter === "Active" && !a.active) return false;
        if (activeFilter === "Inactive" && a.active) return false;
      }

      return true;
    });
  }, [accounts, search, regionFilter, businessUnitFilter, activeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / pageSize)
  );
  const pageItems = filteredAccounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const openNewPage = () => {
    navigate("/accounts/new");
  };

  const openEditPage = (acc) => {
    navigate(`/accounts/${acc._id}/edit`, {
      state: { account: acc } // PASS FULL ACCOUNT OBJECT
    });
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Delete account "${acc.name}"?`)) return;
    try {
      await api.delete(`/accounts/${acc._id}`);
      setAccounts((prev) => prev.filter((p) => p._id !== acc._id));
    } catch (err) {
      console.error(err);
    }
  };

  // Shared Tailwind classes for minimalist inputs/labels
  const inputStyle = "p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-white transition w-full md:w-auto";
  const labelStyle = "block text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";


  return (
    // Added off-white background and increased padding
    <div className="p-8 min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between mb-8">
          <h2 className="text-3xl font-light text-gray-800 tracking-wide">Account Management</h2>

        {/* Minimalist Primary Button: Outline/Accent Style */}
        <button
          onClick={openNewPage}
          className="border border-teal-500 text-teal-600 px-5 py-2 rounded-lg hover:bg-teal-50 transition flex items-center gap-2 font-medium mt-4 md:mt-0"
        >
          <Plus size={16} /> New Account
        </button>
      </div>

      {/* Filters Container - Clean and subtle shadow */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end gap-6">

          {/* Search */}
          <div className="flex items-center gap-3 flex-1">
            <Search size={18} className="text-gray-400" />
            <input
              placeholder="Search accounts by name or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              // Minimalist input: only bottom border on focus
              className="w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none transition"
            />
          </div>

          {/* Region */}
          <div>
            <label className={labelStyle}>Region</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className={inputStyle}
            >
              {availableRegions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* NEW: Business Unit */}
          <div>
            <label className={labelStyle}>Business Unit</label>
            <select
              value={businessUnitFilter}
              onChange={(e) => setBusinessUnitFilter(e.target.value)}
              className={inputStyle}
            >
              {availableBusinessUnits.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={labelStyle}>Status</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className={inputStyle}
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4">
        {pageItems.map((a) => (
          <div
            key={a._id}
            // REDUCED PADDING: p-5 -> p-4
            className="bg-white p-4 rounded-xl border border-gray-100 hover:border-teal-100 hover:shadow-md transition duration-300"
          >
            {/* REDUCED GAP: gap-8 -> gap-6 */}
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-6 w-full">

              {/* Avatar (REDUCED SIZE: w-10/h-10 -> w-9/h-9) */}
              <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-semibold text-sm shrink-0">
                {a.name ? a.name.charAt(0) : "?"}
              </div>

              {/* Name + Region/BU */}
              <div className="flex flex-col min-w-0">
                <span className="text-base font-semibold text-gray-800 truncate mb-1">
                  {a.name}
                </span>

                {/* Region Badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {a.region?.length > 0 ? (
                    a.region.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">No region</span>
                  )}
                </div>

                {/* NEW: Business Unit Badges (REDUCED MARGIN: mt-2 -> mt-1) */}
                <div className="flex flex-wrap gap-2 text-xs mt-1">
                  {a.businessUnit?.length > 0 ? (
                    a.businessUnit.map((b) => (
                      <span
                        key={b}
                        className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium"
                      >
                        {b}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">No business units</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="text-sm text-gray-600 truncate flex-1 min-w-[200px] hidden md:block">
                {a.description || "No description provided."}
              </div>

              {/* Active Status Badge */}
              <div className="text-xs font-medium whitespace-nowrap">
                {a.active ? (
                  <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              {/* Buttons (Icon-only for minimalism) */}
              <div className="flex gap-1 justify-end shrink-0">
                <button
                  onClick={() => openEditPage(a)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(a)}
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

      {/* Pagination - Clean, text-only buttons */}
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