// src/pages/EditUser.jsx - MINIMALIST UI REWRITE
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
// Assuming this imported component already has a reasonably clean look.
import MultiSelect from "./components/MultiSelect"; 
import { Save } from "lucide-react";

// Shared Tailwind classes for minimalist design
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";

export default function EditUser() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        username: "",
        displayName: "",
        email: "",
        region: "",
        businessUnit: [],   // ⭐ NEW FIELD
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
                businessUnit: a.businessUnit || [] // ⭐ WE USE THIS LATER
            }));

            setAccounts(accountList);

            setForm({
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                region: user.region || "",
                businessUnit: user.businessUnit || [],   // ⭐ LOAD USER BU
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
            console.error(err);
            alert("Error loading user");
        }
    };

    /* --------------------------------------------------
       ⭐ DYNAMIC BUSINESS UNIT LIST
       Based on selected accountIds → combine all unique businessUnits
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

    const updateUser = async () => {
        try {
            await api.put(`/users/i/${id}`, {
                username: form.username,
                displayName: form.displayName,
                email: form.email,
                region: form.region,

                businessUnit: form.businessUnit,   // ⭐ SAVE BU

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
            alert("Error updating user");
        }
    };

    if (loading) return <div className="p-8 min-h-screen bg-gray-50 text-gray-600">Loading user data...</div>;

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

                    <h2 className="text-3xl font-light text-gray-800 tracking-wide">Edit User</h2>
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

                    {/* Region */}
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
                        />
                        <div className="text-xs text-gray-400 mt-2">
                            Selecting accounts dynamically loads available Business Units.
                        </div>
                    </div>


                    {/* ⭐ DYNAMIC BUSINESS UNIT SELECT (MultiSelect) */}
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
                            disabled={availableBusinessUnits.length === 0}
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
                        />
                    </div>

                    {/* Active Checkbox */}
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

                    {/* Save Button */}
                    <div className="pt-6 border-t border-gray-100 mt-8">
                        <button
                            onClick={updateUser}
                            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition w-full flex items-center justify-center gap-2 font-medium"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}