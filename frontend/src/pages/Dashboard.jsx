import React, { useState } from "react";
import DashboardContent from "./DashboardContent";
import AskAI from "./askAI";

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");

    return (
        <div className="p-4">

            {/* ===== HEADER ROW ===== */}
            <div className="flex justify-between items-center mb-4">

                {/* LEFT TITLE — DYNAMIC */}
                <h2 className="text-2xl font-bold text-gray-800">
                    {activeTab === "dashboard" ? "Dashboard" : "Ask AI"}
                </h2>

      

                {/* RIGHT TOGGLE */}
                <div className="flex items-center gap-3">

                    {/* Dashboard label */}
                    <span
                        className={`transition ${
                            activeTab === "dashboard"
                                ? "text-green-600 font-semibold"
                                : "text-gray-500"
                        }`}
                    >
                        Dashboard
                    </span>

                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={activeTab === "ai"}
                            onChange={() =>
                                setActiveTab(activeTab === "dashboard" ? "ai" : "dashboard")
                            }
                        />
                        <div className="w-12 h-6 bg-gray-300 rounded-full transition peer-checked:bg-black"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow
                            transition-transform peer-checked:translate-x-6">
                        </div>
                    </label>

                    {/* Ask AI label */}
                    <span
                        className={`transition ${
                            activeTab === "ai"
                                ? "text-green-600 font-semibold"
                                : "text-gray-500"
                        }`}
                    >
                        Ask AI
                    </span>
                </div>
            </div>

            {/* ===== CONTENT ===== */}
            {activeTab === "dashboard" && <DashboardContent />}
            {activeTab === "ai" && <AskAI />}
        </div>
    );
}
