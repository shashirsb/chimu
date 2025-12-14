// src/pages/CreateUser.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import MultiSelect from "./components/MultiSelect";
import { Plus, X } from "lucide-react"; // Added X for the popup

// --- 1. NEW: Error Popup Component ---
const ErrorPopup = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-500">
                <div className="flex justify-between items-start p-5">
                    <div>
                        <h3 className="text-lg font-semibold text-red-700">Creation Failed</h3>
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

export default function CreateUser() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    
    // --- 2. NEW: State for error/saving ---
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        username: "",
        displayName: "",
        email: "",
        password: "",
        roles: [],
        region: "",
        businessUnit: [],
        accountIds: [],
        active: true,
    });

    const roleOptions = [
        "Admin", "Lead", "SA", "AE", "Account Director",
        "CSM", "ADR", "RD", "RVP", "TAM", "Marketing"
    ].map(r => ({ label: r, value: r }));

    useEffect(() => {
        api.get("/accounts")
        .then(res => {
            setAccounts(
                res.data.map(a => ({
                    label: a.name,
                    value: a._id,
                    name: a.name,
                    _id: a._id,
                    businessUnit: a.businessUnit || []
                }))
            );
        })
        .catch(err => {
            // --- 3. ENHANCED: Error handling for accounts load ---
            console.error("Error loading accounts:", err);
            setError("Failed to load the list of available accounts for mapping. User creation might be limited.");
        });
    }, []);

    /* DYNAMIC BUSINESS UNIT OPTIONS (unchanged) */
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

    /* -------------------------------------------------- */
    
    // --- 4. Internal Validation Utility ---
    const validateForm = () => {
        if (!form.username.trim() || !form.email.trim() || !form.password) {
            return "Username, Email, and Password are required fields.";
        }
        if (!form.email.includes('@')) {
            return "Please enter a valid email address.";
        }
        return null; // Validation passed
    };


    const submitForm = async () => {
        setError(null);
        
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);

        try {
            await api.post("/users", {
                username: form.username,
                displayName: form.displayName,
                email: form.email,
                password: form.password,
                region: form.region,
                businessUnit: form.businessUnit,
                roles: form.roles.map(r => r.value),
                accountIds: form.accountIds.map(a => ({
                    _id: a._id,
                    name: a.name
                })),
                active: form.active
            });

            navigate("/users"); // Success
        } catch (err) {
            // --- 5. ENHANCED: Error handling for submission ---
            console.error("User creation failed:", err);
            
            let userMessage = "User creation failed due to a server error or network issue.";

            if (err.response) {
                if (err.response.status === 409) {
                    // Conflict, likely duplicate username/email
                    userMessage = `A user with that username or email already exists.`;
                } else if (err.response.status === 400 && err.response.data?.message) {
                    // Validation error from the backend
                    userMessage = `Validation Error: ${err.response.data.message}`;
                } else if (err.response.status === 403) {
                    userMessage = "You do not have permission to create new users.";
                } else {
                    userMessage = `Creation failed: Server responded with ${err.response.status}.`;
                }
            }
            setError(userMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 min-h-screen bg-gray-50">
            
            {/* RENDER THE POPUP */}
            <ErrorPopup 
                message={error} 
                onClose={() => setError(null)} 
            />

            <div className="max-w-3xl mx-auto">
                
                {/* Header and Back Button (unchanged) */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate("/users")}
                        className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition p-2 disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        ← Back to Users
                    </button>

                    <h2 className="text-3xl font-light text-gray-800 tracking-wide">Create New User</h2>
                </div>

                {/* Form Card */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                    {/* Username */}
                    <div>
                        <label className={labelStyle}>Username</label>
                        <input
                            className={inputStyle}
                            placeholder="Username (Required)"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelStyle}>Email</label>
                        <input
                            className={inputStyle}
                            placeholder="Email (Required)"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className={labelStyle}>Password</label>
                        <input
                            className={inputStyle}
                            type="password"
                            placeholder="Password (Required)"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* REGION */}
                    <div>
                        <label className={labelStyle}>Region</label>
                        <select
                            className={inputStyle}
                            value={form.region}
                            onChange={(e) => setForm({ ...form, region: e.target.value })}
                            disabled={isSubmitting}
                        >
                            <option value="">Select Region</option>
                            <option value="Global">Global</option>
                            <option value="APAC">APAC</option>
                            <option value="EMEA">EMEA</option>
                        </select>
                    </div>

                    {/* ACCOUNTS MULTI SELECT */}
                    <div className="pt-2">
                        <MultiSelect
                            label="Mapped Accounts"
                            placeholder="Select accounts this user manages"
                            options={accounts}
                            value={form.accountIds}
                            onChange={(arr) => setForm({ ...form, accountIds: arr })}
                            displayKey="label"
                            valueKey="_id"
                            disabled={isSubmitting}
                        />
                        <div className="text-xs text-gray-400 mt-2">
                            Selecting accounts dynamically loads available Business Units.
                        </div>
                    </div>


                    {/* BUSINESS UNIT MULTI SELECT (Dynamic) */}
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
                                setForm({
                                    ...form,
                                    businessUnit: arr.map(a => a.value)
                                })
                            }
                            displayKey="label"
                            valueKey="value"
                            disabled={availableBusinessUnits.length === 0 || isSubmitting}
                        />
                    </div>

                    {/* ROLE MULTI SELECT */}
                    <div className="pt-2">
                        <MultiSelect
                            label="Roles"
                            placeholder="Select roles"
                            options={roleOptions}
                            value={form.roles}
                            onChange={(arr) => setForm({ ...form, roles: arr })}
                            displayKey="label"
                            valueKey="value"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-2 pt-4">
                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm({ ...form, active: e.target.checked })}
                            className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 cursor-pointer" 
                            disabled={isSubmitting}
                        />
                        <span className="text-gray-700 ml-1">User is **Active**</span>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6 border-t border-gray-100 mt-8">
                        <button
                            onClick={submitForm}
                            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition w-full flex items-center justify-center gap-2 font-medium disabled:bg-teal-400 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            <Plus size={16} /> {isSubmitting ? "Creating User..." : "Create User"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}