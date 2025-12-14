// src/components/modals/ReOrgModal.jsx
import React, { useState, useEffect } from "react";
import { X, User, Save, Loader2, GripVertical, ArrowRightLeft, Search } from "lucide-react";
import api from "../..//api/api"; // Ensure this exports your axios instance

export default function ReOrgModal({ isOpen, onClose, customers, accountId, reloadOrgChart }) {
  // ... (keep all existing state: localCustomers, modifiedEmails, panel selections) ...
  const [localCustomers, setLocalCustomers] = useState([]);
  const [modifiedEmails, setModifiedEmails] = useState(new Set());
  const [leftManagerEmail, setLeftManagerEmail] = useState("");
  const [rightManagerEmail, setRightManagerEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // ... (keep useEffect for initialization) ...
  useEffect(() => {
    if (isOpen && customers.length > 0) {
      setLocalCustomers(JSON.parse(JSON.stringify(customers))); 
      setModifiedEmails(new Set());
      setLeftManagerEmail("");
      setRightManagerEmail("");
    }
  }, [isOpen, customers]);

  // ... (keep helpers: findPerson, getReportees) ...
  const findPerson = (email) => localCustomers.find((c) => c.email === email);
  const getReportees = (managerEmail) => {
    if (!managerEmail) return [];
    return localCustomers.filter((c) => 
      Array.isArray(c.reportingTo) && c.reportingTo.includes(managerEmail)
    );
  };

  // ... (keep drag handlers: handleDragStart, handleDragOver, handleDrop) ...
  const handleDragStart = (e, person, currentManagerEmail) => {
    setDraggedItem({ email: person.email, originManagerEmail: currentManagerEmail });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, newManagerEmail) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { email: movedPersonEmail, originManagerEmail: oldManagerEmail } = draggedItem;

    // 1. Validation
    if (movedPersonEmail === newManagerEmail) return alert("Cannot report to self.");
    if (oldManagerEmail === newManagerEmail) return; 

    // Circular Dependency Check
    let pointer = findPerson(newManagerEmail);
    let isCircular = false;
    while(pointer && pointer.reportingTo && pointer.reportingTo.length > 0) {
        if (pointer.reportingTo.includes(movedPersonEmail)) {
            isCircular = true; 
            break; 
        }
        pointer = findPerson(pointer.reportingTo[0]);
        if (!pointer || pointer.email === newManagerEmail) break; 
    }
    if (isCircular) return alert("Circular dependency detected! You cannot report to your own reportee.");

    // 2. UPDATE STATE
    setLocalCustomers((prevCustomers) => {
        return prevCustomers.map(customer => {
            // A. Update Moved Person
            if (customer.email === movedPersonEmail) {
                return { ...customer, reportingTo: [newManagerEmail] };
            }
            // B. Update Old Manager
            if (customer.email === oldManagerEmail) {
                const currentReportees = Array.isArray(customer.reportees) ? customer.reportees : [];
                return { 
                    ...customer, 
                    reportees: currentReportees.filter(r => r !== movedPersonEmail) 
                };
            }
            // C. Update New Manager
            if (customer.email === newManagerEmail) {
                const currentReportees = Array.isArray(customer.reportees) ? customer.reportees : [];
                if (!currentReportees.includes(movedPersonEmail)) {
                    return { 
                        ...customer, 
                        reportees: [...currentReportees, movedPersonEmail] 
                    };
                }
            }
            return customer;
        });
    });

    // 3. Mark Modified
    setModifiedEmails(prev => {
        const next = new Set(prev);
        next.add(movedPersonEmail);
        if (oldManagerEmail) next.add(oldManagerEmail);
        next.add(newManagerEmail);
        return next;
    });

    setDraggedItem(null);
  };

  // --- UPDATED SAVE LOGIC ---
  const handleSave = async () => {
    if (modifiedEmails.size === 0) {
        onClose();
        return;
    }

    setIsSaving(true);
    try {
        // 1. Gather only the modified customer objects
        const updates = Array.from(modifiedEmails).map((email) => {
            const person = findPerson(email);
            // We only need to send the identifiers and the fields we changed
            return {
                email: person.email,
                reportingTo: person.reportingTo,
                reportees: person.reportees
            };
        });

        // 2. Send ONE Bulk Request
        // Note: Using api.post because we are creating a bulk transaction, 
        // though api.put is also semantic if you prefer.
        await api.post("/customer/bulk-update", {
            updates,
            accountId
        });

        await reloadOrgChart();
        onClose();
    } catch (err) {
        console.error("Batch update failed", err);
        alert("Failed to save organization changes. Please check console.");
    } finally {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ArrowRightLeft className="text-teal-600" /> Organization Restructure
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop people between panels.
            </p>
          </div>
          <div className="flex items-center gap-3">
             {modifiedEmails.size > 0 && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    {modifiedEmails.size} Records Modified
                </span>
             )}
            <button 
                onClick={handleSave} 
                disabled={isSaving || modifiedEmails.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body - Split View */}
        <div className="flex-1 overflow-hidden flex divide-x divide-gray-200">
            <ManagerPane 
                side="Left"
                allCustomers={localCustomers}
                selectedEmail={leftManagerEmail}
                onSelect={setLeftManagerEmail}
                reportees={getReportees(leftManagerEmail)}
                onDrop={(e) => handleDrop(e, leftManagerEmail)}
                onDragStart={handleDragStart}
                draggedItem={draggedItem}
            />
            <ManagerPane 
                side="Right"
                allCustomers={localCustomers}
                selectedEmail={rightManagerEmail}
                onSelect={setRightManagerEmail}
                reportees={getReportees(rightManagerEmail)}
                onDrop={(e) => handleDrop(e, rightManagerEmail)}
                onDragStart={handleDragStart}
                draggedItem={draggedItem}
            />
        </div>
      </div>
    </div>
  );
}

// ... (ManagerPane component remains unchanged) ...
function ManagerPane({ side, allCustomers, selectedEmail, onSelect, reportees, onDrop, onDragStart, draggedItem }) {
    const selectedPerson = allCustomers.find(c => c.email === selectedEmail);
    const isDroppable = !!selectedEmail;
    
    // Highlight if we are dragging someone who isn't already in this list
    const isActiveDropTarget = draggedItem 
        && isDroppable 
        && draggedItem.originManagerEmail !== selectedEmail 
        && draggedItem.email !== selectedEmail;

    return (
        <div 
            className={`flex-1 flex flex-col h-full bg-gray-50/50 transition-colors ${isActiveDropTarget ? 'bg-blue-50/50' : ''}`}
            onDragOver={(e) => isDroppable ? e.preventDefault() : null} 
            onDrop={onDrop}
        >
            <div className="p-4 border-b bg-white shadow-sm z-10">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                    {side} Pane Manager
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <select 
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none appearance-none bg-white"
                        value={selectedEmail}
                        onChange={(e) => onSelect(e.target.value)}
                    >
                        <option value="">-- Select a Manager --</option>
                        {allCustomers
                            .sort((a,b) => (a.name||a.email).localeCompare(b.name||b.email))
                            .map(c => (
                            <option key={c.email} value={c.email}>
                                {c.name ? `${c.name} (${c.email})` : c.email}
                            </option>
                        ))}
                    </select>
                </div>
                
                {selectedPerson && (
                    <div className="mt-4 flex items-start gap-3 p-3 bg-gray-50 border rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold border border-teal-200 shrink-0">
                            {(selectedPerson.name || selectedPerson.email).substring(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-bold text-gray-900 truncate">{selectedPerson.name || selectedPerson.email}</div>
                            <div className="text-xs text-gray-500 truncate">{selectedPerson.designation || "No Designation"}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedEmail ? (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500">
                                Direct Reports ({reportees.length})
                            </span>
                            {isActiveDropTarget && (
                                <span className="text-xs text-blue-600 font-bold animate-pulse">
                                    Drop here to move
                                </span>
                            )}
                        </div>

                        {reportees.length === 0 ? (
                            <div className={`border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-gray-400 text-sm transition-colors ${isActiveDropTarget ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                                <User size={24} className="mb-2 opacity-50" />
                                <span>No direct reports</span>
                            </div>
                        ) : (
                            reportees.map(person => (
                                <div
                                    key={person.email}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, person, selectedEmail)}
                                    className="group flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-teal-300 cursor-grab active:cursor-grabbing transition-all select-none"
                                >
                                    <GripVertical className="text-gray-300 group-hover:text-gray-500" size={16} />
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100 shrink-0">
                                        {(person.name || person.email).substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-800 truncate">
                                            {person.name || person.email.split('@')[0]}
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate">
                                            {person.designation || "No Title"}
                                        </div>
                                    </div>
                                    <div className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        {(person.reportees || []).length} reps
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <ArrowRightLeft size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">Select a manager to view team</p>
                    </div>
                )}
            </div>
        </div>
    );
}