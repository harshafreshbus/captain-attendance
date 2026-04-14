"use client";
import React, { useMemo, useState, useEffect } from "react";

type Row = {
  date: string; // ISO date
  tripId: string | null;
  serviceNo?: string | null;
  status: "Present" | "Absent";
};

function Pie({ segments, size = 100 }: { segments: { value: number; color: string }[]; size?: number }) {
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



export default function CaptainDashboard({ mobile }: { mobile: string }) {
  // Mock personal attendance rows (30 days)
  const today = new Date();
  const makeDate = (d: Date) => d.toISOString().slice(0, 10);
  const generateRows = (): Row[] => {
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (29 - i));
      const rand = Math.random();
      const status: Row["status"] = rand > 0.85 ? "Absent" : "Present";
      return { date: makeDate(d), tripId: `TR${3000 + i}`, serviceNo: `SVC-${100 + i}`, status };
    });
  };

  const [rows, setRows] = useState<Row[]>(generateRows);
  const [startDate, setStartDate] = useState<string>(rows[0].date);
  const [endDate, setEndDate] = useState<string>(rows[rows.length - 1].date);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Simulate today's status (could be fetched from APIs)
  const todaysRow = useMemo(() => rows.find((r) => r.date === makeDate(today)), [rows]);

  const filtered = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const result = rows.filter((r) => {
      const d = new Date(r.date);
      return d >= s && d <= e;
    });
    return result.sort((a, b) => (sortDir === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
  }, [rows, startDate, endDate, sortDir]);

  // KPIs
  const kpis = useMemo(() => {
    const totalAssigned = filtered.length;
    const present = filtered.filter((r) => r.status === "Present").length;
    const absent = filtered.filter((r) => r.status === "Absent").length;
    const attendancePct = totalAssigned ? Math.round((present / totalAssigned) * 100) : 0;
    return { totalAssigned, present, absent, attendancePct };
  }, [filtered]);

  // Visual datasets
  const pieSegments = useMemo(() => [{ value: kpis.present, color: "#00b37e" }, { value: kpis.absent, color: "#ff4d4f" }], [kpis]);
  // Insights
  const insights = useMemo(() => {
    const improved = Math.max(-100, Math.round((Math.random() - 0.5) * 20));
    const perfectStreak = (() => {
      let streak = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].status === "Present") streak++; else break;
      }
      return streak;
    })();
    return { improved, perfectStreak };
  }, [rows]);

  // Alerts
  const alerts = useMemo(() => {
    const list: string[] = [];
    if (todaysRow && todaysRow.status === "Absent") list.push("You missed a trip today");
    return list;
  }, [todaysRow]);

  // Quick effect: keep start/end within rows
  useEffect(() => {
    if (rows.length) {
      setStartDate(rows[0].date);
      setEndDate(rows[rows.length - 1].date);
    }
  }, [rows]);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Total Trips Assigned</div>
          <div className="text-2xl font-semibold">{kpis.totalAssigned}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Present</div>
          <div className="text-2xl font-semibold text-emerald-600">{kpis.present}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-xs text-zinc-500">Absent</div>
          <div className="text-2xl font-semibold text-red-600">{kpis.absent}</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-500">Today</div>
          <div className="text-lg font-semibold">{makeDate(today)}</div>
        </div>
        <div>
          <div className="text-sm">Assigned Today</div>
          <div className="text-xl font-semibold">{todaysRow ? "Yes" : "No"}</div>
        </div>
        <div>
          <div className="text-sm">Punched In</div>
          <div className="text-xl font-semibold">{todaysRow && todaysRow.status !== "Absent" ? "Yes" : "No"}</div>
        </div>
        <div>
          <div className="text-sm">Status</div>
          <div className="text-xl font-semibold">{todaysRow ? todaysRow.status : "No Assignment"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="bg-white rounded shadow p-4 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48 flex-shrink-0 flex items-center justify-center">
              <Pie size={140} segments={[{ value: kpis.present, color: "#00b37e" }, { value: kpis.absent, color: "#ff4d4f" }]} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-500">Attendance Breakdown</div>
                  <div className="text-xl font-semibold">Present vs Absent</div>
                </div>
                <div className="text-xs text-zinc-500">Updated live</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-zinc-500">Filters</div>
                <div className="text-lg font-semibold">Attendance History</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded" />
                <button className="px-3 py-2 bg-slate-100 rounded" onClick={() => setSortDir((s) => (s === "asc" ? "desc" : "asc"))}>Sort: {sortDir}</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-zinc-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Trip ID</th>
                    <th className="px-3 py-2">Service No</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.date} className="border-t hover:bg-zinc-50">
                      <td className="px-3 py-3">{r.date}</td>
                      <td className="px-3 py-3">{r.tripId}</td>
                      <td className="px-3 py-3">{r.serviceNo}</td>
                      <td className="px-3 py-3">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-zinc-500">Attendance Breakdown</div>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-32"><Pie size={96} segments={pieSegments} /></div>
              <div>
                <div className="text-sm">Attendance %</div>
                <div className="text-2xl font-semibold">{kpis.attendancePct}%</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-zinc-500">Insights</div>
            <div className="mt-2 space-y-2 text-sm">
              <div>Your attendance changed by {insights.improved}% this month</div>
              <div>Perfect attendance streak: {insights.perfectStreak} days</div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-zinc-500">Alerts</div>
            <div className="mt-2 space-y-2 text-sm">
              {alerts.length ? alerts.map((a, i) => <div key={i} className="p-2 bg-amber-50 rounded">{a}</div>) : <div className="text-zinc-500">No alerts</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="text-sm text-zinc-500 mb-3">Calendar View (last 30 days)</div>
        <div className="grid grid-cols-7 gap-2">
          {rows.map((r) => (
            <div key={r.date} className={`p-2 rounded text-center text-xs ${r.status === "Present" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              <div>{new Date(r.date).getDate()}</div>
              <div className="mt-1">{r.status === "Present" ? "✅" : "❌"}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
