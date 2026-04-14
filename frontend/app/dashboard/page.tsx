"use client";
import React from "react";
import CaptainDashboard from "../components/CaptainDashboard";
import DepoDashboard from "../components/DepoDashboard";
import OpsDashboard from "../components/OpsDashboard";
import { useAuth } from "../providers/AuthProvider";
import Header from "../components/Header";

export default function DashboardPage() {
  const { auth } = useAuth();
  const role = auth?.role || null;

  return (
    <div className="min-h-screen bg-[#f6f9fb]">
      <Header />
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
        <div className="space-y-6">
          {role === "captain" && <CaptainDashboard mobile={auth.mobile || ""} />}
          {role === "depo_manager" && <DepoDashboard />}
          {role === "ops_manager" && <OpsDashboard />}
          {!role && (
            <div className="card">No role detected — please login.</div>
          )}
        </div>
      </main>
    </div>
  );
}
