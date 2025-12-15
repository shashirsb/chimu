// src/pages/modals/ContactModal.jsx
import React, { useState, useMemo, useCallback } from "react";
// ADDED: MapPin for location
import { X, Search, User, Briefcase, Mail, Zap, DollarSign, MapPin, Ban, OctagonX } from "lucide-react";

const ROLES_TO_FIND = [
  { value: "coach", label: "Coach", icon: Briefcase },
  { value: "techChampion", label: "Tech Champion", icon: Zap },
  { value: "businessChampion", label: "Business Champion", icon: User },
  { value: "economicBuyer", label: "Economic Buyer", icon: DollarSign },
   { value: "detractor", label: "Detractor", icon: OctagonX },
];

/* ------------------ COUNTRY DATA & UTILS (Copied from MapOrgChartPage.jsx) ------------------ */
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

function getFlag(locationString) {
  if (!locationString) return '🌍';
  // Location is stored as "City, Country"
  const parts = locationString.split(',');
  const countryName = parts.length > 1 ? parts[parts.length - 1].trim() : '';

  const country = MAJOR_COUNTRIES.find(c => c.name === countryName);
  return country ? country.flag : '🌍';
}
/* --------------------------------------------------------------------------------------------- */


/**
 * Helper function to find a person's manager up the hierarchy by a specified number of levels,
 * filtered by role.
 */
function findNearestManagerByRole(startEmail, nodeMap, roleType, maxLevel = 10) {
  let currentEmail = startEmail;
  let level = 0;

  for (let i = 0; i < maxLevel; i++) {
    const person = nodeMap.get(String(currentEmail).toLowerCase());
    if (!person || !person.reportingTo || person.reportingTo.length === 0) {
      return null; // Hit the top of the chart
    }

    // Manager is the first in reportingTo array
    const managerEmail = person.reportingTo[0];
    const manager = nodeMap.get(String(managerEmail).toLowerCase());

    if (manager) {
      level++;
      if (manager.type === roleType) {
        return { person: manager, level };
      }
      currentEmail = managerEmail;
    } else {
      return null; // Manager not found in map
    }
  }

  return null;
}

export default function ContactModal({ isOpen, onClose, customers, nodeByEmailMap, accountId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Memoized search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return customers
      .filter(c =>
        c.email.toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [searchQuery, customers]);

  // Handle selection from search
  const handleSelectPerson = useCallback((email) => {
    const person = nodeByEmailMap.get(String(email).toLowerCase());
    setSelectedPerson(person);
    setSearchQuery("");
  }, [nodeByEmailMap]);

  // Pre-calculate nearest managers for the selected person
  const nearestRoles = useMemo(() => {
    if (!selectedPerson) return [];

    return ROLES_TO_FIND.map(role => {
      const result = findNearestManagerByRole(selectedPerson.email, nodeByEmailMap, role.value, 10);
      return {
        ...role,
        found: result,
      };
    });
  }, [selectedPerson, nodeByEmailMap]);

  // Derived data for Row 1: Reportees
  const reportees = useMemo(() => {
    if (!selectedPerson) return [];
    return (selectedPerson.reportees || [])
      .map(email => nodeByEmailMap.get(String(email).toLowerCase()))
      .filter(Boolean);
  }, [selectedPerson, nodeByEmailMap]);

  // Derived data for Row 1: Reporting Line (Up to 4 levels)
  const reportingToChain = useMemo(() => {
    if (!selectedPerson) return [];

    const chain = [];
    let currentEmail = selectedPerson.email;
    const MAX_LEVELS = 4; // Target: go up at least 4 levels

    for (let i = 0; i < MAX_LEVELS; i++) {
        const person = nodeByEmailMap.get(String(currentEmail).toLowerCase());
        
        // Use the manager's email from the current person's reportingTo array
        const managerEmail = person?.reportingTo?.[0]; 

        if (!managerEmail) {
            break; // Reached the top or a broken link
        }
        
        const manager = nodeByEmailMap.get(String(managerEmail).toLowerCase());

        if (manager) {
            // Level is i + 1 relative to the selected person
            chain.push({ person: manager, level: i + 1 });
            currentEmail = managerEmail; // Move up one level
        } else {
            break; // Manager not found in map
        }
    }
    return chain;
  }, [selectedPerson, nodeByEmailMap]);


  if (!isOpen) return null;

  const resetModal = () => {
    setSelectedPerson(null);
    setSearchQuery("");
    onClose();
  };

  /* -------------------------- PersonCard Component (UPDATED) -------------------------- */
  const PersonCard = ({ person, level = null, roleIcon }) => {
    const Icon = roleIcon || User; 
    const isSelected = selectedPerson?.email.toLowerCase() === person.email.toLowerCase();
    
    // Extract key details
    const location = person.location || '';
    const sentiment = person.sentiment || 'Unknown';
    const awareness = person.awareness || 'Unknown';
    const businessUnit = Array.isArray(person.businessUnit) ? person.businessUnit.join(', ') : '';
    
    // Get Flag
    const flag = getFlag(location);

    return (
      <div className={`p-3 border rounded-lg shadow-sm w-full transition-all ${isSelected ? 'bg-teal-100 border-teal-400' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${isSelected ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate max-w-[150px]">{person.name || person.email}</div>
            <div className="text-xs text-gray-500 truncate max-w-[150px]">{person.designation || '—'}</div>
          </div>
          {level !== null && (
            <div className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-medium flex-shrink-0">
              {typeof level === 'number' ? `L${level}` : level}
            </div>
          )}
        </div>
        
        {/* Contact Info */}
        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <Mail size={12} /> {person.email}
        </div>
        
        {/* Additional Details Row (Location, BU, Status) */}
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
            
            {/* Location & BU */}
            {(location || businessUnit) && (
                <div className="text-[11px] text-gray-600 flex items-center justify-between">
                    {location && (
                        <span className="flex items-center gap-1 truncate max-w-[50%]">
                            {flag}
                            {location}
                        </span>
                    )}
                    {businessUnit && (
                        <span className="text-gray-400 italic truncate max-w-[50%] ml-auto">
                            {businessUnit}
                        </span>
                    )}
                </div>
            )}

            {/* Sentiment & Awareness Badges */}
            <div className="flex gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${sentimentColor(sentiment)}`}>
                    Sentiment: {sentiment}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${awarenessColor(awareness)}`}>
                    Outreach: {awareness}
                </span>
            </div>
        </div>
      </div>
    );
  };
  /* ------------------------------------------------------------------------------------------ */

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Sales View</h2>
          <button onClick={resetModal} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b relative">
          <div className="relative w-full max-w-xl mx-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full border rounded-lg px-10 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Search person by Name or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-w-xl mx-auto left-0 right-0 bg-white border rounded-lg shadow max-h-60 overflow-auto">
              {searchResults.map((c) => (
                <button
                  key={c.email}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100"
                  onClick={() => handleSelectPerson(c.email)}
                >
                  <div className="font-medium text-sm">{c.name || c.email}</div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {!selectedPerson ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Please search for and select a person to view their contact map.
          </div>
        ) : (
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* Row 1: 70% - Selected Person and Reporting Lines */}
            <div className="h-[70%] flex gap-4">
              {/* Left: Reportees (Vertical Layout) */}
              <div className="w-[30%] border rounded-lg p-3 overflow-y-auto space-y-3 bg-gray-50">
                <h3 className="font-semibold text-sm border-b pb-2 mb-2 sticky top-0 bg-gray-50 z-10">Reportees ({reportees.length})</h3>
                {reportees.length > 0 ? (
                  reportees.map(p => <PersonCard key={p.email} person={p} />)
                ) : (
                  <div className="text-xs text-gray-500 italic">No direct reportees found in the chart.</div>
                )}
              </div>

              {/* Middle: Selected Person Info (Main Card) */}
              <div className="w-[40%] flex flex-col items-center justify-center p-4 bg-teal-50 border-2 border-teal-300 rounded-lg">
                <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {(selectedPerson.name || selectedPerson.email).slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedPerson.name || selectedPerson.email}</h3>
                <p className="text-md text-gray-700">{selectedPerson.designation || 'Unknown Designation'}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedPerson.email}</p>
                
                {/* Location, TGO, BU, AO, etc. (Detailed View) */}
                <div className="mt-4 w-full text-center space-y-1 text-sm text-gray-700">
                    {selectedPerson.location && (
                        <p className="flex items-center justify-center gap-2">
                            {getFlag(selectedPerson.location)} {selectedPerson.location}
                        </p>
                    )}
                    {(selectedPerson.tgo || selectedPerson.cto || selectedPerson.ao) && (
                        <p className="text-xs text-gray-500">
                            TGO: {selectedPerson.tgo || '—'} | CTO: {selectedPerson.cto || '—'} | AO: {selectedPerson.ao || '—'}
                        </p>
                    )}
                    {Array.isArray(selectedPerson.businessUnit) && selectedPerson.businessUnit.length > 0 && (
                        <p className="text-xs text-gray-500 italic">
                            BU: {selectedPerson.businessUnit.join(', ')}
                        </p>
                    )}
                </div>

                {/* Sentiment & Awareness Badges (Large) */}
                <div className="mt-3 flex gap-2">
                    <span className={`text-sm px-3 py-1 rounded-full border ${sentimentColor(selectedPerson.sentiment)}`}>
                        {selectedPerson.sentiment}
                    </span>
                    <span className={`text-sm px-3 py-1 rounded-full border ${awarenessColor(selectedPerson.awareness)}`}>
                        {selectedPerson.awareness}
                    </span>
                </div>
              </div>

              {/* Right: Reporting Line (Up to 4 levels) */}
              <div className="w-[30%] border rounded-lg p-3 overflow-y-auto space-y-3 bg-gray-50">
                <h3 className="font-semibold text-sm border-b pb-2 mb-2 sticky top-0 bg-gray-50 z-10">Reporting Line (L1 - L4)</h3>
                {reportingToChain.length > 0 ? (
                  reportingToChain.map(({ person, level }) => <PersonCard key={person.email} person={person} level={level} />)
                ) : (
                  <div className="text-xs text-gray-500 italic">No further managers found up the hierarchy.</div>
                )}
              </div>
            </div>

        {/* Row 2: 30% - Key Stakeholders */}
<div className="h-[30%] flex flex-row gap-4 overflow-x-auto p-1">
  {nearestRoles.map(role => (
    <div key={role.value} className="flex-shrink-0 w-64 p-3 border rounded-lg bg-white shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <role.icon size={18} className="text-indigo-600" />
        <h4 className="font-bold text-sm text-gray-800">{role.label}</h4>
      </div>
      {role.found ? (
        <PersonCard person={role.found.person} level={`+${role.found.level}`} roleIcon={role.icon} />
      ) : (
        <div className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-md">
          No one found with the **{role.label}** role up the reporting chain.
        </div>
      )}
    </div>
  ))}
</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility functions copied from MapOrgChartPage.jsx for consistent styling
function sentimentColor(v) {
  return ({
    High: "bg-green-50 text-green-700 border-green-300",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-300",
    Low: "bg-red-50 text-red-700 border-red-300",
    Unknown: "bg-gray-50 text-gray-600 border-gray-300"
  }[v] || "bg-gray-50 text-gray-600 border-gray-300");
}

function awarenessColor(v) {
  return ({
    Hold: "bg-red-50 text-red-700 border-red-300",
    "Email only": "bg-yellow-50 text-yellow-700 border-yellow-300",
    Low: "bg-blue-50 text-blue-700 border-blue-300",
    "Go Ahead": "bg-green-50 text-green-700 border-green-300",
    Unknown: "bg-gray-50 text-gray-600 border-gray-300"
  }[v] || "bg-gray-50 text-gray-600 border-gray-300");
}