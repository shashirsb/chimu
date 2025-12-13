import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ScatterChart,
    Scatter
} from "recharts";
import api from "../api/api";
import "react-circular-progressbar/dist/styles.css";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
const REGIONS = ["All", "Global", "APAC", "EMEA"];
const PERIODS = ["All", "Weekly", "Monthly", "Quarterly", "Half-Yearly"];

export default function DashboardContent() {
    const [wigs, setWigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [regionFilter, setRegionFilter] = useState("All");
    const [periodFilter, setPeriodFilter] = useState("All");
    const [accountFilter, setAccountFilter] = useState("All"); // 🆕 New state for Account filter
    const [userMap, setUserMap] = useState({});
    const [uniqueAccounts, setUniqueAccounts] = useState([]); // 🆕 New state for unique account names

    useEffect(() => {
        const fetchWigs = async () => {
            try {
                const res = await api.get("/wigs");
                setWigs(res.data);
                setLoading(false);
                
                // 🆕 Extract unique account names for the filter dropdown
                const accounts = [...new Set(
                    res.data
                        .map(w => w.accountId?.name)
                        .filter(name => name)
                )].sort();
                setUniqueAccounts(accounts);
                
            } catch (err) {
                console.error("Error fetching WIGs", err);
                setLoading(false);
            }
        };

        const fetchUsers = async () => {
            try {
                const res = await api.get("/users");
                const map = {};
                res.data.forEach(u => (map[u._id] = u.displayName));
                setUserMap(map);
            } catch (err) {
                console.error("Error fetching users", err);
            }
        };

        fetchWigs();
        fetchUsers();
    }, []);

    if (loading)
        return (
            <p className="text-center mt-10 text-xl font-semibold text-gray-600">
                Loading dashboard...
            </p>
        );

    // ===============================
    //         FILTERED DATA
    // ===============================
    const filteredWigs = wigs.filter(w => {
        const regionMatch = regionFilter === "All" || w.region === regionFilter;
        const periodMatch =
            periodFilter === "All" ||
            w.validityPeriod?.type?.toLowerCase() === periodFilter.toLowerCase();
        
        // 🆕 Account Filter Logic
        const accountMatch = 
            accountFilter === "All" || 
            (w.accountId?.name === accountFilter);
            
        return regionMatch && periodMatch && accountMatch; // 🆕 Combined filters
    });

    // ===============================
    //     INSIGHT CALCULATIONS
    // ===============================
    const totalWigs = filteredWigs.length;

    // Status counts
    const statusCounts = filteredWigs.reduce((acc, wig) => {
        acc[wig.status] = (acc[wig.status] || 0) + 1;
        return acc;
    }, {});

    const onTrack = statusCounts["on_track"] || 0;
    const onTrackPct = totalWigs ? Math.round((onTrack / totalWigs) * 100) : 0;

    const avgProgress = totalWigs
        ? Math.round(
            filteredWigs.reduce((sum, w) => sum + (w.progress || 0), 0) / totalWigs
        )
        : 0;

    // Owner Workload
    const ownerDistribution = filteredWigs.reduce((acc, wig) => {
        const createdByName = wig.createdById?.displayName || wig.createdById || "Unknown";
        acc[createdByName] = (acc[createdByName] || 0) + 1;
        return acc;
    }, {});
    
    // Sorted data for Top Owners by WIG Count
    const ownerChartData = Object.entries(ownerDistribution)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const topOwner = ownerChartData[0] || { name: "N/A", count: 0 };


    // Most risky account
    const riskyAccountMap = filteredWigs
        .filter(w => w.status === "off_track")
        .reduce((acc, w) => {
            const name = w.accountId?.name || "Unknown";
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});

    const topRiskyAccount =
        Object.keys(riskyAccountMap).length > 0
            ? Object.entries(riskyAccountMap).sort((a, b) => b[1] - a[1])[0][0]
            : "None";

    const assignedToDistribution = {};

    filteredWigs.forEach(wig => {
        const measures = [...(wig.lagMeasures || []), ...(wig.leadMeasures || [])];

        measures.forEach(m => {
            if (Array.isArray(m.assignedTo) && m.assignedTo.length > 0) {
                m.assignedTo.forEach(a => {
                    const assignedId = a._id?.$oid || a._id;
                    const assignedName = userMap[assignedId] || a.name || "Unknown";
                    assignedToDistribution[assignedName] =
                        (assignedToDistribution[assignedName] || 0) + 1;
                });
            } else {
                assignedToDistribution["Unassigned"] =
                    (assignedToDistribution["Unassigned"] || 0) + 1;
            }
        });
    });


    const assignedToData = Object.entries(assignedToDistribution).map(([name, count]) => ({
        name,
        count
    }));
    
    // Sorted data for WIGs Assigned to Users
    const assignedToChartData = assignedToData.sort((a, b) => b.count - a.count);

    // Pie Chart Data: WIG Distribution by Account
    const accountDistribution = filteredWigs.reduce((acc, wig) => {
        const name = wig.accountId?.name || "Unknown";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});
    const pieChartData = Object.entries(accountDistribution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort descending


    // Histogram for progress distribution
    const histogramBuckets = [0, 20, 40, 60, 80, 100];
    const histogramData = histogramBuckets
        .map((b, i) => {
            const lower = b;
            const upper = histogramBuckets[i + 1] || 100;
            return {
                range: `${lower}-${upper}%`,
                count: filteredWigs.filter(
                    w =>
                        (w.progress || 0) >= lower &&
                        (w.progress || 0) < upper
                ).length
            };
        })
        .filter(d => d.count > 0);

    // Scatter Chart Data
    const scatterData = filteredWigs.map(w => ({
        title: w.title,
        lagTotal: (w.lagMeasures || []).reduce(
            (sum, m) => sum + (m.currentValue || 0),
            0
        ),
        leadTotal: (w.leadMeasures || []).reduce(
            (sum, m) => sum + (m.currentValue || 0),
            0
        )
    }));

    // AI summary
    const aiSummary = `
Across ${totalWigs} WIGs, ${onTrackPct}% are on track.
Average progress is ${avgProgress}%.
${topOwner.name} owns the highest number of WIGs (${topOwner.count}).
Most at-risk account: ${topRiskyAccount}.
    `;

    return (
        
        <div className="p-8 space-y-12 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">

            {/* ========= FILTERS ========= */}
            <div className="flex gap-6 flex-wrap">
                {/* Region Filter */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-600 mb-1">
                        Region
                    </label>
                    <select
                        value={regionFilter}
                        onChange={e => setRegionFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white shadow border border-gray-200 focus:ring-2 focus:ring-blue-400"
                    >
                        {REGIONS.map(r => (
                            <option key={r}>{r}</option>
                        ))}
                    </select>
                </div>

                {/* Period Filter */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-600 mb-1">
                        Period
                    </label>
                    <select
                        value={periodFilter}
                        onChange={e => setPeriodFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white shadow border border-gray-200 focus:ring-2 focus:ring-blue-400"
                    >
                        {PERIODS.map(p => (
                            <option key={p}>{p}</option>
                        ))}
                    </select>
                </div>
                
                {/* 🆕 Account Filter */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-600 mb-1">
                        Account
                    </label>
                    <select
                        value={accountFilter}
                        onChange={e => setAccountFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white shadow border border-gray-200 focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="All">All Accounts</option>
                        {uniqueAccounts.map(a => (
                            <option key={a}>{a}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ========= INSIGHT CARDS ========= */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                <div className="bg-white p-6 rounded-2xl shadow border">
                    <h3 className="text-sm text-gray-500">On Track %</h3>
                    <p className="text-3xl font-bold text-green-600">{onTrackPct}%</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow border">
                    <h3 className="text-sm text-gray-500">Avg Progress</h3>
                    <p className="text-3xl font-bold text-blue-600">{avgProgress}%</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow border">
                    <h3 className="text-sm text-gray-500">Most Loaded Owner</h3>
                    <p className="text-lg font-semibold">{topOwner.name}</p>
                    <p className="text-gray-600 text-sm">{topOwner.count} WIGs</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow border">
                    <h3 className="text-sm text-gray-500">Most Risky Account</h3>
                    <p className="text-lg font-semibold">{topRiskyAccount}</p>
                </div>

            </div>

            {/* ========= AI INSIGHTS PANEL ========= */}
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-6 rounded-2xl shadow border">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    AI Insights
                </h2>
                <p className="text-gray-700 whitespace-pre-line">{aiSummary}</p>
            </div>

            {/* ========= CHARTS ========= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                {/* Lag vs Lead */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                    <h3 className="text-xl font-semibold mb-4">
                        Lag vs Lead Measures per WIG
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredWigs.map(w => ({
                            title: w.title,
                            lagCount: w.lagMeasures?.length || 0,
                            leadCount: w.leadMeasures?.length || 0
                        }))}>
                            <XAxis dataKey="title" interval={0} angle={-30} textAnchor="end" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="lagCount" fill="#0088FE" />
                            <Bar dataKey="leadCount" fill="#00C49F" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                    <h3 className="text-xl font-semibold mb-4">WIG Distribution by Account</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieChartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {pieChartData.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Owners */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                    <h3 className="text-xl font-semibold mb-4">Top Owners by WIG Count</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={ownerChartData}
                        >
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#FF8042" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Assigned To */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                    <h3 className="text-xl font-semibold mb-4">WIGs Assigned to Users</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={assignedToChartData}>
                            <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#FFBB28" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Histogram */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                    <h3 className="text-xl font-semibold mb-4">WIG Progress Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={histogramData}>
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#00C49F" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Scatter Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                    <h3 className="text-xl font-semibold mb-4">
                        Lag vs Lead Measure Progress
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart>
                            <XAxis type="number" dataKey="lagTotal" />
                            <YAxis type="number" dataKey="leadTotal" />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                            <Scatter data={scatterData} fill="#0088FE" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
}