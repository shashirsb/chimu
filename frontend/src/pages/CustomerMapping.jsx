import React, { useEffect, useState } from "react";
import api from "../api/api";
import OrgChart from "../components/OrgChart_old";
import { Search } from "lucide-react";

export default function CustomerMapping() {
  const [accountId, setAccountId] = useState(""); 
  const [customers, setCustomers] = useState([]);
  const [focusEmail, setFocusEmail] = useState("");
  const [search, setSearch] = useState("");

  // Fetch all accounts for dropdown
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    api.get("/accounts")
      .then((res) => setAccounts(res.data))
      .catch((err) => console.error("Error loading accounts:", err));
  }, []);

  // Load all customers in an account
  useEffect(() => {
    if (!accountId) return;

    api
      .get(`/customer/account/${accountId}`)
      .then((res) => {
        setCustomers(res.data || []);
        if (res.data.length > 0) {
          // Auto pick a root person (top-most)
          setFocusEmail(res.data[0].email);
        }
      })
      .catch((err) => console.error("Error loading org chart:", err));
  }, [accountId]);

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-teal-600 mb-4">
        Customer Mapping (Org Chart)
      </h2>

      {/* Account Selector */}
      <div className="mb-6 flex gap-4">
        <select
          className="border rounded-xl px-3 py-2 bg-white"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
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
          />
        </div>

        {/* Focus selector */}
        {filtered.length > 0 && (
          <select
            className="border rounded-xl px-3 py-2 bg-white"
            value={focusEmail}
            onChange={(e) => setFocusEmail(e.target.value)}
          >
            {filtered.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Org Chart */}
      <div className="mt-4">
        <OrgChart
          customers={customers}
          focusEmail={focusEmail}
          upDepth={3}
          downDepth={5}
          onSelect={(c) => setFocusEmail(c.email)}
        />
      </div>
    </div>
  );
}
