import React, { useMemo, useState } from "react";

/**
 * Props
 *  - customers
 *  - ceos (new) -> array of top-level nodes
 *  - focusEmail
 *  - upDepth
 *  - downDepth
 *  - connectors: "curved" | "straight"
 *  - variant: "compact" | "regular"
 *  - onSelect: fn(node)
 */

const SIZES = {
    compact: { NODE_W: 200, NODE_H: 72, H_GAP: 20, V_GAP: 44, PADDING: 8 },
    regular: { NODE_W: 240, NODE_H: 96, H_GAP: 28, V_GAP: 60, PADDING: 12 },
};

export default function OrgChart({
    customers = [],
    ceos = [],
    focusEmail,
    upDepth = 10,
    // remove restrictive downDepth by default — allow full traversal
    downDepth = Infinity,
    connectors = "curved",
    variant = "compact",
    onSelect,
}) {
    const SZ = SIZES[variant] || SIZES.compact;

    const [hoverNode, setHoverNode] = useState(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

    // Build scoped tree for the focused node
    const { root, ancestors } = useMemo(
        () => buildScopedTree(customers, focusEmail, upDepth, downDepth),
        [customers, focusEmail, upDepth, downDepth]
    );

    const layout = useMemo(() => computeLayout(root, SZ), [root, variant]);

    // Canvas width/height - ensure some minimum
    const width = Math.max(layout.width + 40, 760) + SZ.PADDING * 2;
    const height =
        layout.height + 40 + ancestors.length * (SZ.NODE_H + SZ.V_GAP) + SZ.PADDING * 2 + 140; // extra for CEO row

    const rootY = 100 + ancestors.length * (SZ.NODE_H + SZ.V_GAP); // leave space for CEO row

    const excludeEmails = new Set([
        root?.email?.toLowerCase() || "",
        ...ancestors.map(a => a.email.toLowerCase()),
    ]);

    return (
        <div className="w-full h-full overflow-auto">
            <div className="relative" style={{ width, height }}>

                {/* CEO Row (if any) */}
                {ceos && ceos.length > 0 && (
                    <div style={{ left: 0, top: 16 }} className="absolute w-full">
                        <div style={{ width: width }} className="flex items-center justify-center gap-4">
                            {ceos.map((c) => (
                                <div key={c.email} style={{ width: SZ.NODE_W }}>
                                    <div
                                        className="rounded-lg border bg-white p-3 text-center cursor-pointer"
                                        onClick={() => onSelect && onSelect(c)}
                                    >
                                        <div className="font-semibold text-teal-700 truncate">{c.name || emailHandle(c.email)}</div>
                                        <div className="text-xs text-gray-500">{c.designation}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Ancestors */}
                {ancestors.map((node, idx) => {
                    const x = width / 2 - SZ.NODE_W / 2;
                    const y = rootY - (ancestors.length - idx) * (SZ.NODE_H + SZ.V_GAP);
                    const curBottomX = x + SZ.NODE_W / 2;
                    const curBottomY = y + SZ.NODE_H;
                    const nextX = curBottomX;
                    const nextY = curBottomY + SZ.V_GAP;

                    return (
                        <React.Fragment key={`anc-${node.email}`}>
                            <NodeCard
                                node={node}
                                x={x}
                                y={y}
                                SZ={SZ}
                                onSelect={onSelect}
                                setHoverNode={setHoverNode}
                                setHoverPos={setHoverPos}
                            />

                            <svg className="absolute pointer-events-none" style={{ left: 0, top: 0 }} width={width} height={height}>
                                {connectors === "curved" ? (
                                    <path
                                        d={cubicPath(curBottomX, curBottomY, nextX, nextY)}
                                        fill="none"
                                        stroke="#CBD5E1"
                                        strokeWidth="2"
                                    />
                                ) : (
                                    <line
                                        x1={curBottomX}
                                        y1={curBottomY}
                                        x2={nextX}
                                        y2={nextY}
                                        stroke="#CBD5E1"
                                        strokeWidth="2"
                                    />
                                )}
                            </svg>
                        </React.Fragment>
                    );
                })}

                {/* Root */}
                {root && (
                    <NodeCard
                        node={root}
                        x={width / 2 - SZ.NODE_W / 2}
                        y={rootY}
                        highlight
                        SZ={SZ}
                        onSelect={onSelect}
                        setHoverNode={setHoverNode}
                        setHoverPos={setHoverPos}
                    />
                )}

                {/* Descendant connectors */}
                <TreeSVG
                    width={width}
                    height={height}
                    edges={layout.edges.map(e => ({
                        ...e,
                        y1: e.y1 + rootY - 20,
                        y2: e.y2 + rootY - 20,
                    }))}
                    connectors={connectors}
                />

                {/* Descendants */}
                {layout.nodes
                    .filter(n => !excludeEmails.has(n.node.email.toLowerCase()))
                    .map(n => (
                        <NodeCard
                            key={n.node.email}
                            node={n.node}
                            x={n.x}
                            y={n.y + rootY - 20}
                            SZ={SZ}
                            onSelect={onSelect}
                            setHoverNode={setHoverNode}
                            setHoverPos={setHoverPos}
                        />
                    ))}

                {/* HOVER TOOLTIP */}
                {hoverNode && (
                    <div
                        className="fixed z-50 bg-white border shadow-lg rounded-lg p-3 w-72 text-xs"
                        style={{ top: hoverPos.y, left: hoverPos.x }}
                    >
                        <div className="font-semibold mb-2 text-gray-700">Log History</div>

                        {hoverNode.logHistory?.length ? (
                            <div className="space-y-2 max-h-48 overflow-auto">
                                {hoverNode.logHistory.map((l, i) => (
                                    <div key={i} className="p-2 bg-gray-50 border rounded">
                                        <div className="text-gray-800 text-xs">{l.summary}</div>

                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                            <span>
                                                {l.timestamp
                                                    ? new Date(l.timestamp).toLocaleString()
                                                    : ""}
                                            </span>
                                            <span>{l.email}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-400 text-[11px] italic">
                                No logs
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* -------------------- Node Card (with hover handlers) -------------------- */
function NodeCard({
    node,
    x,
    y,
    SZ,
    highlight = false,
    onSelect,
    setHoverNode,
    setHoverPos,
}) {
    return (
       <div
  className={`absolute rounded-xl border shadow-sm bg-white cursor-pointer select-none ${
    node.isMatch ? "border-gray-300 text-gray-800" : "border-gray-200 text-gray-400 opacity-40"
  } ${highlight ? "ring-2 ring-teal-400" : ""}`}

            style={{ left: x, top: y, width: SZ.NODE_W, height: SZ.NODE_H }}
            onClick={() => onSelect && onSelect(node)}
            onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverPos({ x: rect.right + 10, y: rect.top });
                setHoverNode(node);
            }}
            onMouseLeave={() => setHoverNode(null)}
            role="button"
            aria-label={`Select ${node.name || node.email}`}
        >
            <div className="h-full flex flex-col justify-between" style={{ padding: SZ.PADDING }}>
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-teal-700 truncate max-w-[70%]">
                        {node.name || emailHandle(node.email) || "—"}
                    </div>
                    <Badge value={node.sentiment || "Unknown"} />
                    <TypeIcon type={node.type} />
                </div>

                <div className="text-[11px] text-gray-600 truncate leading-tight">
                    {node.designation || "—"}
                </div>

                <div className="text-[10px] text-gray-500 truncate leading-tight">
                    {node.email}
                </div>
            </div>
        </div>
    );
}

/* ---------------- Icons, Badges ---------------- */
function TypeIcon({ type }) {
    if (!type) return null;
    if (["businessChampion", "economicBuyer"].includes(type))
        return <span className="ml-1 text-yellow-500">💵</span>;
    if (["techChampion", "coach"].includes(type))
        return <span className="ml-1 text-yellow-500">👑</span>;
    if (type === "influential") return <span className="ml-1 text-blue-500">⭐</span>;
    return null;
}

function Badge({ value }) {
    const cls =
        {
            High: "bg-green-50 text-green-700 border-green-200",
            Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
            Low: "bg-red-50 text-red-700 border-red-200",
            Unknown: "bg-gray-50 text-gray-600 border-gray-200",
        }[value] || "bg-gray-50 text-gray-600 border-gray-200";

    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cls}`}>
            {value}
        </span>
    );
}

/* ------------------- SVG connectors ------------------- */
function TreeSVG({ width, height, edges, connectors }) {
    return (
        <svg className="absolute pointer-events-none" width={width} height={height} style={{ left: 0, top: 0 }}>
            {edges.map((e, idx) =>
                connectors === "curved" ? (
                    <path
                        key={idx}
                        d={cubicPath(e.x1, e.y1, e.x2, e.y2)}
                        fill="none"
                        stroke="#CBD5E1"
                        strokeWidth="2"
                    />
                ) : (
                    <line
                        key={idx}
                        x1={e.x1}
                        y1={e.y1}
                        x2={e.x2}
                        y2={e.y2}
                        stroke="#CBD5E1"
                        strokeWidth="2"
                    />
                )
            )}
        </svg>
    );
}

/* ---------------------- Tree Builder ---------------------- */
function buildScopedTree(customers, focusEmail, upDepth, downDepth) {
    const map = new Map();
    customers.forEach((c) =>
        map.set(String(c.email).toLowerCase(), normalizeNode(c))
    );

    const focus = map.get(String(focusEmail || "").toLowerCase());
    if (!focus) return { root: null, ancestors: [] };

    const ancestors = [];
    let mgrEmail = focus.reportingTo?.[0];

    for (let d = 0; d < upDepth; d++) {
        if (!mgrEmail) break;
        const manager = map.get(String(mgrEmail).toLowerCase());
        if (!manager) break;
        ancestors.unshift(manager);
        mgrEmail = manager.reportingTo?.[0];
    }

    const root = cloneNode(focus);
    const visited = new Set([
        root.email.toLowerCase(),
        ...ancestors.map(a => a.email.toLowerCase())
    ]);

    const build = (n) => {
        // no depth-based stopping (downDepth default is Infinity)
        const kids = (n.reportees || [])
            .map(e => String(e).toLowerCase())
            .filter(email => email && !visited.has(email))
            .map(email => map.get(email))
            .filter(Boolean)
            .map(child => {
                visited.add(child.email.toLowerCase());
                return cloneNode(child);
            });

        n.children = kids;
        kids.forEach(k => build(k));
    };

    build(root);
    return { root, ancestors };
}

function normalizeNode(n) {
    return {
        email: n.email,
        name: n.name || "",
        designation: n.designation || "",
        sentiment: n.sentiment || "Unknown",
        awareness: n.awareness || "Unknown",
        type: n.type || "unknown",
        decisionMaker: !!n.decisionMaker,
        reportingTo: Array.isArray(n.reportingTo) ? n.reportingTo : [],
        reportees: Array.isArray(n.reportees) ? n.reportees : [],
        businessUnit: Array.isArray(n.businessUnit) ? n.businessUnit : [],
        logHistory: Array.isArray(n.logHistory) ? n.logHistory : []
    };
}

function cloneNode(n) {
    return { ...normalizeNode(n) };
}

/* -------------------- Layout engine -------------------- */
function computeLayout(root, SZ) {
    if (!root) return { nodes: [], edges: [], width: 0, height: 0 };

    const nodes = [];
    const edges = [];

    function measure(n) {
        if (!n.children || n.children.length === 0) {
            n._subtreeWidth = SZ.NODE_W;
            return n._subtreeWidth;
        }
        const childWidths =
            n.children.map(measure);
        const total =
            childWidths.reduce((a, b) => a + b, 0) +
            SZ.H_GAP * (n.children.length - 1);
        n._subtreeWidth = Math.max(SZ.NODE_W, total);
        return n._subtreeWidth;
    }

    function place(n, x, y) {
        if (!n.children || n.children.length === 0) return;

        const totalChildrenWidth =
            n.children.reduce((a, b) => a + b._subtreeWidth, 0) +
            SZ.H_GAP * (n.children.length - 1);

        let cursorX = x + (SZ.NODE_W - totalChildrenWidth) / 2;
        const childY = y + SZ.NODE_H + SZ.V_GAP;

        n.children.forEach(c => {
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
        });
    }

    const totalW = measure(root);
    const rootX = totalW / 2 - SZ.NODE_W / 2 + 20;
    const rootY = 20;

    place(root, rootX, rootY);

    const chartHeight =
        (nodes.length
            ? Math.max(...nodes.map(n => n.y))
            : rootY) + SZ.NODE_H + 40;

    return { nodes, edges, width: totalW + 40, height: chartHeight };
}

/* -------------------- Paths -------------------- */
function cubicPath(x1, y1, x2, y2) {
    const dy = (y2 - y1) * 0.45;
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

/* -------------------- Utils -------------------- */
function emailHandle(email) {
    if (!email) return "";
    return String(email).split("@")[0];
}
