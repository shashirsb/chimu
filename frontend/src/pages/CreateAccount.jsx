// src/pages/NewAccount.jsx - REVISED WITH ERROR POPUP
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { Search, Trash2, Plus, X } from "lucide-react"; // Added X for the popup

// Shared Tailwind classes for minimalist design (unchanged)
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";
const locationTagStyle = "inline-flex items-center gap-1 px-3 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-medium"; 

/* ------------------ COUNTRY DATA (unchanged) ------------------ */
const MAJOR_COUNTRIES = [
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'China', code: 'CN', flag: '🇨🇳' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'France', code: 'FR', flag: '🇫🇷' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬' },
];
/* ---------------------------------------------------- */


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


/* ------------------ MultiTagInput (unchanged logic, added disabled prop) ------------------ */
function MultiTagInput({ label, value = [], onChange, placeholder, disabled }) {
  const [query, setQuery] = useState("");

  const addTag = () => {
    const tag = query.trim();
    if (!tag) return;
    if (!value.includes(tag)) onChange([...value, tag]);
    setQuery("");
  };

  const removeTag = (tag) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="flex flex-col">
      {label && <label className={labelStyle}>{label}</label>} 

      <div className={`w-full border-b border-gray-200 transition pb-1 ${!disabled ? 'focus-within:border-teal-500' : ''}`}>
        
        <div className="flex flex-wrap gap-2 mb-2 pt-1">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
            >
              {tag}
              <button 
                onClick={() => removeTag(tag)} 
                className={`p-0.5 ${!disabled ? 'hover:text-red-500' : 'cursor-not-allowed'}`}
                title={`Remove ${tag}`}
                disabled={disabled}
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>

        <input
          className="w-full px-0 py-1 bg-transparent outline-none text-sm disabled:text-gray-500 disabled:cursor-not-allowed"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

/* ------------------ MultiUserSelect (unchanged logic, added disabled prop) ------------------ */
function MultiUserSelect({ label, value = [], onChange, users = [], disabled }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users
      .filter(
        (u) =>
          (u.displayName || u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, users]);

  const addUser = (u) => {
    if (!value.includes(u._id)) onChange([...value, u._id]);
    setQuery("");
  };

  const removeUser = (id) => onChange(value.filter((v) => v !== id));

  return (
    <div className="flex flex-col">
      {label && <label className={labelStyle}>{label}</label>}

      <div className={`w-full border-b border-gray-200 transition pb-1 ${!disabled ? 'focus-within:border-teal-500' : ''}`}>
        <div className="flex flex-wrap gap-2 mb-2 pt-1">
          {value.map((id) => {
            const u = users.find((x) => x._id === id);
            if (!u) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
              >
                {u.displayName || u.username}
                <button 
                  onClick={() => removeUser(id)} 
                  className={`p-0.5 ${!disabled ? 'hover:text-red-500' : 'cursor-not-allowed'}`}
                  title={`Remove ${u.displayName || u.username}`}
                  disabled={disabled}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            );
          })}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-0 top-2 text-gray-400" />
          
          <input
            className="w-full pl-6 pr-0 py-1 bg-transparent outline-none text-sm disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
          />

          {/* Conditional rendering for dropdown needs to consider disabled state */}
          {query && filtered.length > 0 && !disabled && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-md max-h-56 overflow-auto mt-1">
              {filtered.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-teal-50 transition"
                  onClick={() => addUser(u)}
                >
                  <div className="text-sm font-medium text-gray-800">{u.displayName || u.username}</div>
                  <div className="text-[11px] text-gray-500">{u.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ------------------ MultiLocationInput (ENHANCED ERROR) ------------------ */
function MultiLocationInput({ label, value = [], onChange, disabled }) {
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [locationError, setLocationError] = useState(""); // Internal error state

  const addLocation = () => {
    const city = newCity.trim();
    const country = newCountry.trim();
    setLocationError("");

    if (!city || !country) {
      setLocationError("City and Country are required.");
      return;
    }

    const isDuplicate = value.some(loc => loc.city === city && loc.country === country);
    if (isDuplicate) {
        setLocationError("This location already exists.");
        return;
    }

    onChange([...value, { city, country }]);
    setNewCity("");
    setNewCountry("");
  };

  const removeLocation = (index) => onChange(value.filter((_, i) => i !== index));
  
  const getFlag = (countryName) => {
    const country = MAJOR_COUNTRIES.find(c => c.name === countryName);
    return country ? country.flag : '🌍';
  };


  return (
    <div className="flex flex-col">
      {label && <label className={labelStyle}>{label}</label>}

      {/* Existing Locations Display */}
      <div className="flex flex-wrap gap-2 mb-4 pt-1">
        {value.map((loc, index) => (
          <span
            key={`${loc.city}-${loc.country}-${index}`}
            className={locationTagStyle}
          >
            {getFlag(loc.country)}
            {loc.city}, {loc.country}
            <button 
              onClick={() => removeLocation(index)} 
              className={`p-0.5 ml-1 ${!disabled ? 'hover:text-red-500' : 'cursor-not-allowed'}`}
              title={`Remove ${loc.city}`}
              disabled={disabled}
            >
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </div>
      
      {/* Internal Location Error */}
      {locationError && (
          <p className="text-red-600 text-xs mb-2">{locationError}</p>
      )}

      {/* Inputs for New Location */}
      <div className="flex gap-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
        
        <div className="flex-1">
          <label className="text-xs text-gray-500 font-medium">City (Required)</label>
          <input
            name="city"
            className="w-full p-1 border-b border-gray-200 bg-transparent focus:border-teal-500 focus:ring-0 outline-none disabled:bg-gray-100"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="e.g. Frankfurt"
            disabled={disabled}
          />
        </div>
        
        <div className="flex-1">
          <label className="text-xs text-gray-500 font-medium">Country (Required)</label>
          <select
            className="w-full p-1 border-b border-gray-200 bg-transparent focus:border-teal-500 focus:ring-0 outline-none cursor-pointer disabled:bg-gray-100"
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            disabled={disabled}
          >
            <option value="" disabled>Select Country</option>
            {MAJOR_COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={addLocation}
          className="flex-shrink-0 self-end px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition text-sm disabled:bg-teal-300 disabled:cursor-not-allowed"
          disabled={!newCity.trim() || !newCountry || disabled} 
        >
          Add
        </button>
      </div>
    </div>
  );
}


/* ------------------ NewAccount Page ------------------ */
export default function NewAccount() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false); // NEW: Creating state
  const [error, setError] = useState(null); // NEW: Error state for popup
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    region: [],
    businessUnit: [],
    locations: [],
    active: true,
    description: "",
    mappedUsers: []
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setError(null);
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      // --- ENHANCED: Error handling for user list load ---
      console.error("Failed to load users:", err);
      setError("Failed to load the user list for mapping. You can create the account, but mapping users may fail.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);

    if (!form.name.trim()) {
        setError("Account Name is required and cannot be empty.");
        return;
    }
    
    setIsCreating(true);

    let createdAccount = null;
      
    try {
      // 1. Create account with core fields
      const res = await api.post("/accounts", {
        name: form.name,
        region: form.region,
        businessUnit: form.businessUnit,
        locations: form.locations,
        active: form.active,
        description: form.description
      });

      createdAccount = res.data.account; 

      // 2. Update mapped users separately (if any)
      if (Array.isArray(form.mappedUsers) && form.mappedUsers.length > 0) {
        await api.put(`/accounts/${createdAccount._id}/users`, {
          mappedUsers: form.mappedUsers 
        });
      }

      navigate("/accounts");
    } catch (err) {
      // --- ENHANCED: Error handling for creation steps ---
      console.error("Error creating account:", err);
      
      let userMessage = "Failed to create the account due to a server or network issue.";
      let status = err.response?.status;
      
      if (status) {
          if (status === 400 && err.response.data?.message) {
              userMessage = `Validation Error: ${err.response.data.message}. Ensure the name is unique.`;
          } else if (status === 403) {
              userMessage = "You do not have permission to create accounts.";
          } else if (createdAccount) {
              // This case happens if the account creation (step 1) succeeded, but user mapping (step 2) failed.
              userMessage = `Account "${createdAccount.name}" was created successfully, but user mapping failed: Server responded with ${status}. Please edit the account later to assign users.`;
          } else {
              userMessage = `Creation failed: Server responded with ${status}.`;
          }
      }
      setError(userMessage);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="p-8 min-h-screen bg-gray-50 text-gray-600">Loading user data...</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
        
        {/* RENDER THE POPUP */}
        <ErrorPopup 
            message={error} 
            onClose={() => setError(null)} 
        />

      <div className="max-w-3xl mx-auto">
        
        {/* Header and Back Button */}
        <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/accounts")}
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition p-2 disabled:opacity-50"
              disabled={isCreating}
            >
              ← Back to Accounts
            </button>
            <h2 className="text-3xl font-light text-gray-800 tracking-wide">Create New Account</h2>
        </div>

        {/* Main Content Box */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">

          {/* Name */}
          <div>
            <label className={labelStyle}>Name</label>
            <input
              className={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Acme Corp."
              disabled={isCreating}
            />
          </div>

          {/* Regions */}
          <MultiTagInput
            label="Regions (Press Enter to add)"
            placeholder="e.g. APAC, EMEA, NA"
            value={form.region}
            onChange={(arr) => setForm({ ...form, region: arr })}
            disabled={isCreating}
          />

          {/* Business Units */}
          <MultiTagInput
            label="Business Units (Press Enter to add)"
            placeholder="e.g. Finance, Marketing, IT"
            value={form.businessUnit}
            onChange={(arr) => setForm({ ...form, businessUnit: arr })}
            disabled={isCreating}
          />
          
          {/* LOCATIONS */}
          <MultiLocationInput
            label="Office Locations"
            value={form.locations}
            onChange={(arr) => setForm({ ...form, locations: arr })}
            disabled={isCreating}
          />

          {/* Active Toggle */}
          <div className="flex items-center pt-4">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 cursor-pointer" 
              disabled={isCreating}
            />
            <span className="text-gray-700 ml-3">Account is **Active**</span>
          </div>

          {/* Mapped Users */}
          <div className="pt-4">
            <MultiUserSelect
              label="Mapped Users (Account Owners)"
              users={users}
              value={form.mappedUsers}
              onChange={(arr) => setForm({ ...form, mappedUsers: arr })}
              disabled={isCreating || users.length === 0}
            />
            <div className="text-xs text-gray-400 mt-3">
              Add users to this account. Saving will update user records.
            </div>
          </div>

          {/* Description */}
          <div className="pt-4">
            <label className={labelStyle}>Description</label>
            <textarea
              rows={3}
              className={`${inputStyle} h-auto resize-y`} 
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the account or internal notes."
              disabled={isCreating}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
            <button
              onClick={() => navigate("/accounts")}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition disabled:opacity-50"
              disabled={isCreating}
            >
              Cancel
            </button>

            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2 font-medium disabled:bg-teal-400 disabled:cursor-not-allowed"
              disabled={isCreating}
            >
                <Plus size={16} /> {isCreating ? "Creating..." : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}