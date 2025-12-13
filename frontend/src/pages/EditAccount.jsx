// src/pages/EditAccount.jsx - MINIMALIST UI REWRITE
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import { Search, Trash2, MapPin } from "lucide-react"; // Added MapPin import

// Shared Tailwind classes for minimalist design
const inputStyle = "w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition";
const labelStyle = "text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase";
const locationTagStyle = "inline-flex items-center gap-1 px-3 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-medium"; 

/* ------------------ COUNTRY DATA ------------------ */
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


/* ------------------ MultiTagInput (Existing) ------------------ */
function MultiTagInput({ label, value = [], onChange, placeholder }) {
  const [query, setQuery] = useState("");
  // ... (unchanged logic)
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
      <div className="w-full border-b border-gray-200 focus-within:border-teal-500 transition pb-1">
        <div className="flex flex-wrap gap-2 mb-2 pt-1">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
            >
              {tag}
              <button 
                onClick={() => removeTag(tag)} 
                className="hover:text-red-500 p-0.5"
                title={`Remove ${tag}`}
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
        <input
          className="w-full px-0 py-1 bg-transparent outline-none text-sm"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}

/* ------------------ MultiUserSelect (Existing) ------------------ */
function MultiUserSelect({ label, value = [], onChange, users = [] }) {
  const [query, setQuery] = useState("");
  // ... (unchanged logic)

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
      <div className="w-full border-b border-gray-200 focus-within:border-teal-500 transition pb-1">
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
                  className="hover:text-red-500 p-0.5"
                  title={`Remove ${u.displayName || u.username}`}
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
            className="w-full pl-6 pr-0 py-1 bg-transparent outline-none text-sm"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && filtered.length > 0 && (
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

/* ------------------ MultiLocationInput (Existing) ------------------ */
function MultiLocationInput({ label, value = [], onChange }) {
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");

  const addLocation = () => {
    const city = newCity.trim();
    const country = newCountry.trim();

    if (!city || !country) {
      alert("City and Country are required.");
      return;
    }

    const isDuplicate = value.some(loc => loc.city === city && loc.country === country);
    if (isDuplicate) {
        alert("This location already exists.");
        return;
    }

    onChange([...value, { city, country }]);
    setNewCity("");
    setNewCountry("");
  };

  const removeLocation = (index) => onChange(value.filter((_, i) => i !== index));
  
  const getFlag = (countryName) => {
    // FIX: Look up the flag based on the name stored in the location object
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
              className="hover:text-red-500 p-0.5 ml-1"
              title={`Remove ${loc.city}`}
            >
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </div>

      {/* Inputs for New Location */}
      <div className="flex gap-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
        
        <div className="flex-1">
          <label className="text-xs text-gray-500 font-medium">City (Required)</label>
          <input
            name="city"
            className="w-full p-1 border-b border-gray-200 bg-transparent focus:border-teal-500 focus:ring-0 outline-none"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="e.g. Frankfurt"
          />
        </div>
        
        <div className="flex-1">
          <label className="text-xs text-gray-500 font-medium">Country (Required)</label>
          <select
            className="w-full p-1 border-b border-gray-200 bg-transparent focus:border-teal-500 focus:ring-0 outline-none cursor-pointer"
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
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
          className="flex-shrink-0 self-end px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition text-sm"
          disabled={!newCity.trim() || !newCountry} 
        >
          Add
        </button>
      </div>
    </div>
  );
}


/* ------------------ EditAccount Page (Fixed) ------------------ */
export default function EditAccount() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
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
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [accRes, usersRes] = await Promise.all([
        api.get(`/accounts/${id}`),
        api.get("/users"),
      ]);

      // ------------------------------------------------------------------
      // ✅ FIX APPLIED HERE: Directly use accRes.data since the API does not nest the response.
      const acc = accRes.data; 
      // ------------------------------------------------------------------

      setUsers(usersRes.data || []);

      setForm({
        name: acc.name || "",
        region: acc.region || [],
        businessUnit: acc.businessUnit || [],
        locations: acc.locations || [],
        active: typeof acc.active === "boolean" ? acc.active : true,
        description: acc.description || "",
        // Mapped users need to be extracted and mapped to IDs
        mappedUsers: (acc.mappedUsers || []).map((u) => u._id || u) 
      });

      setLoading(false);
    } catch (err) {
      console.error(err);
      alert(`Error loading account: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
        alert("Account Name is required.");
        return;
    }
      
    try {
      // 1. Save basic fields including all arrays
      await api.put(`/accounts/${id}`, {
        name: form.name,
        region: form.region,
        businessUnit: form.businessUnit,
        locations: form.locations, 
        active: form.active,
        description: form.description
      });

      // 2. Save mapped users using the dedicated endpoint
      if (Array.isArray(form.mappedUsers)) {
        await api.put(`/accounts/${id}/users`, { mappedUsers: form.mappedUsers });
      }

      navigate("/accounts");
    } catch (err) {
      console.error(err);
      alert(`Error saving account: ${err.response?.data?.message || err.message}`);
    }
  };

  if (loading) return <div className="p-8 min-h-screen bg-gray-50 text-gray-600">Loading account data...</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/accounts")}
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition p-2"
            >
              ← Back to Accounts
            </button>
            <h2 className="text-3xl font-light text-gray-800 tracking-wide">Edit Account: {form.name}</h2>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
            
            {/* Name */}
            <div>
              <label className={labelStyle}>Name</label>
              <input
                className={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Regions */}
            <MultiTagInput
              label="Regions (Press Enter to add)"
              placeholder="e.g. APAC, EMEA, NA"
              value={form.region}
              onChange={(arr) => setForm({ ...form, region: arr })}
            />

            {/* Business Units */}
            <MultiTagInput
              label="Business Units (Press Enter to add)"
              placeholder="e.g. Finance, Marketing, IT"
              value={form.businessUnit}
              onChange={(arr) => setForm({ ...form, businessUnit: arr })}
            />
            
            {/* LOCATIONS */}
            <MultiLocationInput
              label="Office Locations"
              value={form.locations}
              onChange={(arr) => setForm({ ...form, locations: arr })}
            />
            {/* END LOCATIONS */}


            {/* Active Checkbox */}
            <div className="flex items-center pt-4">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 cursor-pointer" 
              />
              <span className="text-gray-700 ml-3">Account is **Active**</span>
            </div>


            {/* Mapped Users */}
            <div className="pt-4">
              <MultiUserSelect
                label="Mapped Users (Account Owners)"
                value={form.mappedUsers}
                users={users}
                onChange={(arr) => setForm({ ...form, mappedUsers: arr })}
              />
              <div className="text-xs text-gray-400 mt-3">
                Select users to assign to this account. Saving will update user records.
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
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
              <button
                onClick={() => navigate("/accounts")}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}