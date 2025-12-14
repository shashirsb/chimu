// src/pages/EditUser.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import MultiSelect from "./components/MultiSelect";
import { Save, X } from "lucide-react";

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
// ------------------------------------

// Shared Tailwind classes for minimalist design (unchanged)
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";

export default function EditUser() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // NEW: Saving state
    // --- 2. NEW: State for error handling ---
    const [error, setError] = useState(null); 

    const [form, setForm] = useState({
        username: "",
        displayName: "",
        email: "",
        region: "",
        businessUnit: [],
        roles: [],
        accountIds: [],
        active: true
    });

    const roleOptions = [
        "Admin", "Lead", "SA", "AE", "Account Director",
        "CSM", "ADR", "RD", "RVP", "TAM", "Marketing"
    ].map(r => ({ label: r, value: r }));

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        try {
            const [userRes, accRes] = await Promise.all([
                api.get(`/users/i/${id}`),
                api.get(`/accounts`)
            ]);

            const user = userRes.data;

            const accountList = accRes.data.map(a => ({
                label: a.name,
                value: a._id,
                name: a.name,
                _id: a._id,
                businessUnit: a.businessUnit || []
            }));

            setAccounts(accountList);

            setForm({
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                region: user.region || "",
                businessUnit: user.businessUnit || [],
                active: user.active,

                roles: (user.roles || []).map(r => ({ label: r, value: r })),

                accountIds: (user.accountIds || []).map(a => ({
                    label: a.name,
                    value: a._id,
                    name: a.name,
                    _id: a._id
                }))
            });

            setLoading(false);
        } catch (err) {
            // --- 3. ENHANCED: Error handling for initial load ---
            console.error("Error loading user data:", err);
            setLoading(false); // Stop loading regardless of success

            let userMessage = "Failed to load user and account details. Please try refreshing the page.";

            if (err.response) {
                if (err.response.status === 404) {
                    userMessage = `User ID ${id} was not found. It may have been deleted.`;
                } else if (err.response.status === 403) {
                    userMessage = "You do not have permission to view this user's details.";
                } else {
                    userMessage = `Data loading failed: ${err.response.statusText} (${err.response.status}).`;
                }
            }
            setError(userMessage); // Set error state to show popup
        }
    };

    /* DYNAMIC BUSINESS UNIT LIST (unchanged) */
    const availableBusinessUnits = useMemo(() => {
        const selectedIds = form.accountIds.map(a => a._id);

        const selectedAccounts = accounts.filter(acc =>
            selectedIds.includes(acc._id)
        );

        const buSet = new Set();

        selectedAccounts.forEach(acc => {
            (acc.businessUnit || []).forEach(bu => buSet.add(bu));
        });

        return [...buSet].map(bu => ({
            label: bu,
            value: bu
        }));
    }, [form.accountIds, accounts]);
    /* -------------------------------------- */

    const updateUser = async () => {
        setIsSaving(true);
        setError(null); // Clear previous errors
        try {
            await api.put(`/users/i/${id}`, {
                username: form.username,
                displayName: form.displayName,
                email: form.email,
                region: form.region,
                businessUnit: form.businessUnit,
                roles: form.roles.map(r => r.value),
                accountIds: form.accountIds.map(a => ({
                    _id: a._id,
                    name: a.name
                })),
                active: form.active
            });

            // If successful, navigate away
            navigate("/users");
        } catch (err) {
            // --- 4. ENHANCED: Error handling for update operation ---
            console.error("Error updating user:", err);
            
            let userMessage = "Failed to save user changes. Please check all fields.";

            if (err.response) {
                if (err.response.status === 400 && err.response.data?.message) {
                    // Check for validation errors from the backend
                    userMessage = `Validation Error: ${err.response.data.message}`;
                } else if (err.response.status === 403) {
                    userMessage = "You do not have sufficient privileges to modify this user.";
                } else {
                    userMessage = `Update failed: ${err.response.statusText} (${err.response.status}).`;
                }
            }
            setError(userMessage); // Set error state to show popup
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-8 min-h-screen bg-gray-50 text-gray-600">Loading user data...</div>;

    return (
        <div className="p-8 min-h-screen bg-gray-50">
            {/* --- 5. RENDER THE POPUP --- */}
            <ErrorPopup 
                message={error} 
                onClose={() => setError(null)} 
            />

            <div className="max-w-3xl mx-auto">
                
                {/* Header and Back Button (unchanged) */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate("/users")}
                        className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition p-2"
                    >
                        ← Back to Users
                    </button>

                    <h2 className="text-3xl font-light text-gray-800 tracking-wide">Edit User</h2>
                </div>
                
                {/* Form Card (inputs unchanged) */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    {/* ... (All form inputs, selects, and MultiSelects go here) ... */}
                    
                    {/* Username */}
                    <div>
                        <label className={labelStyle}>Username</label>
                        <input
                            className={inputStyle}
                            placeholder="Username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            disabled={isSaving}
                        />
                    </div>
                    {/* Display Name */}
                    <div>
                        <label className={labelStyle}>Display Name</label>
                        <input
                            className={inputStyle}
                            placeholder="Display Name"
                            value={form.displayName}
                            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                            disabled={isSaving}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelStyle}>Email</label>
                        <input
                            className={inputStyle}
                            placeholder="Email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            disabled={isSaving}
                        />
                    </div>

                    {/* Region */}
                    <div>
                        <label className={labelStyle}>Region</label>
                        <select
                            className={inputStyle}
                            value={form.region}
                            onChange={(e) => setForm({ ...form, region: e.target.value })}
                            disabled={isSaving}
                        >
                            <option value="">Select Region</option>
                            <option value="Global">Global</option>
                            <option value="APAC">APAC</option>
                            <option value="EMEA">EMEA</option>
                        </select>
                    </div>

                    {/* Accounts (MultiSelect) */}
                    <div className="pt-2">
                        <MultiSelect
                            label="Mapped Accounts"
                            placeholder="Select accounts this user manages"
                            options={accounts}
                            value={form.accountIds}
                            onChange={(arr) => setForm({ ...form, accountIds: arr })}
                            displayKey="label"
                            valueKey="_id"
                            disabled={isSaving}
                        />
                        <div className="text-xs text-gray-400 mt-2">
                            Selecting accounts dynamically loads available Business Units.
                        </div>
                    </div>

                    {/* DYNAMIC BUSINESS UNIT SELECT (MultiSelect) */}
                    <div className="pt-2">
                        <MultiSelect
                            label="Business Units"
                            placeholder={
                                availableBusinessUnits.length === 0
                                    ? "Select accounts first"
                                    : "Select business units this user manages"
                            }
                            options={availableBusinessUnits}
                            value={(form.businessUnit || []).map(bu => ({
                                label: bu,
                                value: bu
                            }))}
                            onChange={(arr) =>
                                setForm({ ...form, businessUnit: arr.map(a => a.value) })
                            }
                            displayKey="label"
                            valueKey="value"
                            disabled={availableBusinessUnits.length === 0 || isSaving}
                        />
                    </div>

                    {/* Roles (MultiSelect) */}
                    <div className="pt-2">
                        <MultiSelect
                            label="Roles"
                            placeholder="Select roles"
                            options={roleOptions}
                            value={form.roles}
                            onChange={(arr) => setForm({ ...form, roles: arr })}
                            displayKey="label"
                            valueKey="value"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Active Checkbox */}
                    <div className="flex items-center gap-2 pt-4">
                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm({ ...form, active: e.target.checked })}
                            className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 cursor-pointer" 
                            disabled={isSaving}
                        />
                        <span className="text-gray-700 ml-1">User is **Active**</span>
                    </div>
                    {/* Save Button */}
                    <div className="pt-6 border-t border-gray-100 mt-8">
                        <button
                            onClick={updateUser}
                            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition w-full flex items-center justify-center gap-2 font-medium disabled:bg-teal-400 disabled:cursor-not-allowed"
                            disabled={isSaving}
                        >
                            <Save size={16} /> {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}