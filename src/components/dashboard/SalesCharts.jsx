import React, { useState } from 'react';
import { formatCurrency } from '../../lib/utils';

// Helper to construct a smooth Catmull-Rom / cubic bezier path through 2D points
function getSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function SalesCharts({ dailyData = [], weeklyData = [], monthlyData = [], currency = '₹' }) {
  const [hoveredDaily, setHoveredDaily] = useState(null);
  const [hoveredWeekly, setHoveredWeekly] = useState(null);
  const [hoveredMonthly, setHoveredMonthly] = useState(null);

  // 1. Daily Sales Scaling (7 Days)
  const dailyMaxVal = Math.max(...dailyData.map((d) => d.value), 0);
  const dailyTop = dailyMaxVal === 0 ? 90 : Math.max(90, Math.ceil(dailyMaxVal * 1.15 / 10) * 10);
  const dailyTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].filter((t) => t <= dailyTop);
  if (dailyTicks[dailyTicks.length - 1] !== dailyTop) dailyTicks.push(dailyTop);

  const dailyW = 520;
  const dailyH = 200;
  const dailyPadL = 36;
  const dailyPadR = 20;
  const dailyPadT = 20;
  const dailyPadB = 30;
  const dailyChartW = dailyW - dailyPadL - dailyPadR;
  const dailyChartH = dailyH - dailyPadT - dailyPadB;

  const dailyPoints = dailyData.map((d, i) => {
    const x = dailyPadL + (i / Math.max(dailyData.length - 1, 1)) * dailyChartW;
    const y = dailyPadT + dailyChartH - (d.value / dailyTop) * dailyChartH;
    return { x, y, ...d };
  });

  const dailyLinePath = getSplinePath(dailyPoints);
  const dailyAreaPath = dailyPoints.length > 0
    ? `${dailyLinePath} L ${dailyPoints[dailyPoints.length - 1].x.toFixed(1)} ${(dailyPadT + dailyChartH).toFixed(1)} L ${dailyPoints[0].x.toFixed(1)} ${(dailyPadT + dailyChartH).toFixed(1)} Z`
    : '';

  // 2. Weekly Sales Scaling (4 Weeks)
  const weeklyMaxVal = Math.max(...weeklyData.map((w) => w.value), 0);
  const weeklyTop = weeklyMaxVal === 0 ? 90 : Math.max(90, Math.ceil(weeklyMaxVal * 1.15 / 10) * 10);
  const weeklyTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].filter((t) => t <= weeklyTop);
  if (weeklyTicks[weeklyTicks.length - 1] !== weeklyTop) weeklyTicks.push(weeklyTop);

  const weeklyW = 520;
  const weeklyH = 200;
  const weeklyPadL = 36;
  const weeklyPadR = 20;
  const weeklyPadT = 20;
  const weeklyPadB = 30;
  const weeklyChartW = weeklyW - weeklyPadL - weeklyPadR;
  const weeklyChartH = weeklyH - weeklyPadT - weeklyPadB;

  // 3. Monthly Sales Scaling (12 Months)
  const monthlyMaxVal = Math.max(...monthlyData.map((m) => m.value), 0);
  const monthlyTop = monthlyMaxVal === 0 ? 180 : Math.max(180, Math.ceil(monthlyMaxVal * 1.15 / 20) * 20);
  const monthlyTicks = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180].filter((t) => t <= monthlyTop);
  if (monthlyTicks[monthlyTicks.length - 1] !== monthlyTop) monthlyTicks.push(monthlyTop);

  const monthlyW = 1040;
  const monthlyH = 220;
  const monthlyPadL = 40;
  const monthlyPadR = 30;
  const monthlyPadT = 25;
  const monthlyPadB = 30;
  const monthlyChartW = monthlyW - monthlyPadL - monthlyPadR;
  const monthlyChartH = monthlyH - monthlyPadT - monthlyPadB;

  const monthlyPoints = monthlyData.map((m, i) => {
    const x = monthlyPadL + (i / Math.max(monthlyData.length - 1, 1)) * monthlyChartW;
    const y = monthlyPadT + monthlyChartH - (m.value / monthlyTop) * monthlyChartH;
    return { x, y, ...m };
  });

  const monthlyLinePath = getSplinePath(monthlyPoints);
  const monthlyAreaPath = monthlyPoints.length > 0
    ? `${monthlyLinePath} L ${monthlyPoints[monthlyPoints.length - 1].x.toFixed(1)} ${(monthlyPadT + monthlyChartH).toFixed(1)} L ${monthlyPoints[0].x.toFixed(1)} ${(monthlyPadT + monthlyChartH).toFixed(1)} Z`
    : '';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Charts Row: Daily Sales & Weekly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Daily Sales Card */}
        <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1E293B] dark:text-white text-base tracking-tight">
              Daily Sales
            </h3>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              Last 7 Days
            </span>
          </div>

          <div className="relative w-full aspect-[2.6/1]">
            <svg
              viewBox={`0 0 ${dailyW} ${dailyH}`}
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="dailyBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {dailyTicks.map((tick) => {
                const y = dailyPadT + dailyChartH - (tick / dailyTop) * dailyChartH;
                return (
                  <g key={`daily-tick-${tick}`}>
                    <line
                      x1={dailyPadL}
                      y1={y}
                      x2={dailyW - dailyPadR}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#E2E8F0] dark:text-[#334155]"
                      strokeWidth="1"
                    />
                    <text
                      x={dailyPadL - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-mono"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Dates */}
              {dailyPoints.map((pt, i) => (
                <text
                  key={`daily-x-${i}`}
                  x={pt.x}
                  y={dailyH - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-medium"
                >
                  {pt.label}
                </text>
              ))}

              {/* Gradient Area Fill */}
              {dailyAreaPath && (
                <path d={dailyAreaPath} fill="url(#dailyBlueGrad)" />
              )}

              {/* Curved Line */}
              {dailyLinePath && (
                <path
                  d={dailyLinePath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-chart-line"
                />
              )}

              {/* Data Points */}
              {dailyPoints.map((pt, i) => (
                <g key={`daily-pt-${i}`} className="cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredDaily === i ? 6 : 4}
                    className="fill-[#059669] stroke-white dark:stroke-[#111A18] stroke-2 transition-all duration-150"
                    onMouseEnter={() => setHoveredDaily(i)}
                    onMouseLeave={() => setHoveredDaily(null)}
                  />
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredDaily !== null && dailyPoints[hoveredDaily] && (
              <div
                className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-[#0A1110] text-white border border-[#1E2E2A] text-xs py-1.5 px-3 rounded-lg shadow-xl animate-fade-in transition-all duration-150 ease-out"
                style={{
                  left: `${(dailyPoints[hoveredDaily].x / dailyW) * 100}%`,
                  top: `${(dailyPoints[hoveredDaily].y / dailyH) * 100 - 6}%`,
                }}
              >
                <div className="font-bold">{dailyPoints[hoveredDaily].label}</div>
                <div className="font-mono text-[#16A34A]">
                  {formatCurrency(dailyPoints[hoveredDaily].value, currency)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Sales Card */}
        <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1E293B] dark:text-white text-base tracking-tight">
              Weekly Sales
            </h3>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-[#0A1110] text-[#16A34A] dark:text-[#4ADE80] border border-emerald-200/70 dark:border-[#1E2E2A]">
              Last 4 Weeks
            </span>
          </div>

          <div className="relative w-full aspect-[2.6/1]">
            <svg
              viewBox={`0 0 ${weeklyW} ${weeklyH}`}
              className="w-full h-full overflow-visible"
            >
              {/* Horizontal Gridlines & Y-Axis Labels */}
              {weeklyTicks.map((tick) => {
                const y = weeklyPadT + weeklyChartH - (tick / weeklyTop) * weeklyChartH;
                return (
                  <g key={`weekly-tick-${tick}`}>
                    <line
                      x1={weeklyPadL}
                      y1={y}
                      x2={weeklyW - weeklyPadR}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#E2E8F0] dark:text-[#1E2E2A]"
                      strokeWidth="1"
                    />
                    <text
                      x={weeklyPadL - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-mono"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Bar Chart Bars */}
              {weeklyData.map((item, i) => {
                const totalBars = weeklyData.length;
                const slotW = weeklyChartW / totalBars;
                const barW = Math.min(slotW * 0.72, 180);
                const x = weeklyPadL + i * slotW + (slotW - barW) / 2;
                const barHeight = (item.value / weeklyTop) * weeklyChartH;
                const y = weeklyPadT + weeklyChartH - barHeight;

                return (
                  <g key={`weekly-bar-${i}`}>
                    {/* X-Axis Week Label */}
                    <text
                      x={x + barW / 2}
                      y={weeklyH - 8}
                      textAnchor="middle"
                      className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-medium font-mono"
                    >
                      {item.label}
                    </text>

                    {/* Bar rectangle */}
                    <rect
                      x={x}
                      y={barHeight > 0 ? y : weeklyPadT + weeklyChartH - 2}
                      width={barW}
                      height={Math.max(barHeight, 2)}
                      rx="6"
                      className="fill-[#16A34A] hover:fill-[#15803D] cursor-pointer transition-all duration-150 animate-bar-rise"
                      style={{ animationDelay: `${i * 75}ms` }}
                      onMouseEnter={() => setHoveredWeekly(i)}
                      onMouseLeave={() => setHoveredWeekly(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip for Weekly */}
            {hoveredWeekly !== null && weeklyData[hoveredWeekly] && (
              <div
                className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-[#0A1110] text-white text-xs py-1.5 px-3 rounded-lg shadow-xl animate-fade-in transition-all duration-150 ease-out"
                style={{
                  left: `${((weeklyPadL + (hoveredWeekly + 0.5) * (weeklyChartW / weeklyData.length)) / weeklyW) * 100}%`,
                  top: '30%',
                }}
              >
                <div className="font-bold">{weeklyData[hoveredWeekly].label}</div>
                <div className="font-mono text-[#16A34A]">
                  {formatCurrency(weeklyData[hoveredWeekly].value, currency)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chart: Monthly Sales (Full Width) */}
      <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[#1E293B] dark:text-white text-base tracking-tight">
            Monthly Sales
          </h3>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-teal-50 dark:bg-[#0A1110] text-[#14B8A6] dark:text-[#2DD4BF] border border-[#14B8A6]/20 dark:border-[#1E2E2A]">
            Monthly Growth
          </span>
        </div>

        <div className="relative w-full aspect-[4.2/1]">
          <svg
            viewBox={`0 0 ${monthlyW} ${monthlyH}`}
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="monthlyTealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {monthlyTicks.map((tick) => {
              const y = monthlyPadT + monthlyChartH - (tick / monthlyTop) * monthlyChartH;
              return (
                <g key={`monthly-tick-${tick}`}>
                  <line
                    x1={monthlyPadL}
                    y1={y}
                    x2={monthlyW - monthlyPadR}
                    y2={y}
                    stroke="currentColor"
                    className="text-[#E2E8F0] dark:text-[#334155]"
                    strokeWidth="1"
                  />
                  <text
                    x={monthlyPadL - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-mono"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Month Labels */}
            {monthlyPoints.map((pt, i) => (
              <text
                key={`monthly-x-${i}`}
                x={pt.x}
                y={monthlyH - 8}
                textAnchor="middle"
                className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-medium"
              >
                {pt.label}
              </text>
            ))}

            {/* Gradient Area Fill */}
            {monthlyAreaPath && (
              <path d={monthlyAreaPath} fill="url(#monthlyTealGrad)" />
            )}

            {/* Curved Line */}
            {monthlyLinePath && (
              <path
                d={monthlyLinePath}
                fill="none"
                stroke="#14B8A6"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="animate-chart-line"
              />
            )}

            {/* Data Points */}
            {monthlyPoints.map((pt, i) => (
              <g key={`monthly-pt-${i}`} className="cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredMonthly === i ? 6 : 4}
                  className="fill-[#14B8A6] stroke-white dark:stroke-[#1E293B] stroke-2 transition-all duration-150"
                  onMouseEnter={() => setHoveredMonthly(i)}
                  onMouseLeave={() => setHoveredMonthly(null)}
                />
              </g>
            ))}
          </svg>

          {/* Hover Tooltip for Monthly */}
          {hoveredMonthly !== null && monthlyPoints[hoveredMonthly] && (
            <div
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-[#1E293B] text-white text-xs py-1.5 px-3 rounded-lg shadow-xl animate-fade-in transition-all duration-150 ease-out"
              style={{
                left: `${(monthlyPoints[hoveredMonthly].x / monthlyW) * 100}%`,
                top: `${(monthlyPoints[hoveredMonthly].y / monthlyH) * 100 - 6}%`,
              }}
            >
              <div className="font-bold">{monthlyPoints[hoveredMonthly].label}</div>
              <div className="font-mono text-[#14B8A6]">
                {formatCurrency(monthlyPoints[hoveredMonthly].value, currency)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
