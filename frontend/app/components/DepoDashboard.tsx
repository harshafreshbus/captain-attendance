"use client";
import React, { useEffect, useMemo, useState } from "react";

type Captain = {
  id: string;
  name: string;
  tripId?: string | null;
  assigned: boolean;
  punched: boolean;
  absenceCount?: number; // historical absences
};

function Pie({ segments, size = 120 }: { segments: { value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = -90;
  const radius = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${radius},${radius})`}>
        {segments.map((seg, i) => {
          const portion = seg.value / total;
          const delta = portion * 360;
          const large = delta > 180 ? 1 : 0;
          const start = (angle * Math.PI) / 180;
          const end = ((angle + delta) * Math.PI) / 180;
          const x1 = Math.cos(start) * radius;
          const y1 = Math.sin(start) * radius;
          const x2 = Math.cos(end) * radius;
          const y2 = Math.sin(end) * radius;
          const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
          angle += delta;
          return <path key={i} d={path} fill={seg.color} stroke="#fff" />;
        })}
      </g>
    </svg>
  );
}

function Sparkline({ points, width = 240, height = 60 }: { points: number[]; width?: number; height?: number }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const step = width / Math.max(points.length - 1, 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / (max - min || 1)) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke="#0b63ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DepoDashboard() {
  const initialCaptains: Captain[] = Array.from({ length: 30 }).map((_, i) => {
    const assigned = i < 28 ? true : false;
    const punched = assigned && i < 20 ? true : false;
    return {
      id: `CPT-${1000 + i}`,
      name: `Captain ${String.fromCharCode(65 + (i % 26))} ${i + 1}`,
      tripId: assigned ? `TRIP-${2000 + i}` : null,
      assigned,
      punched,
      absenceCount: Math.floor(Math.random() * 5),
    };
  });

  const [captains, setCaptains] = useState<Captain[]>(initialCaptains);

  useEffect(() => {
    const t = setInterval(() => {
      setCaptains((prev) => {
        const copy = [...prev];
        const idx = Math.floor(Math.random() * copy.length);
        const c = { ...copy[idx] };
        if (c.assigned && !c.punched && Math.random() < 0.6) {
          c.punched = true;
        } else if (c.punched && Math.random() < 0.15) {
          c.punched = false;
        }
        copy[idx] = c;
        return copy;
      });
    }, 3500 + Math.random() * 2500);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const totalCaptains = captains.length;
    const assignedToday = captains.filter((c) => c.assigned).length;
    const punchedNow = captains.filter((c) => c.punched).length;
    const presentAssigned = captains.filter((c) => c.assigned && c.punched).length;
    const absentToday = assignedToday - presentAssigned;
    const tripsAtRisk = captains.filter((c) => c.assigned && !c.punched).length;
    const extraCaptains = captains.filter((c) => !c.assigned && c.punched).length;
    const replacementRequired = tripsAtRisk;
    return {
      totalCaptains,
      assignedToday,
      punchedNow,
      absentToday,
      attendancePct: assignedToday ? Math.round((presentAssigned / assignedToday) * 100) : 0,
      onTimePct: 0,
      avgDelay: 0,
      tripsAtRisk,
      extraCaptains,
      replacementRequired,
      presentAssigned,
    };
  }, [captains]);
  const topExtra = useMemo(() => captains.filter((c) => !c.assigned && c.punched).slice(0, 5), [captains]);
  const frequentAbsentees = useMemo(() => captains.filter((c) => (c.absenceCount || 0) >= 3).slice(0, 5), [captains]);
  const perfectAttendance = useMemo(() => captains.filter((c) => (c.absenceCount || 0) === 0).slice(0, 5), [captains]);

  const trend = useMemo(() => {
    const base = stats.attendancePct || 70;
    return Array.from({ length: 7 }).map((_, i) => Math.max(40, Math.min(100, base + Math.round(Math.sin(i) * 4) + Math.round((Math.random() - 0.5) * 6))));
  }, [stats.attendancePct]);

  const rows = captains.map((c) => {
    let status = "Idle";
    if (c.assigned && c.punched) status = "Present";
    else if (c.assigned && !c.punched) status = "Absent";
    else if (!c.assigned && c.punched) status = "Extra";
    return { ...c, status };
  });

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Total Captains in Depot</div>
          <div className="text-2xl font-semibold text-slate-800">{stats.totalCaptains}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Assigned Captains (Today)</div>
          <div className="text-2xl font-semibold text-slate-800">{stats.assignedToday}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Punched In (Live)</div>
          <div className="text-2xl font-semibold text-emerald-600">{stats.punchedNow}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Absent Captains (Today)</div>
          <div className="text-2xl font-semibold text-red-600">{stats.absentToday}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Extra Captains</div>
          <div className="text-2xl font-semibold text-slate-700">{stats.extraCaptains}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="flex-1 bg-white rounded shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-500">Punched Now / Assigned Today</div>
              <div className="text-2xl font-bold">{stats.punchedNow} / {stats.assignedToday}</div>
            </div>
            <div className="w-48">
              <div className="h-4 bg-zinc-100 rounded overflow-hidden">
                <div className="h-4 bg-emerald-500 rounded" style={{ width: `${Math.min(100, (stats.punchedNow / Math.max(1, stats.assignedToday)) * 100)}%` }} />
              </div>
              <div className="text-xs text-zinc-500 mt-1">{Math.round((stats.punchedNow / Math.max(1, stats.assignedToday)) * 100)}%</div>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-96 bg-white rounded shadow p-4">
          <div className="text-sm text-zinc-500 mb-2">Attendance Metrics</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-50 rounded">
              <div className="text-xs text-zinc-500">Attendance %</div>
              <div className="text-lg font-semibold">{stats.attendancePct}%</div>
            </div>
            <div className="p-3 bg-zinc-50 rounded">
                <div className="text-xs text-zinc-500">On-Time %</div>
                  <div className="text-lg font-semibold">—</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="bg-white rounded shadow p-4 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48 flex-shrink-0 flex items-center justify-center">
              <Pie
                size={140}
                segments={[{ value: stats.presentAssigned, color: "#00b37e" }, { value: stats.absentToday, color: "#ff4d4f" }, { value: stats.extraCaptains, color: "#6b7280" }]}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-500">Attendance Breakdown</div>
                      <div className="text-xl font-semibold">Present vs Absent vs Extra</div>
                </div>
                <div className="text-xs text-zinc-500">Updated live</div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-zinc-500">Trend (Last 7 days)</div>
                <div className="mt-2">
                  <Sparkline points={trend} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-zinc-500">Top Absentees</div>
                <div className="text-xs text-zinc-500">Frequent absences</div>
              </div>
              <div className="space-y-2">
                {frequentAbsentees.length ? (
                  frequentAbsentees.map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <div className="text-sm">{c.name} <span className="text-xs text-zinc-400">{c.tripId}</span></div>
                      <div className="text-sm font-semibold text-red-600">{c.absenceCount}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">No frequent absentees</div>
                )}
              </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-zinc-500">Operational Insights</div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">Trips at Risk</div>
                <div className="font-semibold text-red-600">{stats.tripsAtRisk}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Extra Captains</div>
                <div className="font-semibold text-slate-700">{stats.extraCaptains}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Replacement Required</div>
                <div className="font-semibold text-amber-600">{stats.replacementRequired}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-zinc-500">Alerts</div>
            <div className="mt-3 space-y-2">
              {stats.absentToday > 0 && <div className="p-2 bg-red-50 text-red-700 rounded">{stats.absentToday} captains absent today</div>}
              {stats.tripsAtRisk > 0 && <div className="p-2 bg-amber-50 text-amber-700 rounded">{stats.tripsAtRisk} trips at risk</div>}
              {stats.extraCaptains > 0 && <div className="p-2 bg-slate-50 text-slate-700 rounded">{stats.extraCaptains} extra captains idle</div>}
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-zinc-500">Top Extra Captains</div>
            <div className="mt-2 space-y-2">
              {captains.filter((c) => !c.assigned && c.punched).slice(0,5).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="text-sm">{c.name}</div>
                  <div className="text-sm font-semibold text-slate-700">Idle</div>
                </div>
              ))}
              {!captains.some((c) => !c.assigned && c.punched) && <div className="text-sm text-zinc-500">—</div>}
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-zinc-500">Frequent Absentees</div>
            <div className="mt-2 space-y-2">
              {frequentAbsentees.length ? frequentAbsentees.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="text-sm">{c.name}</div>
                  <div className="text-sm font-semibold text-red-600">{c.absenceCount}</div>
                </div>
              )) : <div className="text-sm text-zinc-500">—</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-zinc-500">Captain Attendance Details</div>
            <div className="text-lg font-semibold">Detailed List</div>
          </div>
          <div className="text-xs text-zinc-500">Sorted by status</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Captain</th>
                <th className="px-3 py-2">Assigned</th>
                <th className="px-3 py-2">Punched</th>
                <th className="px-3 py-2">Status</th>
                
                <th className="px-3 py-2">Trip ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-zinc-50">
                  <td className="px-3 py-3">{r.name}</td>
                  <td className="px-3 py-3">{r.assigned ? "Yes" : "No"}</td>
                  <td className="px-3 py-3">{r.punched ? "Yes" : "No"}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${r.status === "Absent" ? "bg-red-100 text-red-700" : r.status === "Extra" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">{r.tripId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
