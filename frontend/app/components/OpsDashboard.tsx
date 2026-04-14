"use client";
import React, { useState } from "react";

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function OpsDashboard() {
  const total = 1250;
  const present = 1120;
  const absent = 90;
  const late = 40;

  const depots = [
    { name: 'Depot A', pct: 92 },
    { name: 'Depot B', pct: 85 },
    { name: 'Depot C', pct: 76 },
  ];

  const [selectedDepot, setSelectedDepot] = useState(depots[0].name);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Operations Overview</h2>
          <div className="text-sm text-zinc-500">Executive summary across depots</div>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedDepot} onChange={(e) => setSelectedDepot(e.target.value)} className="px-3 py-2 border rounded">
            {depots.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <KPI label="Total Late" value={late} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 card">
          <div className="text-sm text-zinc-500">Depot Comparison</div>
          <div className="mt-3 space-y-2">
            {depots.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-xs text-zinc-500">Attendance %</div>
                </div>
                <div className="text-lg font-semibold">{d.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-zinc-500">Alerts</div>
          <div className="mt-3">
            <div className="text-sm">Worst performing depot: Depot C</div>
            <div className="text-sm">Highest delay depot: Depot B</div>
          </div>
        </div>
      </div>
    </section>
  );
}
