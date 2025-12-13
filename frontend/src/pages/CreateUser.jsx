// src/pages/CreateUser.jsx - MINIMALIST UI REWRITE
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import MultiSelect from "./components/MultiSelect";
import { Plus } from "lucide-react"; // Added icon for the create button

// Shared Tailwind classes for minimalist design
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";

export default function CreateUser() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);

    const [form, setForm] = useState({
        username: "",
        displayName: "",
        email: "",
        password: "",
        roles: [],
        region: "",
        businessUnit: [],   // ⭐ NEW FIELD
        accountIds: [],
        active: true,
    });

    const roleOptions = [
        "Admin", "Lead", "SA", "AE", "Account Director",
        "CSM", "ADR", "RD", "RVP", "TAM", "Marketing"
    ].map(r => ({ label: r, value: r }));

    useEffect(() => {
        api.get("/accounts").then(res => {
            setAccounts(
                res.data.map(a => ({
                    label: a.name,
                    value: a._id,
                    name: a.name,
                    _id: a._id,
                    businessUnit: a.businessUnit || [] // ⭐ WE NEED THIS
                }))
            );
        });
    }, []);

    /* --------------------------------------------------
       ⭐ DYNAMIC BUSINESS UNIT OPTIONS
       Based on selected accounts (form.accountIds)
    -------------------------------------------------- */
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

    const submitForm = async () => {
        try {
            await api.post("/users", {
                username: form.username,
                displayName: form.displayName,
                email: form.email,
                password: form.password,
                region: form.region,

                businessUnit: form.businessUnit, // ⭐ SAVE BUs

                roles: form.roles.map(r => r.value),

                accountIds: form.accountIds.map(a => ({
                    _id: a._id,
                    name: a.name
                })),

                active: form.active
            });

            navigate("/users");
        } catch (err) {
            console.error(err);
            alert("Error creating user");
        }
    };

    return (
        <div className="p-8 min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto">
                
                {/* Header and Back Button */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate("/users")}
                        className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition p-2"
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
                            placeholder="Username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
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
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className={labelStyle}>Password</label>
                        <input
                            className={inputStyle}
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>

                    {/* REGION */}
                    <div>
                        <label className={labelStyle}>Region</label>
                        <select
                            className={inputStyle}
                            value={form.region}
                            onChange={(e) => setForm({ ...form, region: e.target.value })}
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
                        />
                        <div className="text-xs text-gray-400 mt-2">
                            Selecting accounts dynamically loads available Business Units.
                        </div>
                    </div>


                    {/* ⭐ BUSINESS UNIT MULTI SELECT (Dynamic) */}
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
                            disabled={availableBusinessUnits.length === 0}
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
                        />
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-2 pt-4">
                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm({ ...form, active: e.target.checked })}
                            // Custom checkbox styling for accent color
                            className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 cursor-pointer" 
                        />
                        <span className="text-gray-700 ml-1">User is **Active**</span>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6 border-t border-gray-100 mt-8">
                        <button
                            onClick={submitForm}
                            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition w-full flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus size={16} /> Create User
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}