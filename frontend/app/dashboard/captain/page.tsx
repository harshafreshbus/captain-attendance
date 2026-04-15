"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2, MapPin, Calendar, Activity, Loader2, Filter, ArrowLeft } from "lucide-react";
import { 
  PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import axios from "axios";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../shared.module.css";

const LOCAL_API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:4000";

const COLORS = ['#16a34a'];

export default function CaptainDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const captainIdParam = searchParams.get('captainId');
  const captainNameParam = searchParams.get('captainName');
  const isViewingOtherCaptain = !!captainIdParam;
  
  const [liveTrip, setLiveTrip] = useState<any>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [punching, setPunching] = useState(false);
  const [punchedIn, setPunchedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  
  // New Productive Enhancements
  const [activeFilter, setActiveFilter] = useState<'7' | '30'>('7');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [realTripsData, setRealTripsData] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    // Filter realTripsData based on date range from activeFilter
    if (realTripsData.length === 0) {
      setHistoricalData([]);
      return;
    }
    
    const daysBack = Number(activeFilter);
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    cutoffDate.setHours(0, 0, 0, 0);
    
    const filtered = realTripsData.filter((trip: any) => {
      const tripDate = new Date(trip.journeyDate);
      return tripDate >= cutoffDate;
    });
    
    // All trips in this endpoint are assignments = Present (with assignment)
    const formattedData = filtered.map((trip: any) => ({
      ...trip,
      status: 'Present'
    }));
    
    setHistoricalData(formattedData);
  }, [realTripsData, activeFilter]);

  // Derived Metrics - Calculate attendance based on unique assignment days vs total days in period
  const metrics = useMemo(() => {
    const daysBack = Number(activeFilter);
    
    // Get unique dates from historicalData (not trip count)
    const uniqueDateSet = new Set<string>();
    historicalData.forEach((trip: any) => {
      const dateStr = new Date(trip.journeyDate).toISOString().split('T')[0];
      uniqueDateSet.add(dateStr);
    });
    
    const uniqueAssignedDays = uniqueDateSet.size;
    const attendancePercentage = Math.round((uniqueAssignedDays / daysBack) * 100);
    
    return {
      present: uniqueAssignedDays,  // Count unique days, not trips
      absent: 0,
      avg: Math.min(attendancePercentage, 100)  // Cap at 100% to avoid over 100%
    };
  }, [historicalData, activeFilter]);

  const pieData = [
    { name: 'Days With Assignment', value: metrics.present },
  ];

  // Calendar Helper Functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getAttendanceForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only show attendance for past dates or today, not future dates
    if (date > today) {
      return null; // Future dates = no shift
    }
    
    const trip = realTripsData.find((t: any) => t.journeyDate.split('T')[0] === dateStr);
    
    // If trip is assigned = Present
    // If no trip = No shift (null means no assignment)
    return trip ? 'Present' : null;
  };

  const getAttendanceColor = (status: string | null) => {
    if (!status) return '#f1f5f9'; // Light grey for no shift
    if (status === 'Present') return '#dcfce7'; // Light green
    return '#f1f5f9';
  };

  const getAttendanceBorderColor = (status: string | null) => {
    if (!status) return '#cbd5e1'; // Grey border for no shift
    if (status === 'Present') return '#16a34a'; // Green border
    return '#cbd5e1';
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i);
      days.push(date);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const previousMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1));
  };

  const handleGoBack = () => {
    router.back();
  };

  useEffect(() => {
    const fetchLiveTrip = async () => {
      try {
        const sessionStore = localStorage.getItem("user");
        if (!sessionStore) throw new Error("No user stored");
        
        const userSession = JSON.parse(sessionStore);
        // Use captainId from URL if provided, otherwise use the logged-in user's ID
        const captainIdToFetch = captainIdParam ? parseInt(captainIdParam) : userSession.id;
        const nameToDisplay = captainNameParam ? decodeURIComponent(captainNameParam) : userSession.name || `Captain ${captainIdToFetch}`;
        
        setDisplayName(nameToDisplay);

        const res = await axios.get(`${LOCAL_API_URL}/trips/captain-history?captainId=${captainIdToFetch}`);
        if (res.data && res.data.length > 0) {
          // Sort real data descending by journey date
          const sortedData = res.data.sort((a: any, b: any) => new Date(b.journeyDate).getTime() - new Date(a.journeyDate).getTime());
          setLiveTrip(sortedData[0]); // Most recent is live trip
          setRealTripsData(sortedData); // Store all for history
        } else {
          // No data found
          setLiveTrip(null);
          setRealTripsData([]);
        }
      } catch (err) {
        console.error("Error fetching trip data:", err);
        setLiveTrip(null);
        setRealTripsData([]);
      } finally {
        setLoadingTrip(false);
      }
    };
    fetchLiveTrip();
  }, [captainIdParam, captainNameParam]);

  const handlePunchIn = async () => {
    setPunching(true);
    try {
      const sessionStore = localStorage.getItem("user");
      const activeUserId = sessionStore ? JSON.parse(sessionStore).id : 0;
      const captainIdToUse = captainIdParam ? parseInt(captainIdParam) : activeUserId;

      await axios.post(`${LOCAL_API_URL}/attendance/punch`, {
         captainId: captainIdToUse,
         tripId: liveTrip?.tripId || "fallback_trip_1",
         status: "Present"
      });
      setPunchedIn(true);
    } catch (err) {
      setPunchedIn(true);
    } finally {
      setPunching(false);
    }
  };

  return (
    <div>
      {/* Productive Header with Dynamic Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isViewingOtherCaptain && (
            <button 
              onClick={handleGoBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--brand-blue)'
              }}
              title="Back to roster"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-dark)' }}>
            {isViewingOtherCaptain ? `${displayName}'s Dashboard` : 'My Performance Workspace'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
           <button 
             onClick={() => setActiveFilter('7')}
             style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      backgroundColor: activeFilter === '7' ? 'white' : 'transparent', 
                      color: activeFilter === '7' ? 'var(--brand-blue)' : '#64748b',
                      boxShadow: activeFilter === '7' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
           >
             7 Days
           </button>
           <button 
             onClick={() => setActiveFilter('30')}
             style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
               backgroundColor: activeFilter === '30' ? 'white' : 'transparent', 
               color: activeFilter === '30' ? 'var(--brand-blue)' : '#64748b',
               boxShadow: activeFilter === '30' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
           >
             30 Days
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.highlightCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLabel}>Live Assignment Fetch</div>
            <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <MapPin size={20} color="white" />
            </div>
          </div>
          <div className={styles.highlightContent}>
            {loadingTrip ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 className="animate-spin" /> Fetching backend...</div>
            ) : liveTrip ? (
               <>
                  <div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>Vehicle: {liveTrip.vehicleNumber}</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>Service {liveTrip.serviceNumber}</div>
                  </div>
                  <div>
                    {!punchedIn ? (
                      <button 
                         onClick={handlePunchIn}
                         disabled={punching}
                         style={{ backgroundColor: 'white', color: 'var(--brand-blue)', height: '40px', padding: '0 20px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                         {punching && <Loader2 size={16} className="animate-spin"/>} PUNCH IN NOW
                      </button>
                    ) : (
                      <div className={styles.statusIndicator}>
                        <CheckCircle2 size={18} /> Punched In
                      </div>
                    )}
                  </div>
               </>
            ) : (
               <div>No active assignments currently found. Relax and enjoy your day!</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLabel}>Attendance Score</div>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
              <Activity size={20} />
            </div>
          </div>
          <div className={styles.cardValue}>{metrics.avg}%</div>
          <div style={{ fontSize: '12px', color: metrics.avg > 80 ? '#16a34a' : '#ca8a04', fontWeight: 600 }}>
             {metrics.avg > 90 ? '+ Excellent standing' : 'Needs attention'}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLabel}>With Assignment</div>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className={styles.cardValue}>{metrics.present}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Days assigned (Present)</div>
        </div>
      </div>

      {/* Charts & Tables Section */}
      <div className={styles.twoColLayout}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Calculated Trip History ({activeFilter} days)</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Route</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {realTripsData.length > 0 ? realTripsData.slice(0, activeFilter === '7' ? 7 : 30).map((trip: any, index: number) => {
                   const d = new Date(trip.journeyDate);
                   // If trip exists = it was assigned = Present
                   const status = 'Present'; 
                   return (
                  <tr key={trip.tripId || index}>
                    <td>{`${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`}</td>
                    <td>Service {trip.serviceNumber}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgePresent}`}>Present - Assigned</span>
                    </td>
                  </tr>
                )}) : (
                   <tr>
                     <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                        No history found for this captain.
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.card} style={{ flex: 1 }}>
            <h2 className={styles.sectionTitle}>Assignment Breakdown</h2>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className={styles.card} style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className={styles.sectionTitle}>Attendance Calendar</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={previousMonth}
              style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
            >
              ← Prev
            </button>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-navy)', minWidth: '160px', textAlign: 'center' }}>
              {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button 
              onClick={nextMonth}
              style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#dcfce7', border: '2px solid #16a34a' }}></div>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Present (Trip Assigned)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#f1f5f9', border: '2px solid #cbd5e1' }}></div>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>No Shift (No Assignment)</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Sun</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Mon</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Tue</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Wed</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Thu</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Fri</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Sat</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
                <tr key={weekIndex}>
                  {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                    const attendance = day ? getAttendanceForDate(day) : null;
                    const bgColor = getAttendanceColor(attendance);
                    const borderColor = getAttendanceBorderColor(attendance);
                    const isToday = day && day.toDateString() === new Date().toDateString();

                    return (
                      <td
                        key={`${weekIndex}-${dayIndex}`}
                        style={{
                          padding: '0',
                          height: '80px',
                          verticalAlign: 'top',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {day ? (
                          <div
                            style={{
                              height: '100%',
                              padding: '8px',
                              backgroundColor: bgColor,
                              borderBottom: `3px solid ${borderColor}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = borderColor;
                              (e.currentTarget as HTMLElement).style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = bgColor;
                              (e.currentTarget as HTMLElement).style.color = 'inherit';
                            }}
                          >
                            <div style={{ fontSize: '14px', fontWeight: 700, color: isToday ? 'var(--brand-blue)' : 'var(--brand-navy)' }}>
                              {day.getDate()}
                              {isToday && <span style={{ marginLeft: '4px', fontSize: '10px', backgroundColor: 'var(--brand-blue)', color: 'white', borderRadius: '2px', padding: '2px 4px' }}>TODAY</span>}
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: attendance === 'Present' ? '#16a34a' : attendance === 'Absent' ? '#dc2626' : '#64748b' }}>
                              {attendance || 'No shift'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ height: '100%', backgroundColor: '#fafafa' }}></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>{realTripsData.slice(0, activeFilter === '7' ? 7 : 30).length}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Days with Assignment (Present)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-blue)' }}>{metrics.avg}%</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Stability Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#64748b' }}>Calendar</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Use above to track assignments</div>
          </div>
        </div>
      </div>
    </div>
  );
}
