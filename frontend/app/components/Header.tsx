"use client";
import React from "react";
import { useAuth } from "../providers/AuthProvider";

export default function Header() {
  const { auth, logout } = useAuth();
  return (
    <header className="app-header">
      <div className="flex items-center gap-3">
        <div className="logo-mark">Fresh Bus</div>
        <div className="text-sm text-zinc-500">Captain Attendance</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-zinc-600">{auth?.mobile || 'Guest'}</div>
        <button className="px-3 py-2 bg-[#0b63ff] text-white rounded" onClick={() => logout()}>Logout</button>
      </div>
    </header>
  );
}
