import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, MessageSquare, Send, Clock, User, Loader2, History, Search } from "lucide-react"; // Added Search import
import api  from "../../api/api"; // Adjust path if needed

const SENTIMENTS = ["High", "Medium", "Low", "Unknown"];
const AWARENESS = ["Hold", "Email only", "Low", "Go Ahead", "Unknown"];

export default function ConversationModal({ isOpen, onClose, email, accountId, onSaveLog }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState(null);
  
  // Filter State
  const [filterText, setFilterText] = useState(""); // <--- NEW STATE

  // Form State
  const [note, setNote] = useState("");
  const [currentSentiment, setCurrentSentiment] = useState("Unknown");
  const [currentAwareness, setCurrentAwareness] = useState("Unknown");

  // Auth User
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const scrollRef = useRef(null);

  // Fetch Data on Open
  useEffect(() => {
    if (isOpen && email) {
      fetchCustomerData();
    } else {
      setNote("");
      setCustomer(null);
      setFilterText(""); // Reset filter on close
    }
  }, [isOpen, email]);

  // Scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [customer?.logHistory]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customer/${encodeURIComponent(email)}`);
      const data = res.data;
      setCustomer(data);
      setCurrentSentiment(data.sentiment || "Unknown");
      setCurrentAwareness(data.awareness || "Unknown");
    } catch (err) {
      console.error("Error fetching conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!note.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...customer, 
        accountId: accountId || customer.accountId,
        sentiment: currentSentiment,
        awareness: currentAwareness,
        logEntry: {
          summary: note.trim(),
          email: user?.email || "Unknown User",
          createdById: user?.id,
          sentiment: currentSentiment,
          awareness: currentAwareness
        }
      };

      const res = await api.put(`/customer/${encodeURIComponent(email)}`, payload);
      
      setCustomer(res.data);
      setNote("");
      if (onSaveLog) onSaveLog();

    } catch (err) {
      console.error("Failed to post note:", err);
      alert("Failed to save note.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Filtering Logic ---
  const filteredLogs = useMemo(() => {
    if (!customer?.logHistory) return [];
    if (!filterText.trim()) return customer.logHistory;

    return customer.logHistory.filter(log => 
      (log.email || "").toLowerCase().includes(filterText.toLowerCase())
    );
  }, [customer, filterText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare className="text-teal-600" size={20} />
                Conversation History
              </h2>
              {customer && (
                <p className="text-xs text-gray-500 mt-1">
                  with <span className="font-semibold">{customer.name || customer.email}</span> • {customer.designation}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
                type="text"
                placeholder="Filter logs by email..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 focus:border-teal-500 rounded-lg text-xs outline-none transition-all shadow-sm"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

        {/* Body (Logs List) */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6" ref={scrollRef}>
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 size={32} className="animate-spin mb-2 text-teal-500" />
              <p className="text-sm">Loading history...</p>
            </div>
          ) : !customer?.logHistory?.length ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <History size={48} className="mb-3" />
              <p className="text-sm">No conversations recorded yet.</p>
              <p className="text-xs">Start the discussion below.</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            /* Empty State for Filter */
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <Search size={48} className="mb-3" />
              <p className="text-sm">No logs found matching "{filterText}"</p>
              <button onClick={() => setFilterText("")} className="text-xs text-teal-600 hover:underline mt-2">Clear Filter</button>
            </div>
          ) : (
            <div className="space-y-6">
               {filteredLogs.map((log, idx) => (
                 <div key={idx} className="flex gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-200" title={log.email}>
                            {(log.email || "?").charAt(0).toUpperCase()}
                        </div>
                    </div>
                    
                    {/* Message Bubble */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            {/* Highlight the matched email if searching */}
                            <span className={`text-xs font-bold ${filterText ? 'text-teal-700 bg-teal-50 px-1 rounded' : 'text-gray-700'}`}>
                                {log.email?.split('@')[0]}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock size={10} />
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Just now"}
                            </span>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none p-3 shadow-sm text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {log.summary}
                        </div>
                        
                        {/* Context Badges */}
                        {(log.sentiment || log.awareness) && (
                            <div className="flex gap-2 mt-1.5 ml-1">
                                {log.sentiment && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSentimentColor(log.sentiment)}`}>
                                        {log.sentiment}
                                    </span>
                                )}
                                {log.awareness && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getAwarenessColor(log.awareness)}`}>
                                        {log.awareness}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Footer (Input Area) */}
        <div className="p-4 bg-white border-t border-gray-200">
           {/* Status Controls */}
           <div className="flex gap-4 mb-3">
              <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Sentiment</label>
                 <select 
                    value={currentSentiment} 
                    onChange={(e) => setCurrentSentiment(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-md py-1.5 px-2 focus:ring-1 focus:ring-teal-500 outline-none"
                    disabled={loading || submitting}
                 >
                    {SENTIMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
              <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Awareness</label>
                 <select 
                    value={currentAwareness} 
                    onChange={(e) => setCurrentAwareness(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-md py-1.5 px-2 focus:ring-1 focus:ring-teal-500 outline-none"
                    disabled={loading || submitting}
                 >
                    {AWARENESS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
           </div>

           {/* Text Area */}
           <div className="relative">
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type your notes here..."
                className="w-full border border-gray-300 rounded-lg p-3 pr-12 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                rows={3}
                disabled={loading || submitting}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
              />
              <button 
                onClick={handleSubmit}
                disabled={!note.trim() || submitting || loading}
                className="absolute right-2 bottom-2 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm"
                title="Send Note (Enter)"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
           </div>
           <div className="text-[10px] text-gray-400 mt-1 text-right">
              Press <b>Enter</b> to send
           </div>
        </div>
      </div>
    </div>
  );
}

// --- Helpers for Styling ---
function getSentimentColor(v) {
    switch (v) {
        case "High": return "bg-emerald-50 text-emerald-700 border-emerald-100";
        case "Medium": return "bg-amber-50 text-amber-700 border-amber-100";
        case "Low": return "bg-rose-50 text-rose-700 border-rose-100";
        default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
}

function getAwarenessColor(v) {
    switch (v) {
        case "Go Ahead": return "bg-green-50 text-green-700 border-green-100";
        case "Low": return "bg-blue-50 text-blue-700 border-blue-100";
        case "Hold": return "bg-red-50 text-red-700 border-red-100";
        default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
}