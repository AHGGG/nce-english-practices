import React, { useState } from 'react';

const TenseTimeline = ({ tense, complexity = "high" }) => {
    const [hoveredEvent, setHoveredEvent] = useState(null);

    // Timeline configuration based on tense
    const getTimelineConfig = (tenseName) => {
        const configs = {
            "Present Perfect": {
                events: [
                    { label: "Past Action", time: -3, color: "var(--color-accent-danger)", type: "point", tooltip: "Action happened in the past" },
                    { label: "Effect Continues", time: 0, color: "var(--color-accent-primary)", type: "range", start: -3, end: 1, tooltip: "Relevance extends to now" }
                ],
                formula: "have/has + V3",
                description: "Links past action to present relevance"
            },
            "Past Perfect": {
                events: [
                    { label: "Earlier Past", time: -4, color: "var(--color-accent-danger)", type: "point", tooltip: "First action completed" },
                    { label: "Later Past", time: -1, color: "var(--color-accent-info)", type: "point", tooltip: "Second action (reference point)" }
                ],
                formula: "had + V3",
                description: "Action completed before another past action"
            },
            "Future Perfect": {
                events: [
                    { label: "Future Point", time: 3, color: "var(--color-accent-info)", type: "point", tooltip: "Reference time in future" },
                    { label: "Completion", time: 2, color: "var(--color-accent-primary)", type: "point", tooltip: "Action completes before reference time" }
                ],
                formula: "will have + V3",
                description: "Action will be completed before a future time"
            }
        };

        return configs[tenseName] || {
            events: [{ label: "Now", time: 0, color: "var(--color-text-muted)", type: "marker" }],
            formula: "N/A",
            description: "Timeline visualization"
        };
    };

    const config = getTimelineConfig(tense);

    // SVG dimensions
    const width = 600;
    const height = 200;
    const centerY = height / 2;
    const padding = 80;
    const timelineWidth = width - 2 * padding;

    // Map time to X coordinate (-5 to +5 range)
    const timeToX = (time) => padding + (time + 5) * (timelineWidth / 10);

    // Filter events for L2 (simplified - only show key points, no ranges)
    const eventsToShow = complexity === "medium"
        ? config.events.filter(e => e.type === "point")
        : config.events;

    return (
        <div className="w-full max-w-3xl bg-bg-surface border border-border rounded-xl p-6">
            {/* Header */}
            <div className="mb-6">
                <h3 className="font-serif text-2xl text-white mb-2">{tense}</h3>
                <p className="text-sm text-text-secondary mb-1">{config.description}</p>
                <code className="text-xs bg-bg-elevated border border-border px-2 py-1 rounded text-neon-green font-mono">
                    {config.formula}
                </code>
            </div>

            {/* SVG Timeline */}
            <svg width={width} height={height} className="w-full">
                {/* Timeline Base Line */}
                <line
                    x1={padding}
                    y1={centerY}
                    x2={width - padding}
                    y2={centerY}
                    stroke="var(--color-border)"
                    strokeWidth="2"
                />

                {/* Arrow */}
                <polygon
                    points={`${width - padding},${centerY} ${width - padding - 10},${centerY - 5} ${width - padding - 10},${centerY + 5}`}
                    fill="var(--color-border)"
                />

                {/* "Now" marker at center */}
                <line
                    x1={timeToX(0)}
                    y1={centerY - 30}
                    x2={timeToX(0)}
                    y2={centerY + 30}
                    stroke="var(--color-text-muted)"
                    strokeWidth="2"
                    strokeDasharray="4"
                />
                <text
                    x={timeToX(0)}
                    y={centerY - 40}
                    fill="var(--color-text-muted)"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                >
                    NOW
                </text>

                {/* Events */}
                {eventsToShow.map((event, idx) => {
                    if (event.type === "point") {
                        const isHovered = hoveredEvent === idx && complexity === "high";
                        return (
                            <g key={idx}>
                                <circle
                                    cx={timeToX(event.time)}
                                    cy={centerY}
                                    r={isHovered ? "12" : "8"}
                                    fill={event.color}
                                    className={complexity === "high" ? "cursor-pointer transition-all" : "animate-pulse"}
                                    onMouseEnter={() => complexity === "high" && setHoveredEvent(idx)}
                                    onMouseLeave={() => complexity === "high" && setHoveredEvent(null)}
                                    style={{ transition: "r 0.2s" }}
                                />
                                <text
                                    x={timeToX(event.time)}
                                    y={centerY + 40}
                                    fill={event.color}
                                    fontSize="12"
                                    textAnchor="middle"
                                    fontWeight="bold"
                                >
                                    {event.label}
                                </text>
                                {/* Tooltip for L3 */}
                                {isHovered && event.tooltip && (
                                    <g>
                                        <rect
                                            x={timeToX(event.time) - 70}
                                            y={centerY - 60}
                                            width="140"
                                            height="30"
                                            fill="var(--color-bg-elevated)"
                                            stroke={event.color}
                                            strokeWidth="1"
                                            rx="4"
                                        />
                                        <text
                                            x={timeToX(event.time)}
                                            y={centerY - 40}
                                            fill="white"
                                            fontSize="10"
                                            textAnchor="middle"
                                        >
                                            {event.tooltip}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    } else if (event.type === "range" && complexity === "high") {
                        return (
                            <g key={idx}>
                                <rect
                                    x={timeToX(event.start)}
                                    y={centerY - 8}
                                    width={timeToX(event.end) - timeToX(event.start)}
                                    height="16"
                                    fill={event.color}
                                    opacity="0.3"
                                    rx="4"
                                />
                                <text
                                    x={timeToX((event.start + event.end) / 2)}
                                    y={centerY - 20}
                                    fill={event.color}
                                    fontSize="11"
                                    textAnchor="middle"
                                    fontStyle="italic"
                                >
                                    {event.label}
                                </text>
                            </g>
                        );
                    }
                    return null;
                })}

                {/* Time labels */}
                <text x={padding} y={centerY + 60} fill="var(--color-text-muted)" fontSize="10" textAnchor="middle">PAST</text>
                <text x={width - padding} y={centerY + 60} fill="var(--color-text-muted)" fontSize="10" textAnchor="middle">FUTURE</text>
            </svg>

            {complexity !== "medium" && (
                <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-xs text-text-muted font-mono">
                        💡 <span className="text-text-secondary">Hover over timeline points to see detailed explanations</span>
                    </p>
                </div>
            )}
            {complexity === "medium" && (
                <div className="mt-4 bg-bg-elevated border border-border rounded p-3">
                    <p className="text-xs text-neon-cyan mb-2 font-mono uppercase tracking-wider">Level 2 View (Simplified)</p>
                    <p className="text-xs text-text-secondary">Key events only. Upgrade to Level 3 for full timeline + interactive tooltips.</p>
                </div>
            )}
        </div>
    );
};

export default TenseTimeline;
