// src/pages/CustomerMapping.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, useState } from "react";
import api from "../api/api";
import OrgChart from "../components/OrgChart_old";
import { Search, X } from "lucide-react"; // Added X for the popup

// --- 1. NEW: Error Popup Component ---
const ErrorPopup = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-500">
                <div className="flex justify-between items-start p-5">
                    <div>
                        <h3 className="text-lg font-semibold text-red-700">Operation Failed</h3>
                        <p className="mt-1 text-sm text-gray-600">{message}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Close error message">
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
// ------------------------------------

export default function CustomerMapping() {
  const [accountId, setAccountId] = useState(""); 
  const [customers, setCustomers] = useState([]);
  const [focusEmail, setFocusEmail] = useState("");
  const [search, setSearch] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false); // NEW: Loading state for chart data
  const [error, setError] = useState(null); // NEW: Error state for popup

  // --- Load all accounts for dropdown ---
  useEffect(() => {
    setError(null);
    api.get("/accounts")
      // --- ENHANCED: Error handling for accounts load ---
      .then((res) => setAccounts(res.data))
      .catch((err) => {
        console.error("Error loading accounts:", err);
        setError("Failed to load the list of available accounts. Please check server connection.");
      });
  }, []);

  // --- Load all customers in an account ---
  useEffect(() => {
    if (!accountId) {
        setCustomers([]);
        return;
    }
    
    setError(null);
    setLoadingCustomers(true);
    
    api
      .get(`/customer/account/${accountId}`)
      // --- ENHANCED: Error handling for customer/org chart load ---
      .then((res) => {
        setCustomers(res.data || []);
        if (res.data && res.data.length > 0) {
          // Auto pick a root person (top-most)
          setFocusEmail(res.data[0].email);
        } else {
            // Display friendly message if data is empty
            setError(`No customer records found for the selected account.`);
            setFocusEmail("");
        }
      })
      .catch((err) => {
        console.error("Error loading org chart:", err);
        
        let userMessage = `Failed to load the organization chart for account ID ${accountId}.`;
        
        if (err.response) {
            if (err.response.status === 404) {
                userMessage = "The customer mapping data for this account was not found.";
            } else if (err.response.status === 403) {
                userMessage = "You do not have permission to view this customer mapping.";
            } else {
                userMessage = `Data loading failed: ${err.response.statusText} (${err.response.status}).`;
            }
        }
        setError(userMessage);
        setCustomers([]);
        setFocusEmail("");
      })
      .finally(() => {
          setLoadingCustomers(false);
      });
  }, [accountId]);

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  
  // Show message based on state
  const renderChartContent = () => {
    if (loadingCustomers) {
        return <div className="p-10 text-center text-gray-500">Loading customer hierarchy...</div>;
    }
    
    if (customers.length === 0 && accountId && !error) {
        // Only show if account is selected and no error occurred during fetch
        return <div className="p-10 text-center text-gray-500 border border-dashed rounded-xl">No customer mapping data found for this account.</div>;
    }

    if (error && customers.length === 0) {
        // If an error occurred (and was displayed via popup), show a hint
        return <div className="p-10 text-center text-gray-500 border border-dashed rounded-xl">Select an account above to view the organization chart.</div>;
    }

    // Default chart view
    return (
        <OrgChart
          customers={customers}
          focusEmail={focusEmail}
          upDepth={3}
          downDepth={5}
          onSelect={(c) => setFocusEmail(c.email)}
        />
    );
  };


  return (
    <div className="p-6">
        
        {/* RENDER THE POPUP */}
        <ErrorPopup 
            message={error} 
            onClose={() => setError(null)} 
        />

      <h2 className="text-3xl font-bold text-teal-600 mb-4">
        Customer Mapping (Org Chart)
      </h2>
      
      {/* Account Selector, Search, and Focus selector */}
      <div className="mb-6 flex gap-4">
        <select
          className="border rounded-xl px-3 py-2 bg-white"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={loadingCustomers}
        >
          <option value="">Select Account</option>
          {accounts.map((a) => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Search box */}
        <div className="flex items-center border rounded-xl px-3 bg-white w-80">
          <Search size={18} className="text-gray-400" />
          <input
            className="ml-2 w-full py-2 outline-none"
            placeholder="Search person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={customers.length === 0 || loadingCustomers}
          />
        </div>

        {/* Focus selector */}
        {filtered.length > 0 && (
          <select
            className="border rounded-xl px-3 py-2 bg-white"
            value={focusEmail}
            onChange={(e) => setFocusEmail(e.target.value)}
            disabled={loadingCustomers}
          >
            {filtered.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Org Chart Area */}
      <div className="mt-4 border rounded-xl p-4 min-h-[500px] flex items-center justify-center bg-white shadow-sm">
        {renderChartContent()}
      </div>
      
    </div>
  );
}