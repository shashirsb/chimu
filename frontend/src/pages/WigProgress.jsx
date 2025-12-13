// src/pages/WigProgress.jsx - COMPLETE FILE (UPDATED)

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import { User, Calendar, ArrowLeft, Plus, Save, Map, ChevronDown, ChevronUp } from "lucide-react";
import CustomerMappingModal from "./modals/CustomerMappingModal";

// Color mapping for minimalist status badges
const statusColor = {
  on_track: "bg-green-50 text-green-700 border border-green-200",
  at_risk: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  off_track: "bg-red-50 text-red-700 border border-red-200",
};

// --- StakeholderPopover component ---
function StakeholderPopover({ stakeholder, index, onClose, update, editMeasureData, setEditMeasureData }) {
  if (stakeholder === null) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-80 p-6 rounded-xl shadow-2xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-xl font-light text-gray-800 mb-4">Edit Stakeholder</h3>

        {/* Name */}
        <label className="text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase block">Name</label>
        <input
          type="text"
          value={stakeholder.name || ""}
          onChange={(e) => update(index, { ...stakeholder, name: e.target.value }, false)} // Pass false to prevent immediate upsert on change
          className="w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition mb-4 text-sm"
        />

        {/* Email */}
        <label className="text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase block">Email</label>
        <input
          type="email"
          value={stakeholder.email || ""}
          onChange={(e) => update(index, { ...stakeholder, email: e.target.value }, false)} // Pass false to prevent immediate upsert on change
          className="w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition mb-4 text-sm"
        />

        {/* Contacted */}
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!stakeholder.contacted}
            onChange={(e) => update(index, { ...stakeholder, contacted: e.target.checked }, false)} // Pass false to prevent immediate upsert on change
            className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
          />
          Contacted
        </label>

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800 transition"
          >
            Close
          </button>

          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-red-400 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                // Remove stakeholder
                const updated = [...(editMeasureData.stakeholdersContact || [])];
                updated.splice(index, 1);
                setEditMeasureData({ ...editMeasureData, stakeholdersContact: updated });
                onClose(); // Close popover after removal
              }}
            >
              Remove
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition"
              onClick={async () => {
                // Call update with the final stakeholder object and signal to run the upsert
                await update(index, stakeholder, true); 
                onClose();
              }}
            >
              <Save size={16} className="inline-block mr-1" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// --- END StakeholderPopover component ---


export default function WigProgress({ user: propUser }) {
  const { id } = useParams();
  const [wig, setWig] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentUser] = useState(
    propUser || JSON.parse(localStorage.getItem("user" || "null"))
  );

  const [activeTab, setActiveTab] = useState(null);
  const [selectedMeasure, setSelectedMeasure] = useState(null);
  const [editMeasureData, setEditMeasureData] = useState(null);
  const [newComment, setNewComment] = useState("");

  // Org Mapping Modal State
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");

  // Popover state for stakeholder editing
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  // 🚨 SPOKE STATE
  const [spokeDetails, setSpokeDetails] = useState(null);
  const [isSpokeExpanded, setIsSpokeExpanded] = useState(false);

  // SECTION MAP: which UI sections to show for each wig.type
  const SECTION_MAP = {
    wig: ["lead"],
    champion: ["tech", "business"],
    task: ["task"],
    opportunity: ["nbm", "tfw", "sizing"],
  };

  // Helper to find Account ID
  const getAccountIdByName = useCallback((accountName) => {
    if (!accountName || !currentUser?.accountIds) return null;

    const account = currentUser.accountIds.find(a =>
      (a.name === accountName) || (a === accountName)
    );

    if (typeof account === 'object' && account !== null && (account._id || account.id)) {
      return String(account._id || account.id);
    }

    if (typeof account === 'string') {
      return account;
    }

    return null;
  }, [currentUser]);

  // Helper to open Org Chart
  const openOrgChartForStakeholder = useCallback((email) => {
    let accountId = null;

    if (wig?.accountId) {
      if (typeof wig.accountId === 'object' && wig.accountId !== null) {
        accountId = wig.accountId._id || wig.accountId.id;
      } else if (typeof wig.accountId === 'string') {
        accountId = wig.accountId;
      }
    }

    if (!accountId && wig?.accountName) {
      accountId = getAccountIdByName(wig.accountName);
    }

    if (!accountId) {
      alert("Account ID not found. Ensure the WIG is associated with a valid Account.");
      return;
    }

    const finalAccountId = String(accountId);

    if (!email || !email.trim()) {
      alert("Stakeholder email is missing.");
      return;
    }

    const url = `/org-chart?accountId=${encodeURIComponent(finalAccountId)}&email=${encodeURIComponent(email)}`;

    window.open(url, "_blank");
  }, [wig?.accountId, wig?.accountName, getAccountIdByName]);


  // 🚨 NEW FUNCTION TO FETCH SPOKE DETAILS AND UPDATE STAKEHOLDERS
  const fetchSpokeDetails = useCallback(async (spokeId, currentStakeholders) => {
    if (!spokeId) {
      setSpokeDetails(null);
      return;
    }

    try {
      const res = await api.get(`/spoke/${spokeId}`);
      const spoke = res.data;
      setSpokeDetails(spoke);

      // 2. if spokeID exists find the list of email id from "whoCares" and add it to stakeholders
      // The Spoke data structure has 'whoCares' as an array of email strings.
      const whoCares = spoke.whoCares || [];
      const existingEmails = new Set(currentStakeholders.map(s => s.email.toLowerCase()).filter(e => e));
      let newStakeholders = [...currentStakeholders];

      whoCares.forEach(email => {
        // Simple name extraction from email (e.g., john.doe@... -> john doe)
        const namePart = email.split('@')[0];
        const name = namePart.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

        if (email && !existingEmails.has(email.toLowerCase())) {
          newStakeholders.push({
            // Use a temporary ID for newly added, non-persisted stakeholders
            _id: `spoke-wc-${email}`,
            name: name,
            email: email,
            contacted: false,
            // Add a flag to indicate this came from Spoke
            isSpokeWc: true
          });
          existingEmails.add(email.toLowerCase());
        }
      });

      // Update the editing state with the new stakeholders list
      setEditMeasureData(prev => ({
        ...prev,
        stakeholdersContact: newStakeholders
      }));

    } catch (err) {
      console.error("Error fetching Spoke details:", err);
      // Ensure the error message is clear
      setSpokeDetails({ error: "Failed to load Spoke details. Check API connection or ID." });
    }
  }, [setEditMeasureData]);

  // fetch wig
  const fetchWig = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/wigs/${id}`);
      setWig(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // When wig changes, set default active tab
  useEffect(() => {
    if (!wig) return;
    const sections = SECTION_MAP[wig.type] || ["lead"];
    setActiveTab((prev) => {
      return sections.includes(prev) ? prev : sections[0];
    });
  }, [wig?.type]); // eslint-disable-line

  // Initialize editMeasureData AND fetch Spoke details when a measure is selected
  useEffect(() => {
    if (selectedMeasure) {
      const initialStakeholders = selectedMeasure.stakeholdersContact?.map((s) => ({
        ...s,
        contacted: !!s.contacted,
      })) || [];

      setEditMeasureData({
        ...selectedMeasure,
        spokeId: selectedMeasure.spokeId || '',
        spokeName: selectedMeasure.spokeName || '',
        stakeholdersContact: initialStakeholders,
      });

      // 2. If spokeId exists, fetch data
      if (selectedMeasure.spokeId) {
        fetchSpokeDetails(selectedMeasure.spokeId, initialStakeholders);
      } else {
        setSpokeDetails(null);
      }

    } else {
      setEditMeasureData(null);
      setSpokeDetails(null); // Clear spoke details when measure is unselected
      setIsSpokeExpanded(false); // Reset expansion state
    }
  }, [selectedMeasure, fetchSpokeDetails]);


  // Update wig data to ensure assignedTo references are valid if needed (keeps previous behavior)
  useEffect(() => {
    if (!wig) return;
    if (!Array.isArray(wig.leadMeasures)) {
      setWig((prev) => ({ ...prev, leadMeasures: [] }));
    }
  }, [wig]); // eslint-disable-line

  // --- NEW FUNCTION: CHECK AND UPSERT CUSTOMER ---
  const checkAndUpsertCustomer = useCallback(async (stakeholder, accountId) => {
    if (!stakeholder.email) return stakeholder;

    const isNew = stakeholder._id && stakeholder._id.startsWith('new-');
    const email = stakeholder.email.trim();
    let customerExists = false;

    // 1. Check if customer exists ONLY if it's a new or modified stakeholder with a valid email
    if (isNew || (stakeholder.isModified)) { // Assuming you could track modification or just check existence every time a save is attempted
      try {
        await api.get(`/customer/${encodeURIComponent(email)}`);
        customerExists = true;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          customerExists = false;
        } else {
          console.error("Error checking customer existence:", error);
          return stakeholder; 
        }
      }
    } else if (!isNew) {
        customerExists = true; // Assume existing stakeholder email means customer exists
    }


    if (customerExists) {
        console.log(`Customer ${email} already exists. Skipping upsert.`);
        // Ensure no temporary ID remains
        return { ...stakeholder, _id: stakeholder._id && !isNew ? stakeholder._id : email };
    }

    // 2. If customer does not exist (404), perform PUT/UPSERT
    try {
      const payload = {
        name: stakeholder.name || email,
        email: email,
        designation: stakeholder.designation || 'Stakeholder',
        accountId: accountId,
        sentiment: 'Unknown',
        awareness: 'Unknown',
        type: 'unknown',
      };
      
      await api.put(`/customer/${encodeURIComponent(email)}`, payload);
      
      console.log(`Customer ${email} created via upsert.`);
      
      // Return the stakeholder, ensuring a stable ID (the email)
      return {
        ...stakeholder,
        _id: email 
      }; 
      
    } catch (error) {
      console.error("Error performing customer upsert:", error);
      alert(`Failed to create new customer record for ${email}. Check console.`);
      return stakeholder;
    }
  }, []);
  // --- END NEW FUNCTION ---


  const handleSubmitMeasureUpdate = async () => {
    if (!editMeasureData) return;

    const payload = {
      wigId: wig._id,
      currentValue: editMeasureData.currentValue,

      spokeId: editMeasureData.spokeId || '',
      spokeName: editMeasureData.spokeName || '',

      stakeholdersContact: editMeasureData.stakeholdersContact
        // Filter out temporary stakeholders added from Spoke's 'whoCares' unless they have been modified/contacted
        .filter(s => !s._id.startsWith('spoke-wc-') || s.contacted || s.name !== 'Spoke Stakeholder')
        .map((s) => {
          const { _id, isSpokeWc, ...rest } = s;
          // Use email as the identifier if it's a new stakeholder that has passed the upsert check.
          if (_id && (_id.startsWith("new-") || _id.startsWith("spoke-wc-"))) {
            return { ...rest, _id: s.email }; 
          }
          return { _id, ...rest };
        }),
      newComment: newComment.trim()
        ? {
          text: newComment,
          createdAt: new Date().toISOString(),
          createdById: currentUser.id,
          createdByName: currentUser.displayName || currentUser.username || 'System',
        }
        : null,
    };

    try {
      await api.put(`/wigs/measures/${selectedMeasure._id}`, payload);
      setNewComment("");
      setSelectedMeasure(null);
      setEditMeasureData(null);
      setSpokeDetails(null);
      fetchWig();
    } catch (err) {
      console.error(err);
      alert("Error updating measure");
    }
  };


  const renderMeasureCard = (measure) => {
    const progressPercent = Math.min(
      (measure.currentValue / (measure.targetValue || 1)) * 100,
      100
    );

    const statusClasses = statusColor[wig.status] || "bg-gray-100 text-gray-600 border border-gray-200";

    return (
      <div
        key={measure._id}
        className="bg-white p-5 rounded-xl border border-gray-100 hover:border-teal-100 hover:shadow-md cursor-pointer transition"
        onClick={() => setSelectedMeasure(measure)}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-lg text-gray-800">{measure.name}</h4>
            <div className="mt-1">
              <span className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">
                {measure.type?.toUpperCase() || "LEAD"} MEASURE
              </span>
              {/* Spoke Link */}
              {measure.spokeName && (
                <span className="ml-2 text-xs px-3 py-1 rounded-full  bg-blue-50 text-blue-700 font-medium">
                  Spoke: {measure.spokeName}
                </span>
              )}
            </div>
          </div>

          {/* Minimalist Badge: WIG Status */}
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize whitespace-nowrap ${statusClasses}`}
          >
            {(wig.status || "").replace("_", " ")}
          </span>
        </div>

        {/* Assigned */}
        <div className="flex justify-between items-center mb-3 text-gray-600 text-sm">
          <div>
            <span className="font-semibold text-xs uppercase text-gray-500 tracking-wider">Assigned To</span>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {measure.assignedTo && measure.assignedTo.length > 0 ? (
                measure.assignedTo.map((user, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}
                  >
                    <User size={12} />
                    <span>{user.name || "Unknown"}</span>
                  </div>
                ))
              ) : (
                <span className="text-gray-500 text-xs">Unknown</span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="font-semibold text-xs uppercase text-gray-500 tracking-wider">Validity</span>
            <div className="flex items-center justify-end gap-2 mt-1 text-sm text-gray-700">
              <Calendar size={16} /> <span>{wig.validityPeriod?.type || "-"}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar (Minimalist) */}
        <div className="relative mb-3 pt-2">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`${statusClasses.split(' ')[0]} h-2 transition-all duration-500`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="w-full flex justify-between items-center px-0 text-sm font-medium text-gray-700 pt-1">
            <span className="text-sm font-medium">Current: {measure.currentValue}</span>
            <span className="text-sm font-medium">Target: {measure.targetValue}</span>
          </div>
        </div>
      </div>
    );
  };


  if (loading) return <div className="p-8 min-h-screen bg-gray-50 text-gray-600">Loading Progress...</div>;
  if (!wig) return <div className="p-8 min-h-screen bg-gray-50 text-gray-600">WIG not found</div>;

  const allMeasures = [...(wig.leadMeasures || []), ...(wig.lagMeasures || [])];
  const totalCurrent = allMeasures.reduce((a, m) => a + (m.currentValue || 0), 0);
  const totalTarget = Math.max(
    1,
    allMeasures.reduce((a, m) => a + (m.targetValue || 0), 0)
  );
  const overallProgress = Math.min((totalCurrent / totalTarget) * 100, 100);

  const openMainCustomerMapping = () => { /* ... */ };
  const mapStakeholder = (s) => { /* ... */ };
  const sections = SECTION_MAP[wig.type] || ["lead"];


  // --- SELECTED MEASURE EDIT VIEW ---
  if (selectedMeasure && editMeasureData) {

    // Helper function to render array data fields
    const renderSpokeArray = (title, data) => (
      <div className="text-sm border-b border-gray-100 py-3">
        <p className="font-semibold text-gray-700 mb-1">{title}:</p>
        <div className="flex flex-wrap gap-1">
          {(data || []).length > 0 ? (
            (data || []).map((item, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {item}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">None specified.</span>
          )}
        </div>
      </div>
    );

    return (
      <div className="p-8 min-h-screen bg-gray-50">
        {/* Header/Breadcrumb */}
        <div className="w-full bg-white border border-gray-100 p-5 rounded-xl shadow-sm mb-6">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <button
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 text-sm font-medium transition"
              onClick={() => {
                setSelectedMeasure(null);
                setEditMeasureData(null);
                setSpokeDetails(null);
              }}
            >
              <ArrowLeft size={16} />
              Go back to {wig.type?.toUpperCase()} measures
            </button>

            {/* Right side meta */}
            <div className="text-xs text-gray-500 flex gap-4">
              <span className="font-medium text-gray-700">WIG: {wig.title}</span>
              <span className="truncate max-w-[120px] font-medium text-gray-700">Account: {wig.accountName}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-light text-gray-800 mt-4">
            Measure: {selectedMeasure.name}
          </h2>

          {/* Description */}
          <p
            className="text-gray-500 text-sm mt-1"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {selectedMeasure.description || wig.statement}
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

          {/* Timeline & Spoke (LEFT SIDE) */}
          <div className="lg:col-span-7 space-y-6">

            {/* 🚨 Spoke Details Section */}
            {selectedMeasure.spokeId && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <button
                  onClick={() => setIsSpokeExpanded(!isSpokeExpanded)}
                  className="w-full flex justify-between items-center text-lg font-semibold text-gray-800 pb-2 mb-4 focus:outline-none border-b-2 border-teal-500 hover:border-teal-700"
                >
                  Spoke: {spokeDetails?.spoke || selectedMeasure.spokeName || 'Details'}
                  {isSpokeExpanded ? <ChevronUp size={20} className="text-teal-600" /> : <ChevronDown size={20} className="text-teal-600" />}
                </button>

                {isSpokeExpanded && (
                  <div className="pt-2">
                    {spokeDetails && !spokeDetails.error ? (
                      <div className="divide-y divide-gray-100">

                        {/* Primary Info */}
                        <div className="text-sm py-3">
                          <p className="font-medium text-gray-500">Account: <span className="text-gray-800 font-semibold">{spokeDetails.accountName || 'N/A'}</span></p>
                          <p className="font-medium text-gray-500 mt-1">Owner: <span className="text-gray-800">{spokeDetails.User || 'N/A'}</span></p>
                          <p className="font-medium text-gray-500 mt-1">Partners: <span className="text-gray-800">{(spokeDetails.partners || []).join(', ') || 'None'}</span></p>
                        </div>

                        {/* Array fields */}
                        {renderSpokeArray("Tech Stack", spokeDetails.techStack)}
                        {renderSpokeArray("Description/Relevancy", spokeDetails.descriptionRelevancy)}
                        {renderSpokeArray("Big Rock Goal", spokeDetails.bigRockGoal)}
                        {renderSpokeArray("Challenges / Pain Points", spokeDetails.challengesPainPoints)}
                        {renderSpokeArray("Why Now", spokeDetails.whyNow)}
                        {renderSpokeArray("Why MongoDB", spokeDetails.whyMongoDB)}
                        {renderSpokeArray("Proof Point", spokeDetails.proofPoint)}
                        {renderSpokeArray("Talk Track", spokeDetails.talkTrack)}

                        {/* Who Cares (Emails) - Note: These were injected into stakeholders, but displayed here too. */}
                        <div className="text-sm py-3">
                          <p className="font-semibold text-gray-700 mb-1">Who Cares (Emails):</p>
                          <div className="flex flex-wrap gap-2">
                            {(spokeDetails.whoCares || []).map((email, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                                {email}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Internal Notes */}
                        <div className="text-sm py-3">
                          <p className="font-semibold text-gray-700 mb-1">Internal Notes:</p>
                          <p className="text-gray-800 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{spokeDetails.internalNotes || 'None'}</p>
                        </div>

                      </div>
                    ) : (
                      <p className="text-red-500">{spokeDetails?.error || 'Loading Spoke details...'}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Activity Timeline */}
            <div className="relative bg-white p-6 rounded-xl shadow-sm border border-gray-100">

              <h3 className="font-semibold mb-6 text-xl text-gray-800 border-b pb-3">Activity Timeline</h3>
              {selectedMeasure.comments?.length > 0 ? (
                <div className="space-y-6">

                  {[...selectedMeasure.comments]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((c, idx, arr) => {
                      const commentUser = c.createdByName;
                      const prevUser = arr[idx - 1]?.createdByName;
                      const nextUser = arr[idx + 1]?.createdByName;
                      const sameAsPrev = commentUser === prevUser;
                      const sameAsNext = commentUser === nextUser;

                      const initials = (commentUser
                        ? commentUser.split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase()
                        : "?");

                      const timeAgo = new Date(c.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      const avatarBg = ['bg-teal-50', 'bg-blue-50', 'bg-purple-50', 'bg-orange-50'][Math.abs(commentUser.length) % 4];
                      const avatarText = ['text-teal-600', 'text-blue-600', 'text-purple-600', 'text-orange-600'][Math.abs(commentUser.length) % 4];


                      return (
                        <div key={c.createdAt + idx} className="flex flex-col">

                          {/* Top-level comment (NEW GROUP) */}
                          {!sameAsPrev && (
                            <div className="flex gap-4 relative">

                              {/* Avatar/Vertical Line */}
                              <div className="flex flex-col items-center shrink-0">
                                <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-sm font-semibold ${avatarText}`}>
                                  {initials}
                                </div>

                                {/* Vertical group line if needed */}
                                {sameAsNext && (
                                  <div className="h-full w-px bg-gray-200 mt-2"></div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 pb-2">

                                {/* Name + Timestamp aligned right */}
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-semibold text-sm text-gray-800">
                                    {commentUser}
                                  </span>

                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {timeAgo}
                                  </span>
                                </div>

                                {/* Comment */}
                                <div className="text-sm text-gray-900 leading-relaxed">
                                  {c.text}
                                </div>

                              </div>
                            </div>
                          )}

                          {/* Follow-up comment (same user) */}
                          {sameAsPrev && (
                            <div className="flex gap-4 ml-[20px] relative">

                              {/* Vertical connecting line */}
                              <div className="flex flex-col items-center shrink-0">
                                <div className="w-px bg-gray-200 h-full"></div>
                              </div>

                              <div className="flex-1 min-w-0 pl-4 pb-2">

                                {/* Timestamp right-aligned */}
                                <div className="flex justify-end">
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {timeAgo}
                                  </span>
                                </div>

                                {/* Comment */}
                                <div className="text-sm text-gray-900 leading-relaxed mt-1">
                                  {c.text}
                                </div>

                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}

                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No comments yet.</p>
              )}

            </div>




          </div>

          {/* Edit Panel (RIGHT SIDE) */}
          <div className="lg:col-span-3">
            <div className="sticky top-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">

              {/* Value Slider */}
              <div>
                <label className="text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase block">
                  Current Value:
                  <span className="text-gray-700 ml-2 text-base font-semibold">{editMeasureData.currentValue} / {editMeasureData.targetValue}</span>
                </label>

                <input
                  type="range"
                  min={0}
                  max={editMeasureData.targetValue || 0}
                  value={editMeasureData.currentValue || 0}
                  onChange={(e) =>
                    setEditMeasureData({
                      ...editMeasureData,
                      currentValue: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full mt-2 accent-teal-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Comment Box */}
              <div>
                <label className="text-xs text-gray-500 mb-1 font-medium tracking-wider uppercase block">Add Comment</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-2 border-b border-gray-200 focus:border-teal-500 focus:ring-0 outline-none bg-transparent transition text-sm h-24 resize-none"
                  placeholder="What actions were taken? Any blockers or updates?"
                />
              </div>

              {/* Submit */}
              <button
                disabled={selectedMeasure.currentValue === editMeasureData.currentValue && !newComment.trim()}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium w-full transition flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleSubmitMeasureUpdate}
              >
                <Save size={16} /> Submit Update
              </button>

              {/* === Stakeholders === */}
              <div className="pt-4 border-t border-gray-100">
                <span className="font-semibold text-gray-800 block mb-3">Stakeholders</span>

                {/* Tag Chips */}
                <div className="flex flex-wrap gap-2">
                  {(editMeasureData.stakeholdersContact || []).map((s, i) => (
                    <div
                      key={s._id || s.email || i}
                      onClick={() => {
                        setEditingStakeholder({ ...s });
                        setEditingIndex(i);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full 
                                 bg-gray-100 border border-gray-200 cursor-pointer text-sm
                                 hover:bg-teal-50 hover:border-teal-400 transition"
                    >
                      {/* Initial Bubble */}
                      <div className={`w-5 h-5 rounded-full ${s.isSpokeWc ? 'bg-blue-600' : 'bg-teal-600'} text-white text-xs 
                                      flex items-center justify-center font-semibold`}>
                        {s.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>

                      {/* Name */}
                      <span className="text-gray-800">
                        {s.name || "Unnamed"}
                        {s.isSpokeWc && <span className="ml-1 text-xs text-blue-600 font-medium">(Spoke)</span>}
                      </span>

                      {/* Contacted dot */}
                      {s.contacted && (
                        <span className="text-green-600 text-xs font-medium">✓</span>
                      )}

                      {/* Map Org Chart Button */}
                      {s.email && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrgChartForStakeholder(s.email);
                          }}
                          disabled={!s.email}
                          className="text-[9px] text-teal-600 font-medium px-2 py-0.5 rounded-full border border-teal-200 bg-teal-100 hover:bg-teal-200 disabled:opacity-50 disabled:cursor-not-allowed transition ml-2"
                          title={`Map Org Chart for ${s.name || s.email}`}
                        >
                          Map
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* +Add Chip */}
                <div className="mt-3">
                  <button
                    onClick={() => {
                      const newStakeholder = {
                        name: "",
                        email: "",
                        contacted: false,
                        _id: `new-${Date.now()}`,
                      };
                      setEditMeasureData({
                        ...editMeasureData,
                        stakeholdersContact: [
                          ...(editMeasureData.stakeholdersContact || []),
                          newStakeholder,
                        ],
                      });
                      // Open popover immediately for the new stakeholder
                      setEditingStakeholder(newStakeholder);
                      setEditingIndex((editMeasureData.stakeholdersContact || []).length);
                    }}
                    className="px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 
                                  hover:bg-gray-50 text-sm transition flex items-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Org Mapping Button (Main Customer) */}
              {wig.customer?.email && (
                <button
                  onClick={openMainCustomerMapping}
                  className="text-xs text-teal-600 hover:text-teal-800 transition mt-4 flex items-center gap-1 font-medium"
                >
                  <Map size={14} /> View/Map Customer Org ({wig.customer.name})
                </button>
              )}


              {/* Popover Editor */}
              {editingStakeholder !== null && (
                <StakeholderPopover
                  stakeholder={editingStakeholder}
                  index={editingIndex}
                  onClose={() => setEditingStakeholder(null)}
                  update={async (index, updatedObj, runUpsert = false) => {
                    let updatedCustomer = updatedObj;

                    // 1. Update local state for display during input (runUpsert is false here)
                    const updatedStakeholders = [...(editMeasureData.stakeholdersContact || [])];
                    updatedStakeholders[index] = updatedObj;
                    
                    setEditMeasureData(prev => ({ 
                        ...prev, 
                        stakeholdersContact: updatedStakeholders 
                    }));
                    setEditingStakeholder(updatedObj); 

                    // 2. Perform Customer Check/Upsert only when "Save" is clicked (runUpsert is true)
                    if (runUpsert) {
                        const accountId = wig.accountId?._id || wig.accountId || null;
                        updatedCustomer = await checkAndUpsertCustomer(updatedObj, accountId);
                        
                        // Re-update state with the finalized customer object (which may have a new _id)
                        const finalizedStakeholders = [...updatedStakeholders];
                        finalizedStakeholders[index] = updatedCustomer;

                        setEditMeasureData(prev => ({ 
                            ...prev, 
                            stakeholdersContact: finalizedStakeholders 
                        }));
                        setEditingStakeholder(updatedCustomer); 
                    }
                  }}
                  editMeasureData={editMeasureData}
                  setEditMeasureData={setEditMeasureData}
                />
              )}
            </div>
          </div>
        </div>

        {/* Modal kept intact (handler preserved) */}
        <CustomerMappingModal
          isOpen={isMappingOpen}
          onClose={() => setIsMappingOpen(false)}
          customerName={selectedCustomerName}
          customerEmail={selectedCustomerEmail}
          accountId={wig.accountId?._id || wig.accountId || null} // Pass account ID
          onMapPerson={(person) => mapStakeholder(person)}
        />
      </div>
    );
  }

  // --- DEFAULT WIG DASHBOARD VIEW ---
  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Go Back */}
      <button
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 transition mb-6"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={16} /> Go back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT PANE — Minimal Card */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div>
            <p className="text-xs uppercase text-gray-500 tracking-wider font-medium">
              {wig.accountName} - {wig.type}
            </p>

            <h2 className="text-3xl font-light text-gray-800 mt-1">
              {wig.title}
            </h2>

            <p
              className="text-gray-600 text-sm mt-3 leading-relaxed"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {wig.statement}
            </p>
          </div>

          {/* Progress Circle (Cleaner Colors) */}
          <div className="w-28 h-28 relative mt-4 mx-auto">
            <svg className="absolute -rotate-90 w-full h-full">
              <circle
                className="text-gray-200"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="52"
                cx="50%"
                cy="50%"
              />
              <circle
                className="text-teal-500"
                strokeWidth="8"
                strokeDasharray={327}
                strokeDashoffset={327 - (327 * overallProgress) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="52"
                cx="50%"
                cy="50%"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-gray-700">
              {Math.round(overallProgress)}%
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-800 border-b pb-2">
              Measure Contribution
            </h3>

            <ul className="space-y-2">
              {Object.entries(
                allMeasures
                  .reduce((scores, m) => {
                    const percent = Math.min(
                      ((m.currentValue || 0) / (m.targetValue || 1)) * 100,
                      100
                    );
                    (m.assignedTo || []).forEach((u) => {
                      scores[u.name] = (scores[u.name] || 0) + percent;
                    });
                    return scores;
                  }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([name, score]) => (
                  <li
                    key={name}
                    className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg text-sm"
                  >
                    <span>{name}</span>
                    <span className="font-medium text-teal-700">{Math.round(score)}%</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* RIGHT PANE */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex gap-3 mb-4">
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => setActiveTab(sec)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${activeTab === sec
                    ? "bg-teal-500 text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {sec.toUpperCase()} (
                {(wig.leadMeasures || []).filter((m) => m.type === sec).length})
              </button>
            ))}
          </div>

          {/* Measures List */}
          <div className="space-y-4">
            {(wig.leadMeasures || [])
              .filter((m) => m.type === activeTab)
              .map(renderMeasureCard)}
          </div>
        </div>
      </div>
    </div>
  );
}