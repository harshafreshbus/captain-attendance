"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Users, CheckCircle2, XCircle, AlertCircle, Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

const LOCAL_API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:4000";
import styles from "../../shared.module.css";

export default function CaptainRosterPage() {
  const router = useRouter();
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<any[]>([]);
  
  // Get the Sunday of the current week
  const getSundayOfWeek = (date: Date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday is 0
    return new Date(d.setDate(diff));
  };
  
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getSundayOfWeek());

  // Calculate week dates (Sunday to Saturday)
  const getWeekDates = (startDate: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
  const weekStartDateStr = useMemo(() => currentWeekStart.toISOString().split('T')[0], [currentWeekStart]);

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const sessionStore = localStorage.getItem("user");
        if (!sessionStore) throw new Error("No user stored");
        const userSession = JSON.parse(sessionStore);
        const activeUserId = userSession.id;

        const res = await axios.get(`${LOCAL_API_URL}/trips/depot-captains-roster?userId=${activeUserId}`);
        if (res.data) {
          setRoster(res.data);
        }
      } catch (err) {
        console.error("Roster fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoster();
  }, []);

  useEffect(() => {
    const fetchWeekData = async () => {
      try {
        const sessionStore = localStorage.getItem("user");
        if (!sessionStore) return;
        const userSession = JSON.parse(sessionStore);
        const activeUserId = userSession.id;

        // Format the week start date as YYYY-MM-DD
        // Fetch assignments for the selected week
        const res = await axios.get(`${LOCAL_API_URL}/trips/week-assignments?userId=${activeUserId}&startDate=${weekStartDateStr}`);
        if (res.data) {
          setWeekData(res.data);
        }
      } catch (err) {
        console.error("Week data fetch failed:", err);
      }
    };

    fetchWeekData();
  }, [weekStartDateStr]);

  // Helper function to get captain's assignment status for a specific date
  const getCaptainStatusForDate = (captainId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const assignment = weekData.find(a => a.captainId === captainId && a.journeyDate.startsWith(dateStr));
    return assignment ? 'assigned' : 'unassigned';
  };

  // Helper function to render status badge for a day
  const renderDayStatus = (captainId: number, date: Date) => {
    const status = getCaptainStatusForDate(captainId, date);
    const isToday = new Date().toDateString() === date.toDateString();
    const isPast = date < new Date() && !isToday;

    if (isPast && status === 'unassigned') {
      return (
        <div title="Not assigned" style={{ display: 'flex', justifyContent: 'center' }}>
          <XCircle size={18} color="#dc2626" />
        </div>
      );
    } else if (status === 'assigned') {
      return (
        <div title="Assigned" style={{ display: 'flex', justifyContent: 'center' }}>
          <CheckCircle2 size={18} color="#16a34a" />
        </div>
      );
    } else if (isToday || (date > new Date() && status === 'unassigned')) {
      return (
        <div title="Upcoming / Pending" style={{ display: 'flex', justifyContent: 'center' }}>
          <AlertCircle size={18} color="#eab308" />
        </div>
      );
    } else {
      return (
        <div title="Not assigned" style={{ display: 'flex', justifyContent: 'center' }}>
          <XCircle size={18} color="#dc2626" />
        </div>
      );
    }
  };

  const handleCaptainClick = (captainId: number, captainName: string) => {
    // Navigate to individual captain dashboard
    router.push(`/dashboard/captain?captainId=${captainId}&captainName=${captainName}`);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7); // Move back 7 days to previous Sunday
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7); // Move forward 7 days to next Sunday
    setCurrentWeekStart(newDate);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <div style={{ color: 'var(--muted)', fontWeight: 500 }}>Loading roster...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', backgroundColor: '#dbeafe', borderRadius: '8px', color: 'var(--brand-blue)' }}>
            <Users size={24} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-navy)' }}>Captain Attendance</h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Weekly assignment status - Click on captain to view their full dashboard</p>
      </div>

      {/* Week Navigation */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button 
            onClick={goToPreviousWeek}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <ChevronLeft size={18} /> Previous
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--brand-blue)" />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              Week of {currentWeekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button 
            onClick={goToNextWeek}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Week View Table */}
      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Captain Name</th>
                {weekDates.map((date, idx) => (
                  <th key={idx} style={{ textAlign: 'center', fontSize: '12px' }}>
                    <div>{date.toLocaleDateString([], { weekday: 'short' })}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                  </th>
                ))}
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {roster.length > 0 ? roster.map((captain) => {
                const assignedDays = weekDates.filter(date => getCaptainStatusForDate(captain.captainId, date) === 'assigned').length;
                
                return (
                  <tr 
                    key={captain.captainId} 
                    onClick={() => handleCaptainClick(captain.captainId, captain.captainName)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>
                      {captain.captainName}
                    </td>
                    {weekDates.map((date, idx) => (
                      <td key={idx} style={{ textAlign: 'center', padding: '12px 8px' }}>
                        {renderDayStatus(captain.captainId, date)}
                      </td>
                    ))}
                    <td>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: 700
                      }}>
                        <div style={{
                          width: '40px',
                          height: '20px',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(assignedDays / 7) * 100}%`,
                            height: '100%',
                            backgroundColor: assignedDays > 4 ? '#16a34a' : assignedDays > 2 ? '#eab308' : '#dc2626'
                          }}></div>
                        </div>
                        <span>{assignedDays}/7</span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No captains found for this depot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.card} style={{ marginTop: '24px', backgroundColor: '#f8fafc' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-navy)', marginBottom: '12px' }}>Legend:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#16a34a" />
            <span style={{ fontSize: '12px' }}>Assigned</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={16} color="#dc2626" />
            <span style={{ fontSize: '12px' }}>Not Assigned</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#eab308" />
            <span style={{ fontSize: '12px' }}>Upcoming / Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}
