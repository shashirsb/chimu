import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import { 
  X, User, Mail, Briefcase, ChevronRight, ChevronDown, OctagonX, 
  Search, Trash2, MapPin, DollarSign, Target, Zap, Users, 
  Loader2, Palette, MessageSquare 
} from "lucide-react"; 

import ContactModal from "./modals/ContactModal";
import ReOrgModal from "./modals/ReOrgModal";
import ConversationModal from "./modals/ConversationModal";

/**
 * src/pages/MapOrgChartPage.jsx
 */

const SZ = {
  NODE_W: 280, 
  NODE_H: 110, 
  H_GAP: 20,   
  V_GAP: 40,   
  PADDING: 0 
};
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const STICKY_PATH_HEIGHT = SZ.NODE_H + SZ.V_GAP + 10; 

const SENTIMENTS = ["High", "Medium", "Low", "Unknown"];
const AWARENESS = ["Hold", "Email only", "Low", "Go Ahead", "Unknown"];
const ROLES = [
  { value: "techChampion", label: "Tech Champion" },
  { value: "businessChampion", label: "Business Champion" },
  { value: "economicBuyer", label: "Economic Buyer" },
  { value: "technicalBuyer", label: "Technical Buyer" }, 
  { value: "coach", label: "Coach" },
  { value: "influential", label: "Influential" },
  { value: "noPower", label: "No Power" },
  { value: "unknown", label: "Unknown" },
  { value: "detractor", label: "Detractor" },
];

/* ------------------ COUNTRY DATA & UTILS ------------------ */
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
  const parts = locationString.split(',');
  const countryName = parts.length > 1 ? parts[parts.length - 1].trim() : '';
  const country = MAJOR_COUNTRIES.find(c => c.name === countryName);
  return country ? country.flag : '🌍';
}

function useDebouncedValue(value, wait = 10) {
  const [v, setV] = useState(value);
  const tRef = useRef(null);
  useEffect(() => {
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setV(value), wait);
    return () => clearTimeout(tRef.current);
  }, [value, wait]);
  return v;
}

const getSentimentStyle = (s) => {
  switch (s) {
    case "High": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Medium": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Low": return "bg-rose-100 text-rose-700 border-rose-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

/* -------------------------- Node Card ---------------------------- */
const NodeCard = React.memo(function NodeCard({
  email,
  name,
  designation,
  sentiment,
  awareness,
  type,
  isMatch,
  x,
  y,
  highlight,
  onClick,
  onHoverEnter,
  onHoverLeave,
  zoom,
  location,
  colorize,
  reporteesCount = 0,
  onOpenConversation
}) {
  const faded = !isMatch;
  const showDetails = zoom > 0.5; 

  const RoleConfig = useMemo(() => {
    switch(type) {
      case 'economicBuyer': return { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'techChampion': return { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'businessChampion': return { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
      case 'coach': return { icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
      case 'influential': return { icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
      case 'detractor': return { icon: OctagonX, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      default: return null;
    }
  }, [type]);

  const displayName = name || (email || "").split("@")[0];
  const initials = displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const [city] = (location || '').split(',').map(s => s.trim());
  const flag = getFlag(location);

  return (
    <div
      data-email={email}
      className={`absolute flex flex-row items-start rounded-xl bg-white border cursor-pointer select-none transition-all duration-200 overflow-hidden
        ${highlight ? "ring-2 ring-teal-500 shadow-md" : "border-gray-200 shadow-sm hover:shadow-lg hover:border-teal-400"}
        ${faded ? "opacity-40 grayscale" : "opacity-100"}
      `}
      style={{
        left: x,
        top: y,
        width: 280, 
        height: 110,
        borderLeftWidth: colorize ? 4 : 1,
        borderLeftColor: (colorize && RoleConfig) ? '' : undefined 
      }}
      ref={el => {
          if (el && colorize && RoleConfig) {
             if (RoleConfig.color.includes('green')) el.style.borderLeftColor = '#16A34A';
             else if (RoleConfig.color.includes('blue')) el.style.borderLeftColor = '#2563EB';
             else if (RoleConfig.color.includes('indigo')) el.style.borderLeftColor = '#4F46E5';
             else if (RoleConfig.color.includes('amber')) el.style.borderLeftColor = '#D97706';
             else if (RoleConfig.color.includes('purple')) el.style.borderLeftColor = '#9333EA';
          }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(email);
      }}
      onMouseEnter={(e) => onHoverEnter(e, email)}
      onMouseLeave={onHoverLeave}
    >
      <div className="ml-3 mt-3 relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
          {initials}
        </div>
        {reporteesCount > 0 && (
           <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center text-[9px] border border-white z-10" title={`${reporteesCount} Direct Reports`}>
             {reporteesCount}
           </div>
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0 pl-3 pr-2 py-2.5 h-full justify-between">
        <div>
            <div className="flex justify-between items-start">
                <h3 className="text-sm font-bold text-gray-900 truncate w-32 leading-tight" title={displayName}>
                    {displayName}
                </h3>
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenConversation(email);
                        }}
                        className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Open Conversation"
                    >
                        <MessageSquare size={14} />
                    </button>

                    {RoleConfig && (
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${RoleConfig.bg} ${RoleConfig.color}`} title={type}>
                            <RoleConfig.icon size={13} />
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-[11px] text-gray-500 truncate mt-0.5 w-48" title={designation}>{designation || "No Title"}</p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{email}</p>
        </div>

        {showDetails && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {city && (
                    <div className="flex items-center gap-1 text-[10px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-gray-600 max-w-[80px] truncate">
                        <span>{flag}</span> <span className="truncate">{city}</span>
                    </div>
                )}
                {sentiment && sentiment !== 'Unknown' && (
                    <div className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${getSentimentStyle(sentiment)}`}>
                        {sentiment}
                    </div>
                )}
                {awareness && awareness !== 'Unknown' && (
                    awareness === 'Go Ahead' 
                    ? <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 ml-auto" title="Awareness: Go Ahead"></div>
                    : <div className="text-[9px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100 ml-auto">{awareness}</div>
                )}
            </div>
        )}
      </div>
    </div>
  );
});

/* -------------------------- Ancestor Card ---------------------------- */
const AncestorCard = React.memo(function AncestorCard({
  email,
  name,
  designation,
  type,
  index,
  onClick,
}) {
  const level = index + 1;

  const RoleIcon = useMemo(() => {
    switch (type) {
      case 'economicBuyer': return { icon: DollarSign, color: 'text-green-600', title: 'Economic Buyer' };
      case 'techChampion': return { icon: Zap, color: 'text-blue-600', title: 'Tech Champion' };
      case 'businessChampion': return { icon: Users, color: 'text-indigo-600', title: 'Business Champion' };
      case 'coach': return { icon: Target, color: 'text-yellow-600', title: 'Coach' };
      case 'influential': return { icon: Briefcase, color: 'text-purple-600', title: 'Influential' };
      case 'detractor': return { icon: OctagonX, color: 'text-red-600', title: "Detractor" };
      default: return null;
    }
  }, [type]);

  return (
    <div
      data-email={email}
      className={`flex flex-col justify-center rounded-lg border shadow-sm bg-white cursor-pointer select-none border-gray-300 text-gray-800 transition-shadow hover:shadow-lg`}
      style={{
        width: 180,
        height: SZ.NODE_H - 10,
        padding: SZ.PADDING / 2,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(email);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm truncate max-w-[70%]">{name || email.split("@")[0]}</div>
        <div className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium shrink-0">
          L{level}
        </div>
      </div>

      <div className="text-[10px] text-gray-600 truncate leading-tight mt-1 flex justify-between items-center">
        {designation || "—"}
        {RoleIcon && (
          <RoleIcon.icon
            size={12}
            className={`${RoleIcon.color} ml-1 shrink-0`}
            title={RoleIcon.title}
          />
        )}
      </div>
      <div className="text-[10px] text-gray-400 mt-1 truncate">{roleLabel(type)}</div>
    </div>
  );
});

/* --------------------- Viewport Indicator --------------------- */
const ViewportIndicator = ({ containerRef, totalW, totalH, zoom }) => {
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateRect = () => {
      const scrollW = container.clientWidth / zoom;
      const scrollH = container.clientHeight / zoom;
      const x = container.scrollLeft / zoom;
      const y = container.scrollTop / zoom;
      setRect({ x, y, w: scrollW, h: scrollH });
    };

    container.addEventListener('scroll', updateRect);
    window.addEventListener('resize', updateRect);
    updateRect();

    return () => {
      container.removeEventListener('scroll', updateRect);
      window.removeEventListener('resize', updateRect);
    };
  }, [containerRef, totalW, totalH, zoom]);

  const MINI_SCALE = 0.12;

  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.w}
      height={rect.h}
      fill="none"
      stroke="#10B981"
      strokeWidth={1 / MINI_SCALE}
      opacity="0.8"
      pointerEvents="none"
    />
  );
};

/* --------------------- Loading Indicator --------------------- */
const LoadingIndicator = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] z-50 pointer-events-auto">
    <Loader2 size={32} className="animate-spin text-teal-600" />
    <p className="text-sm text-gray-600 mt-2">Loading person details...</p>
  </div>
);

/* --------------------- Location Select --------------------- */
function LocationSelect({ value, onChange, options = [] }) {
  const selectedLocation = options.find(o => `${o.city}, ${o.country}` === value);

  return (
    <select
      className="w-full border rounded-lg px-3 py-1.5 text-sm cursor-pointer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Select Location —</option>
      {options.map((loc) => {
        const label = `${loc.city}, ${loc.country}`;
        const flag = getFlag(label);
        return (
          <option key={loc._id || label} value={label}>
            {flag} {label}
          </option>
        );
      })}
    </select>
  );
}


/* -------------------------- Main Component ---------------------------- */
export default function MapOrgChartPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [ceos, setCeos] = useState([]);
  const [focusEmail, setFocusEmail] = useState("");
  const [accountLocations, setAccountLocations] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoverNodeEmail, setHoverNodeEmail] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // === NEW STATE: Colorize Nodes Toggle ===
  const [colorizeNodes, setColorizeNodes] = useState(false);

  const [loadingPerson, setLoadingPerson] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [accountBUOptions, setAccountBUOptions] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const [user] = useState(storedUser);
  const [reOrgModalOpen, setReOrgModalOpen] = useState(false);
  
  // Conversation Modal State
  const [conversationModalOpen, setConversationModalOpen] = useState(false);
  const [conversationTargetEmail, setConversationTargetEmail] = useState(null);

  const emptyForm = useMemo(() => ({
    name: "",
    email: "",
    designation: "",
    location: "",
    stage: "",
    tgo: "",
    cto: "",
    ao: "",
    appNames: [],
    annualCost: "$ 0.00",
    annualMDBCost: "$ 0.00",
    monthlyMDBCost: "$ 0.00",
    sentiment: "Unknown",
    awareness: "Unknown",
    type: "unknown",
    decisionMaker: false,
    reportingTo: [],
    reportees: [],
    accountId: selectedAccountId || "",
    businessUnit: [],
    logHistory: []
  }), [selectedAccountId]);

  const [form, setForm] = useState(emptyForm);

  const [businessUnitFilter, setBusinessUnitFilter] = useState("");
  const [tgoFilter, setTgoFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");
  const [awarenessFilter, setAwarenessFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState(""); // Kept logic, removed UI

  const clearFilters = useCallback(() => {
    setBusinessUnitFilter("");
    setTgoFilter("");
    setLocationFilter("");
    setSentimentFilter("");
    setAwarenessFilter("");
    setTypeFilter("");
  }, []);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const sizedWrapperRef = useRef(null);
  const miniMapRef = useRef(null);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const [zoom, setZoom] = useState(1);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2)))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2)))), []);
  const resetZoom = useCallback(() => setZoom(1), []);
  const fitToScreen = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const availableW = cont.clientWidth - 40;
    const availableH = cont.clientHeight - 40;
    const w = canvasWidthRef.current || 1000;
    const h = canvasHeightRef.current || 800;
    const scaleW = availableW / w;
    const scaleH = availableH / h;
    const candidate = Math.min(scaleW, scaleH, 1);
    const bounded = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat(candidate.toFixed(2))));
    setZoom(bounded);
  }, []);

  const canvasWidthRef = useRef(1000);
  const canvasHeightRef = useRef(800);

  const [lastClickTime, setLastClickTime] = useState(0);

  // --- Handlers ---
  const handleOpenConversation = useCallback((email) => {
    setConversationTargetEmail(email);
    setConversationModalOpen(true);
  }, []);

  // --- Prepared Data for Autocomplete ---
  const peopleSuggestions = useMemo(() => {
    return customers.map(c => ({
        email: c.email,
        name: c.name,
        // Create a label that shows "Name (Email)" or just "Email"
        label: c.name ? `${c.name} (${c.email})` : c.email
    }));
  }, [customers]);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlAccountId = params.get('accountId');
    const urlEmail = params.get('email');

    if (urlAccountId && !selectedAccountId) {
      setSelectedAccountId(urlAccountId);
    }
    if (urlEmail && !focusEmail) {
      setFocusEmail(urlEmail);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/accounts");
        if (!mounted) return;
        setAccounts(res.data || []);
      } catch (err) {
        console.error("Error loading accounts:", err);
      }
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    if (!selectedAccountId) {
      setCustomers([]);
      setCeos([]);
      setAccountLocations([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const orgRes = await api.get(`/org-chart/${selectedAccountId}`);
        if (!mounted) return;
        const orgData = orgRes.data || [];
        setCustomers(orgData);

        const accountRes = await api.get(`/accounts/${selectedAccountId}`);
        const accountData = accountRes.data;
        setAccountLocations(accountData?.locations || []);

        const tops = orgData.filter((x) => Array.isArray(x.reportingTo) && x.reportingTo.length === 0);
        setCeos(tops);

        if (tops.length > 0) setFocusEmail((prev) => (prev ? prev : tops[0].email));

        if (containerRef.current) {
          containerRef.current.scrollLeft = 0;
          containerRef.current.scrollTop = 0;
        }
      } catch (err) {
        console.error("Error loading org chart or account details:", err);
        setAccountLocations([]);
      }
    })();
    return () => (mounted = false);
  }, [selectedAccountId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = customers
      .filter(c =>
        c.email.toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
    setSearchResults(results);
  }, [searchQuery, customers]);

  const highlightMap = useMemo(() => {
    const map = new Map();
    for (const c of customers) {
      const match =
        (!businessUnitFilter || (c.businessUnit || []).includes(businessUnitFilter)) &&
        (!tgoFilter || c.tgo === tgoFilter) &&
        (!locationFilter || c.location === locationFilter) &&
        (!sentimentFilter || c.sentiment === sentimentFilter) &&
        (!awarenessFilter || c.awareness === awarenessFilter) &&
        (!typeFilter || c.type === typeFilter);
      map.set(String(c.email).toLowerCase(), !!match);
    }
    return map;
  }, [customers, businessUnitFilter, tgoFilter, locationFilter, sentimentFilter, awarenessFilter, typeFilter]);

  const normalizedCustomers = useMemo(() => {
    return (customers || []).map((c) => ({
      email: c.email,
      name: c.name || "",
      designation: c.designation || "",
      sentiment: c.sentiment || "Unknown",
      awareness: c.awareness || "Unknown",
      type: c.type || "unknown",
      location: c.location || "",
      reportingTo: Array.isArray(c.reportingTo) ? [...c.reportingTo] : [],
      reportees: Array.isArray(c.reportees) ? [...c.reportees] : [],
      businessUnit: Array.isArray(c.businessUnit) ? [...c.businessUnit] : [],
      logHistory: Array.isArray(c.logHistory) ? [...c.logHistory] : [],
      isMatch: !!highlightMap.get(String(c.email).toLowerCase()),
    }));
  }, [customers, highlightMap]);

  const nodeByEmailMap = useMemo(() => {
    const m = new Map();
    for (const n of normalizedCustomers) m.set(String(n.email).toLowerCase(), n);
    return m;
  }, [normalizedCustomers]);

  const isMatchMap = useMemo(() => {
    const m = new Map();
    for (const n of normalizedCustomers) m.set(String(n.email).toLowerCase(), n.isMatch);
    return m;
  }, [normalizedCustomers]);

  const debouncedFocus = useDebouncedValue(focusEmail, 12);

  const buildScopedTree = useCallback(
    (listMap, focusEmailLocal) => {
      if (!focusEmailLocal) return { root: null, ancestors: [] };

      const focus = listMap.get(String(focusEmailLocal).toLowerCase());
      if (!focus) return { root: null, ancestors: [] };

      const ancestors = [];
      let mgrEmail = focus.reportingTo?.[0];
      for (let i = 0; i < 1000; i++) {
        if (!mgrEmail) break;
        const m = listMap.get(String(mgrEmail).toLowerCase());
        if (!m) break;
        ancestors.unshift(m);
        mgrEmail = m.reportingTo?.[0];
      }

      const cloneNode = (n) => ({
        email: n.email,
        name: n.name || "",
        designation: n.designation || "",
        sentiment: n.sentiment || "Unknown",
        awareness: n.awareness || "Unknown",
        type: n.type || "unknown",
        location: n.location || "",
        reportingTo: Array.isArray(n.reportingTo) ? [...n.reportingTo] : [],
        reportees: Array.isArray(n.reportees) ? [...n.reportees] : [],
        businessUnit: Array.isArray(n.businessUnit) ? [...n.businessUnit] : [],
        logHistory: Array.isArray(n.logHistory) ? [...n.logHistory] : [],
        isMatch: !!n.isMatch,
        children: [],
      });

      const root = cloneNode(focus);
      const visited = new Set([root.email.toLowerCase(), ...ancestors.map((a) => a.email.toLowerCase())]);

      const build = (n) => {
        const kids = (n.reportees || [])
          .map((r) => String(r).toLowerCase())
          .filter((em) => em && !visited.has(em))
          .map((em) => listMap.get(em))
          .filter(Boolean)
          .map((child) => {
            visited.add(child.email.toLowerCase());
            return cloneNode(child);
          });

        n.children = kids;
        for (const k of kids) build(k);
      };

      build(root);
      return { root, ancestors };
    },
    []
  );

  const { root, ancestors } = useMemo(() => buildScopedTree(nodeByEmailMap, debouncedFocus), [nodeByEmailMap, debouncedFocus, buildScopedTree]);

  const computeLayout = useCallback((rootNode) => {
    if (!rootNode) return { nodes: [], edges: [], width: 0, height: 0, rootX: 0, rootY: 0 };

    const nodes = [];
    const edges = [];

    function measure(n) {
      if (!n.children || n.children.length === 0) {
        n._subtreeWidth = SZ.NODE_W;
        return n._subtreeWidth;
      }
      const widths = n.children.map(measure);
      const total = widths.reduce((a, b) => a + b, 0) + (n.children.length - 1) * SZ.H_GAP;
      n._subtreeWidth = Math.max(SZ.NODE_W, total);
      return n._subtreeWidth;
    }

    function place(n, x, y) {
      if (!n.children || n.children.length === 0) return;

      const totalChildrenWidth = n.children.reduce((a, b) => a + b._subtreeWidth, 0) + (n.children.length - 1) * SZ.H_GAP;
      let cursorX = x + (SZ.NODE_W - totalChildrenWidth) / 2;
      const childY = y + SZ.NODE_H + SZ.V_GAP;

      for (const c of n.children) {
        const childX = cursorX + (c._subtreeWidth - SZ.NODE_W) / 2;

        edges.push({
          x1: x + SZ.NODE_W / 2,
          y1: y + SZ.NODE_H,
          x2: childX + SZ.NODE_W / 2,
          y2: childY,
        });

        nodes.push({ node: c, x: childX, y: childY });

        place(c, childX, childY);
        cursorX += c._subtreeWidth + SZ.H_GAP;
      }
    }

    const totalW = measure(rootNode);
    const rootX = totalW / 2 - SZ.NODE_W / 2 + 20;
    const rootY = 20;
    place(rootNode, rootX, rootY);

    const chartHeight = (nodes.length ? Math.max(...nodes.map((n) => n.y)) : rootY) + SZ.NODE_H + 40;
    return { nodes, edges, width: totalW + 40, height: chartHeight, rootX, rootY };
  }, []);

  const debouncedRoot = useDebouncedValue(root, 12);
  const layout = useMemo(() => computeLayout(debouncedRoot), [computeLayout, debouncedRoot]);

  useEffect(() => {
    canvasWidthRef.current = Math.max(layout.width + 40, 1000);
    canvasHeightRef.current = layout.height + 40;
  }, [layout]);

  const contentRootY = 20;
  const canvasWidth = Math.max(layout.width + 40, 1000);
  const canvasHeight = layout.height + 40;

  const onHoverEnter = useCallback((e, email) => {
    const el = e.currentTarget;
    const containerRect = containerRef.current.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    setHoverPos({
      x: rect.right - containerRect.left + 10,
      y: rect.top - containerRect.top,
    });

    setHoverNodeEmail(email);
  }, []);

  const onHoverLeave = useCallback(() => setHoverNodeEmail(null), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e) => {
      if (e.target.closest('#mini-map-svg')) return;

      if (e.button !== 0) return;
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
      container.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      container.scrollLeft = lastPointer.current.scrollLeft - dx;
      container.scrollTop = lastPointer.current.scrollTop - dy;
      e.preventDefault();
    };

    const onPointerUp = () => {
      isDragging.current = false;
      container.style.cursor = "grab";
    };

    const onWheel = (e) => {
      if (e.shiftKey) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
        return;
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    container.style.cursor = "grab";

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      container.style.cursor = "";
    };
  }, []);

  const centerNodeInstant = useCallback((email) => {
    const container = containerRef.current;
    if (!container || !email) return;

    let nodeX, nodeY;

    const isRoot = root?.email.toLowerCase() === email.toLowerCase();

    if (isRoot) {
      nodeX = canvasWidth / 2 - SZ.NODE_W / 2;
      nodeY = contentRootY;
    } else {
      const nodeLayout = layout.nodes.find(n => n.node.email.toLowerCase() === email.toLowerCase());
      if (!nodeLayout) return;
      nodeX = (canvasWidth - layout.width) / 2 - 20 + nodeLayout.x;
      nodeY = contentRootY - 20 + nodeLayout.y;
    }

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const desiredScrollLeft = (nodeX * zoom) + (SZ.NODE_W * zoom / 2) - (containerW / 2);
    const desiredScrollTop = (nodeY * zoom) + (SZ.NODE_H * zoom / 2) - (containerH / 2);

    container.scrollTo({
      left: desiredScrollLeft,
      top: desiredScrollTop,
      behavior: "auto",
    });
  }, [layout, root, zoom, canvasWidth]);

  const centerNodeSmooth = useCallback((email) => {
    const container = containerRef.current;
    if (!container || !email) return;

    let nodeX, nodeY;

    const isRoot = root?.email.toLowerCase() === email.toLowerCase();
    if (isRoot) {
      nodeX = canvasWidth / 2 - SZ.NODE_W / 2;
      nodeY = contentRootY;
    } else {
      const nodeLayout = layout.nodes.find(n => n.node.email.toLowerCase() === email.toLowerCase());
      if (!nodeLayout) return;
      nodeX = (canvasWidth - layout.width) / 2 - 20 + nodeLayout.x;
      nodeY = contentRootY - 20 + nodeLayout.y;
    }

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const desiredScrollLeft = (nodeX * zoom) + (SZ.NODE_W * zoom / 2) - (containerW / 2);
    const desiredScrollTop = (nodeY * zoom) + (SZ.NODE_H * zoom / 2) - (containerH / 2);

    container.scrollTo({
      left: desiredScrollLeft,
      top: desiredScrollTop,
      behavior: "smooth",
    });
  }, [layout, root, zoom, canvasWidth]);

  const initialCenteredRef = useRef(false);
  useEffect(() => {
    if (!focusEmail) return;
    if (!initialCenteredRef.current) {
      const t = setTimeout(() => {
        centerNodeSmooth(focusEmail);
        initialCenteredRef.current = true;
      }, 100);
      return () => clearTimeout(t);
    }
  }, [focusEmail, centerNodeSmooth]);

  const handleMiniMapClick = useCallback((e) => {
    const miniMap = miniMapRef.current;
    const container = containerRef.current;
    if (!miniMap || !container) return;

    const rect = miniMap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const MINI_SCALE = 0.12;

    const targetContentX = (clickX / MINI_SCALE);
    const targetContentY = (clickY / MINI_SCALE);

    const desiredScrollLeft = (targetContentX * zoom) - (container.clientWidth / 2);
    const desiredScrollTop = (targetContentY * zoom) - (container.clientHeight / 2);

    container.scrollTo({
      left: desiredScrollLeft,
      top: desiredScrollTop,
      behavior: 'smooth',
    });

  }, [zoom, canvasWidth, canvasHeight]);

  const onNodeClick = useCallback(
    (email) => {
      const now = Date.now();
      if (now - lastClickTime < 250) {
        setFocusEmail(email);
        setDrawerOpen(true);
        requestAnimationFrame(() => centerNodeInstant(email));
      } else {
        setFocusEmail(email);
        requestAnimationFrame(() => centerNodeInstant(email));
      }
      setLastClickTime(now);
    },
    [lastClickTime, centerNodeInstant]
  );

  useEffect(() => {
    const email = focusEmail;
    if (!drawerOpen) return;

    if (!email) {
      setForm({ ...emptyForm, accountId: selectedAccountId || "" });
      setSelectedNode(null);
      setEditMode(false);
      setNotFound(false);
      setLoadingPerson(false);
      return;
    }

    setLoadingPerson(true);
    const customerData = nodeByEmailMap.get(String(email).toLowerCase());

    if (customerData) {
      setForm({
        name: customerData.name || "",
        email: customerData.email || "",
        designation: customerData.designation || "",
        location: customerData.location || "",
        stage: customerData.stage || "",
        tgo: customerData.tgo || "",
        cto: customerData.cto || "",
        ao: customerData.ao || "",
        appNames: Array.isArray(customerData.appNames) ? customerData.appNames : [],
        annualCost: customerData.annualCost || "$ 0.00",
        annualMDBCost: customerData.annualMDBCost || "$ 0.00",
        monthlyMDBCost: customerData.monthlyMDBCost || "$ 0.00",
        sentiment: customerData.sentiment || "Unknown",
        awareness: customerData.awareness || "Unknown",
        type: customerData.type || "unknown",
        decisionMaker: !!customerData.decisionMaker,
        reportingTo: Array.isArray(customerData.reportingTo) ? customerData.reportingTo : [],
        reportees: Array.isArray(customerData.reportees) ? customerData.reportees : [],
        accountId: selectedAccountId || "",
        businessUnit: Array.isArray(customerData.businessUnit) ? customerData.businessUnit : [],
        logHistory: Array.isArray(customerData.logHistory) ? customerData.logHistory : []
      });
      setSelectedNode(customerData);
      setEditMode(true);
      setNotFound(false);
    } else {
      setNotFound(true);
      setForm(f => ({
        ...f,
        email,
        accountId: selectedAccountId || f.accountId,
        businessUnit: []
      }));
      setEditMode(false);
    }
    setLoadingPerson(false);

  }, [drawerOpen, focusEmail, selectedAccountId, nodeByEmailMap, emptyForm]);

  const reloadOrgChart = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const orgRes = await api.get(`/org-chart/${selectedAccountId}`);
      setCustomers(orgRes.data || []);
      const tops = (orgRes.data || []).filter((x) => Array.isArray(x.reportingTo) && x.reportingTo.length === 0);
      setCeos(tops);

      const accountRes = await api.get(`/accounts/${selectedAccountId}`);
      setAccountLocations(accountRes.data?.locations || []);
    } catch (err) {
      console.error("reloadOrgChart error:", err);
    }
  }, [selectedAccountId]);

  const upsert = async () => {
    let logEntry = null;
    if (form.newLogSummary?.trim()) {
      logEntry = {
        summary: form.newLogSummary.trim(),
        sentiment: form.sentiment,
        awareness: form.awareness,
        createdById: user?.id,
        email: user?.email
      };
    }

    const payload = {
      name: form.name?.trim(),
      email: form.email?.trim(),
      designation: form.designation?.trim(),
      location: form.location?.trim(),
      stage: form.stage?.trim(),
      tgo: form.tgo?.trim(),
      cto: form.cto?.trim(),
      ao: form.ao?.trim(),
      appNames: form.appNames || [],
      annualCost: form.annualCost,
      annualMDBCost: form.annualMDBCost,
      monthlyMDBCost: form.monthlyMDBCost,
      sentiment: form.sentiment,
      awareness: form.awareness,
      type: form.type,
      decisionMaker: !!form.decisionMaker,
      reportingTo: form.reportingTo,
      reportees: form.reportees,
      accountId: selectedAccountId || form.accountId,
      businessUnit: Array.isArray(form.businessUnit) ? form.businessUnit : [],
      logEntry
    };

    try {
      setLoadingPerson(true);

      if (editMode) {
        await api.put(`/customer/${encodeURIComponent(payload.email)}`, payload);
      } else {
        await api.post("/customer", payload);
      }

      await reloadOrgChart();

      setDrawerOpen(false);
      setFocusEmail(payload.email);

    } catch (err) {
      console.error("upsert error:", err);
      alert("Unable to save. Check console for details.");
    } finally {
      setLoadingPerson(false);
    }
  };

  const deleteCustomer = async () => {
    // 1. Check for Reportees first
    if (form.reportees && form.reportees.length > 0) {
      alert(`Cannot delete ${form.name || form.email} because they have ${form.reportees.length} direct report(s). \n\nPlease use the 'Re-Org' tool to move these reportees to a new manager before deleting this person.`);
      return;
    }

    // 2. Standard Delete Confirmation
    if (!form.email || !window.confirm(`Are you sure you want to remove ${form.name || form.email} from the organization chart? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoadingPerson(true);
      await api.delete(`/customer/${encodeURIComponent(form.email)}`);

      // Reset view to top-level node if possible
      setFocusEmail(ceos.length > 0 ? ceos[0].email : "");
      setDrawerOpen(false);

      await reloadOrgChart();

    } catch (err) {
      console.error("deleteCustomer error:", err);
      alert("Unable to delete customer record. Check console for details.");
    } finally {
      setLoadingPerson(false);
    }
  };

  const hoverNode = useMemo(() => {
    if (!hoverNodeEmail) return null;
    return nodeByEmailMap.get(String(hoverNodeEmail).toLowerCase()) || null;
  }, [hoverNodeEmail, nodeByEmailMap]);

  return (
    <div className="w-full h-full p-6 select-none">
      <div className="flex items-center justify-between mb-3">

        <div className="flex items-center gap-2 relative">
          <select
            className="border px-2 py-1 rounded text-xs h-7"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="">— Account —</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              className="border px-2 py-1 rounded text-xs h-7 w-48"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searchResults.length > 0 && (
              <div className="absolute mt-1 w-full bg-white border rounded shadow max-h-40 overflow-auto z-50 text-xs">
                {searchResults.map((c) => (
                  <button
                    key={c.email}
                    className="w-full text-left px-2 py-1 hover:bg-gray-100"
                    onClick={() => {
                      setFocusEmail(c.email);
                      setSearchQuery("");
                      setSearchResults([]);
                      requestAnimationFrame(() => centerNodeInstant(c.email));
                    }}
                  >
                    <div className="font-medium">{c.name || c.email}</div>
                    <div className="text-[10px] text-gray-500">{c.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="px-2 py-1 bg-teal-600 text-white rounded text-xs h-7"
            onClick={() => {
              setSelectedNode(null);
              setForm({ ...emptyForm, accountId: selectedAccountId || "" });
              setEditMode(false);
              setDrawerOpen(true);
            }}
          >
            Add New
          </button>

          <button
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs h-7"
            onClick={() => setContactModalOpen(true)}
            disabled={!selectedAccountId || customers.length === 0}
          >
            Sales View
          </button>

          <button
            className="px-1 py-1 bg-amber-600 text-white rounded text-xs h-7"
            onClick={() => setReOrgModalOpen(true)}
            disabled={!selectedAccountId || customers.length === 0}
          >
            Re-Org
          </button>

          <div className="flex items-center justify-center gap-1">
            <button onClick={zoomOut} className="px-2 py-1 border rounded text-xs h-7">−</button>
            <div className="px-2 text-xs">{Math.round(zoom * 100)}%</div>
            <button onClick={zoomIn} className="px-2 py-1 border rounded text-xs h-7">+</button>
            <button onClick={resetZoom} className="px-2 py-1 border rounded text-xs h-7 ml-1">Reset</button>
            <button onClick={fitToScreen} className="px-2 py-1 border rounded text-xs h-7 ml-1">Fit</button>
          </div>
        </div>

      </div>


      {/* Filters row */}
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-1 mb-3 items-center">

        <button
          onClick={clearFilters}
          className="px-2 py-1 border rounded text-xs h-7 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1 shrink-0"
        >
          <X size={14} /> Clear
        </button>

        <select className="border px-2 py-1 rounded text-xs h-7 shrink-0"
          value={focusEmail}
          onChange={(e) => setFocusEmail(e.target.value)}>
          <option value="">— Select Person —</option>
          {ceos.map((c) => (
            <option key={c.email} value={c.email}>{c.name || c.email}</option>
          ))}
        </select>

        <select className="border px-2 py-1 rounded text-xs h-7 shrink-0"
          value={businessUnitFilter}
          onChange={(e) => setBusinessUnitFilter(e.target.value)}>
          <option value="">All BU</option>
          {[...new Set(customers.flatMap((c) => c.businessUnit || []))].map((bu) => (
            <option key={bu} value={bu}>{bu}</option>
          ))}
        </select>

        <select className="border px-2 py-1 rounded text-xs h-7 shrink-0"
          value={tgoFilter}
          onChange={(e) => setTgoFilter(e.target.value)}>
          <option value="">All TGO</option>
          {[...new Set(customers.map((c) => c.tgo || ""))]
            .filter(Boolean)
            .map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
        </select>

        <select className="border px-2 py-1 rounded text-xs h-7 shrink-0"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="">All Locations</option>
          {[...new Set(customers.map((c) => c.location || ""))]
            .filter(Boolean)
            .map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
        </select>

        <select className="border px-2 py-1 rounded text-xs h-7 shrink-0"
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}>
          <option value="">All Sentiments</option>
          {["High", "Medium", "Low", "Unknown"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select className="border px-2 py-1 rounded text-xs h-7 shrink-0"
          value={awarenessFilter}
          onChange={(e) => setAwarenessFilter(e.target.value)}>
          <option value="">All Awareness</option>
          {["Hold", "Email only", "Low", "Go Ahead", "Unknown"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* REPLACED TYPE FILTER WITH COLORIZE TOGGLE */}
        <button
          onClick={() => setColorizeNodes(!colorizeNodes)}
          className={`px-2 py-1 rounded text-xs h-7 border flex items-center gap-1 transition-colors shrink-0 ${colorizeNodes
              ? "bg-teal-100 text-teal-800 border-teal-300 font-medium"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
        >
          <Palette size={14} />
          {colorizeNodes ? "Colors On" : "Colorize"}
        </button>

      </div>

      {ancestors.length > 0 && (
        <div
          className="sticky top-0 z-20 w-full bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 shadow-sm flex items-center px-2"
          style={{ height: 64 }} // Compact height (64px) fits 2 lines comfortably
        >
          <div className="flex items-center overflow-x-auto h-full no-scrollbar gap-1 py-1">

            {/* Path Label */}
            <div className="flex flex-col justify-center px-2 border-r border-gray-200 mr-2 shrink-0">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hierarchy</span>
              <span className="text-[10px] text-gray-400">Path</span>
            </div>

            {ancestors.map((a, idx) => {
              // --- 1. Compact Logic for Avatar & Icons ---
              const initials = (a.name || a.email || "?").substring(0, 2).toUpperCase();
              const flag = getFlag(a.location); // Ensure getFlag is available

              // Define Icon based on type
              let RoleIcon = null;
              let ringColor = "ring-gray-200";

              switch (a.type) {
                case 'economicBuyer': RoleIcon = DollarSign; ringColor = "ring-green-400"; break;
                case 'techChampion': RoleIcon = Zap; ringColor = "ring-blue-400"; break;
                case 'businessChampion': RoleIcon = Users; ringColor = "ring-indigo-400"; break;
                case 'coach': RoleIcon = Target; ringColor = "ring-amber-400"; break;
                case 'influential': RoleIcon = Briefcase; ringColor = "ring-purple-400"; break;
                case 'detractor': RoleIcon = OctagonX; ringColor = "ring-red-400"; break;
              }

              return (
                <React.Fragment key={`anc-${a.email}`}>
                  <div
                    onClick={() => onNodeClick(a.email)}
                    className="group flex items-center bg-white border border-gray-200 hover:border-teal-400 hover:shadow-md rounded-lg p-1.5 pr-3 cursor-pointer transition-all shrink-0 select-none"
                    style={{ minWidth: 160, maxWidth: 220 }}
                  >
                    {/* Left: Avatar with Role Ring */}
                    <div className={`relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 ring-2 ${ringColor} ring-offset-1`}>
                      {initials}
                      {/* Tiny Role Icon Badge */}
                      {RoleIcon && (
                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow border border-gray-100">
                          <RoleIcon size={8} className="text-gray-700" />
                        </div>
                      )}
                    </div>

                    {/* Middle: Text Details */}
                    <div className="flex flex-col ml-2 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 truncate group-hover:text-teal-700">
                          {a.name || a.email.split('@')[0]}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate mt-0.5">
                        {/* Flag + Title */}
                        <span className="shrink-0 grayscale group-hover:grayscale-0">{flag}</span>
                        <span className="truncate" title={a.designation}>{a.designation || "No Title"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Separator Arrow */}
                  <ChevronRight size={16} className="text-gray-300 mx-0.5 shrink-0" />
                </React.Fragment>
              );
            })}

            {/* Current Node Indicator */}
            <div className="flex items-center gap-1 ml-1 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-lg text-teal-800 shadow-sm shrink-0">
              <MapPin size={14} />
              <span className="text-xs font-semibold">Current View</span>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="border rounded-2xl bg-white shadow relative overflow-auto"
        style={{ height: ancestors.length > 0 ? `calc(720px - ${STICKY_PATH_HEIGHT}px - 60px)` : 720 }}
      >
        <div
          ref={sizedWrapperRef}
          style={{
            width: Math.max(canvasWidth * zoom, 300),
            height: Math.max(canvasHeight * zoom, 300),
            position: "relative",
          }}
        >
          <div
            ref={contentRef}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: canvasWidth,
              height: canvasHeight,
              position: "relative",
            }}
          >
            {root && (
              <NodeCard
                email={root.email}
                name={root.name}
                designation={root.designation}
                sentiment={root.sentiment}
                awareness={root.awareness}
                type={root.type}
                location={root.location}
                isMatch={isMatchMap.get(String(root.email).toLowerCase()) ?? true}
                x={canvasWidth / 2 - SZ.NODE_W / 2}
                y={contentRootY}
                highlight
                onClick={onNodeClick}
                onOpenConversation={handleOpenConversation}
                onHoverEnter={(e) => onHoverEnter(e, root.email)}
                onHoverLeave={onHoverLeave}
                zoom={zoom}
                colorize={colorizeNodes} // PASS COLORIZE PROP
              />
            )}

            {root?.reportees?.length > 0 && (
              <svg className="absolute pointer-events-none" style={{ left: 0, top: 0 }} width={canvasWidth} height={canvasHeight}>
                <path
                  d={cubicPath(
                    canvasWidth / 2,
                    contentRootY + SZ.NODE_H,
                    (canvasWidth - layout.width) / 2 - 20 + layout.rootX + SZ.NODE_W / 2,
                    contentRootY + SZ.NODE_H + SZ.V_GAP
                  )}
                  fill="none" stroke="#CBD5E1" strokeWidth="2"
                />
              </svg>
            )}

            <svg className="absolute pointer-events-none" width={layout.width} height={layout.height} style={{ left: (canvasWidth - layout.width) / 2 - 20, top: contentRootY - 20 }}>
              {layout.edges.map((e, i) => (
                <path key={i} d={cubicPath(e.x1, e.y1, e.x2, e.y2)} fill="none" stroke="#CBD5E1" strokeWidth="2" />
              ))}
            </svg>

            {layout.nodes.map((n) => {
              const left = (canvasWidth - layout.width) / 2 - 20 + n.x;
              const top = contentRootY - 20 + n.y;
              const nodeEmail = n.node.email;
              const isMatch = isMatchMap.get(String(nodeEmail).toLowerCase()) ?? true;

              return (
                <NodeCard
                  key={nodeEmail}
                  email={nodeEmail}
                  name={n.node.name}
                  designation={n.node.designation}
                  sentiment={n.node.sentiment}
                  awareness={n.node.awareness}
                  type={n.node.type}
                  location={n.node.location}
                  isMatch={isMatch}
                  x={left}
                  y={top}
                  highlight={false}
                  onClick={onNodeClick}
                  onOpenConversation={handleOpenConversation}
                  onHoverEnter={(e) => onHoverEnter(e, nodeEmail)}
                  onHoverLeave={onHoverLeave}
                  zoom={zoom}
                  colorize={colorizeNodes} // PASS COLORIZE PROP
                />
              );
            })}

            {hoverNode && (
              <div
                className="absolute z-50 bg-white border shadow rounded p-3 w-72 text-xs"
                style={{ top: hoverPos.y, left: hoverPos.x, transform: `scale(1)` }}
              >
                <div className="font-semibold mb-2">Conversation</div>
                {hoverNode.logHistory?.length ? (
                  <div className="space-y-2 overflow-auto" style={{ maxHeight: "calc(100vh - 40px)" }}>

                    {hoverNode.logHistory.map((l, i) => (
                      <div key={i} className="p-2 bg-gray-50 border rounded">
                        <div className="text-gray-800 text-xs">{l.summary}</div>
                        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                          <span>{l.timestamp ? new Date(l.timestamp).toLocaleString() : ""}</span>
                          <span>{l.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 italic">No logs</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="absolute right-4 bottom-4 bg-white border shadow rounded p-2 cursor-pointer"
          style={{ width: 220, height: 160 }}
          onClick={handleMiniMapClick}
        >
          <div ref={miniMapRef} style={{ transform: "scale(0.12)", transformOrigin: "top left", opacity: 0.8 }}>
            <svg id="mini-map-svg" width={canvasWidth} height={canvasHeight}>
              {layout.edges.map((e, i) => (
                <path key={i} d={cubicPath(e.x1, e.y1, e.x2, e.y2)} fill="none" stroke="#CBD5E1" strokeWidth="2" />
              ))}
              {root && (
                <rect
                  x={canvasWidth / 2 - SZ.NODE_W / 2}
                  y={contentRootY}
                  width={SZ.NODE_W}
                  height={SZ.NODE_H}
                  fill="#34D399"
                  rx="4"
                />
              )}
              {layout.nodes.map((n) => {
                const left = (canvasWidth - layout.width) / 2 - 20 + n.x;
                const top = contentRootY - 20 + n.y;
                return (
                  <rect
                    key={n.node.email}
                    x={left}
                    y={top}
                    width={SZ.NODE_W}
                    height={SZ.NODE_H}
                    fill="#F3F4F6"
                    rx="4"
                  />
                );
              })}
              <ViewportIndicator containerRef={containerRef} totalW={canvasWidth} totalH={canvasHeight} zoom={zoom} />
            </svg>
          </div>
        </div>
      </div>

      <div className={`fixed right-0 top-0 h-full z-50 transform transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "translate-x-full"}`} style={{ width: 380 }}>
        <div className="h-full bg-white border-l shadow-2xl flex flex-col">
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 uppercase font-semibold">
                  {(form.name && form.name.split(" ").map(s => s[0]).slice(0, 2).join("")) || (form.email || "").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{form.name || form.email || "Person"}</div>
                  <div className="text-xs text-gray-500">{form.designation || ""}</div>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">{form.email}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium flex items-center gap-1"
                onClick={() => setDrawerOpen(!drawerOpen)}
              >
                {drawerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Form
              </button>

              <button className="p-2 rounded-full hover:bg-gray-100" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-3 relative">
            {loadingPerson && <LoadingIndicator />}

            <Field label="Full Name" icon={User}>
              <input className="w-full border rounded-lg px-9 py-1.5 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </Field>

            <Field label="Email" icon={Mail}>
              <input
                className={`w-full border rounded-lg px-9 py-1.5 text-sm ${editMode ? "bg-gray-100" : ""}`}
                value={form.email}
                disabled={editMode}
                onChange={(e) => !editMode && setForm({ ...form, email: e.target.value })}
                placeholder="name@company.com"
              />
            </Field>

            <Field label="Designation" icon={Briefcase}>
              <input className="w-full border rounded-lg px-9 py-1.5 text-sm" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Title" />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Location">
                <LocationSelect
                  value={form.location}
                  onChange={(v) => setForm({ ...form, location: v })}
                  options={accountLocations}
                />
              </Labeled>
              <Labeled label="Stage">
                <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
              </Labeled>
            </div>

            <section className="border rounded-lg p-3 bg-gray-50 space-y-2">
              <div className="font-semibold text-gray-700 text-sm">Org Details</div>
              <Labeled label="TGO"><input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.tgo} onChange={(e) => setForm({ ...form, tgo: e.target.value })} /></Labeled>
              <Labeled label="CTO"><input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.cto} onChange={(e) => setForm({ ...form, cto: e.target.value })} /></Labeled>
              <Labeled label="AO"><input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.ao} onChange={(e) => setForm({ ...form, ao: e.target.value })} /></Labeled>
            </section>

            <section className="border rounded-lg p-3 bg-gray-50 space-y-2">
              <Labeled label="Applications">
                <AppNamesSelect value={form.appNames} onChange={(arr) => setForm({ ...form, appNames: arr })} />
              </Labeled>
            </section>

            <Labeled label="Business Units">
              <BUSelect value={form.businessUnit} onChange={(arr) => setForm({ ...form, businessUnit: arr })} options={accountBUOptions} />
            </Labeled>

            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Sentiment">
                <select className={`w-full border rounded-lg px-3 py-1.5 text-sm ${sentimentColor(form.sentiment)}`} value={form.sentiment} onChange={(e) => setForm({ ...form, sentiment: e.target.value })}>
                  {SENTIMENTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Labeled>
              <Labeled label="Outreach">
                <select className={`w-full border rounded-lg px-3 py-1.5 text-sm ${awarenessColor(form.awareness)}`} value={form.awareness} onChange={(e) => setForm({ ...form, awareness: e.target.value })}>
                  {AWARENESS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Labeled>
            </div>

            <Labeled label="Role / Type">
              <select className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Labeled>

            <Labeled label="Decision Maker?">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" checked={!!form.decisionMaker} onChange={(e) => setForm({ ...form, decisionMaker: e.target.checked })} />
                <span className="text-sm">Has signing authority</span>
              </label>
            </Labeled>

            {/* CORRECTED MultiEmailSelect with peopleSuggestions */}
            <MultiEmailSelect 
                label="Reporting To" 
                placeholder="Type to search employee/email..." 
                value={form.reportingTo} 
                onChange={(arr) => setForm({ ...form, reportingTo: arr })} 
                suggestions={peopleSuggestions} 
            />
            <MultiEmailSelect 
                label="Reportees" 
                placeholder="Type to search employee/email..." 
                value={form.reportees} 
                onChange={(arr) => setForm({ ...form, reportees: arr })} 
                suggestions={peopleSuggestions} 
            />

            <section className="border rounded-lg p-3 bg-gray-50 space-y-2">
              <div className="font-semibold text-gray-700 text-sm">History</div>

              <textarea className="w-full border rounded-lg p-2 text-sm" rows={3} value={form.newLogSummary || ""} onChange={(e) => setForm({ ...form, newLogSummary: e.target.value })} placeholder="Add new log entry…" />

              <div className="pt-2 border-t">
                <div className="text-xs font-semibold mb-1">Contacted By</div>
                {form.logHistory?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(form.logHistory.map((l) => l.email).filter(Boolean))).map((email) => (
                      <span key={email} className="px-2 py-1 bg-gray-100 border rounded text-[11px]">{email}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 italic">No contacts yet.</div>
                )}
              </div>

              <div className="text-xs font-semibold mt-2">Previous Logs</div>
              {form.logHistory?.length ? (
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {form.logHistory.map((entry, i) => (
                    <div key={i} className="p-2 bg-white border rounded-lg shadow-sm text-xs">
                      <div>{entry.summary}</div>
                      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                        <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ""}</span>
                        <span>{entry.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 italic">No history yet.</div>
              )}
            </section>

            <div>
              <button disabled={loadingPerson} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg font-semibold text-sm shadow" onClick={upsert}>
                {editMode ? "Save Changes" : "Save & Build Org Chart"}
              </button>
            </div>

            {editMode && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  disabled={loadingPerson}
                  className="w-full text-red-600 hover:bg-red-50 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border border-red-200 transition-colors"
                  onClick={deleteCustomer}
                >
                  <Trash2 size={16} /> Remove from Org
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        accountId={selectedAccountId}
        customers={normalizedCustomers}
        nodeByEmailMap={nodeByEmailMap}
      />

      <ReOrgModal // <<< ADD NEW MODAL
        isOpen={reOrgModalOpen}
        onClose={() => setReOrgModalOpen(false)}
        customers={normalizedCustomers}
        accountId={selectedAccountId}
        reloadOrgChart={reloadOrgChart}
        setFocusEmail={setFocusEmail}
      />

      <ConversationModal
        isOpen={conversationModalOpen}
        onClose={() => setConversationModalOpen(false)}
        email={conversationTargetEmail}
        accountId={selectedAccountId}
        onSaveLog={reloadOrgChart}
      />

    </div>
  );
}

function cubicPath(x1, y1, x2, y2) {
  const dy = (y2 - y1) * 0.45;
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

function Field({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-2 text-gray-400" />}
        {children}
      </div>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

/* -------------------------- Updated MultiEmailSelect Component ---------------------------- */
function MultiEmailSelect({ label, value = [], onChange, suggestions = [], placeholder }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filteredSuggestions = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return suggestions
      .filter((s) => {
        const matchName = (s.name || "").toLowerCase().includes(lowerQuery);
        const matchEmail = s.email.toLowerCase().includes(lowerQuery);
        const alreadySelected = value.includes(s.email);
        return (matchName || matchEmail) && !alreadySelected;
      })
      .slice(0, 5); 
  }, [query, suggestions, value]);

  const addEmail = (email) => {
    const v = (email || "").trim();
    if (!v) return;
    if (!isEmail(v)) { 
        // Only warn if they aren't selecting from the list and the input looks invalid
        if (!filteredSuggestions.find(s => s.email === v)) {
           return alert("Enter a valid email address.");
        }
    }
    
    if (!value.includes(v)) { onChange([...value, v]); }
    setQuery("");
    setIsOpen(false);
  };

  const removeEmail = (email) => { onChange(value.filter((v) => v !== email)); };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) { addEmail(filteredSuggestions[0].email); } 
      else { addEmail(query.trim()); }
    }
  };

  return (
    <div className="flex flex-col gap-1" ref={wrapperRef}>
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      <div className="border rounded-lg p-2 bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 relative">
        <div className="flex flex-wrap gap-1 mb-1">
          {value.map((email) => (
            <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs border border-teal-100">
              {email} <button onClick={() => removeEmail(email)} className="hover:text-red-600"><Trash2 size={10} /></button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input
            className="w-full outline-none text-sm placeholder:text-gray-400 min-w-[120px]"
            placeholder={value.length === 0 ? placeholder : ""}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {isOpen && query && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
            {filteredSuggestions.map((s) => (
              <button key={s.email} type="button" className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm border-b border-gray-50 last:border-0" onClick={(e) => { e.preventDefault(); addEmail(s.email); }}>
                <div className="font-medium text-gray-800">{s.name}</div>
                <div className="text-xs text-gray-500">{s.email}</div>
              </button>
            ))}
          </div>
        )}
        {isOpen && query && filteredSuggestions.length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 text-xs text-gray-400 text-center">
                Press Enter to add "{query}"
            </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------- Remaining Helper Components ---------------------------- */

function BUSelect({ value = [], onChange, options = [] }) {
  const [query, setQuery] = useState("");
  const selectedValues = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (options || []).filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const addBU = (txt) => {
    const v = (txt || "").trim();
    if (!v) return;
    if (!selectedValues.includes(v)) onChange([...(selectedValues || []), v]);
    setQuery("");
  };

  const removeBU = (bu) => onChange(selectedValues.filter((x) => x !== bu));

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBU(query);
    }
  };

  return (
    <div className="border rounded-lg p-2">
      <div className="flex flex-wrap gap-1 mb-2">
        {selectedValues.map((bu) => (
          <span key={bu} className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            {bu}
            <button onClick={() => removeBU(bu)} className="hover:text-red-600"><Trash2 size={11} /></button>
          </span>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-2 text-gray-400" />
        <input className="w-full border rounded-lg px-8 py-1.5 text-sm" placeholder="Add BU, press Enter" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} />
        {query && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-48 overflow-auto">
            {filtered.map((bu) => (
              <button key={bu} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => addBU(bu)}>{bu}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AppNamesSelect({ value = [], onChange }) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const addApp = (txt) => {
    const v = (txt || "").trim();
    if (!v) return;
    if (!selected.includes(v)) onChange([...(selected || []), v]);
    setQuery("");
  };

  const removeApp = (a) => onChange(selected.filter((x) => x !== a));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addApp(query);
    }
  };

  return (
    <div className="border rounded-lg p-2">
      <div className="flex flex-wrap gap-1 mb-2">
        {selected.map((app) => (
          <span key={app} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
            {app}
            <button onClick={() => removeApp(app)} className="hover:text-red-600"><Trash2 size={11} /></button>
          </span>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-2 text-gray-400" />
        <input className="w-full border rounded-lg px-8 py-1.5 text-sm" placeholder="Add application, press Enter" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} />
      </div>
    </div>
  );
}

function isEmail(v) {
  return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
}

function sentimentColor(v) {
  return ({
    High: "bg-green-50 text-green-700",
    Medium: "bg-yellow-50 text-yellow-700",
    Low: "bg-red-50 text-red-700",
    Unknown: "bg-gray-50 text-gray-600"
  }[v] || "");
}

function awarenessColor(v) {
  return ({
    Hold: "bg-red-50 text-red-700",
    "Email only": "bg-yellow-50 text-yellow-700",
    Low: "bg-blue-50 text-blue-700",
    "Go Ahead": "bg-green-50 text-green-700",
    Unknown: "bg-gray-50 text-gray-600"
  }[v] || "");
}

function roleLabel(v) {
  const map = {
    techChampion: "Tech Champion",
    businessChampion: "Business Champion",
    economicBuyer: "Economic Buyer",
    technicalBuyer: "Technical Buyer",
    coach: "Coach",
    influential: "Influential",
    noPower: "No Power",
    unknown: "Unknown",
    detractor: "Detractor",

  };
  return map[v] || "Unknown";
}