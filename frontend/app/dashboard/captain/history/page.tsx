"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

const LOCAL_API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:4000";
import { Copyleft as CalendarDays, Map, Loader2 } from "lucide-react";
import styles from "../../shared.module.css";

export default function TripHistory() {
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Filtering State
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tempStartDate, setTempStartDate] = useState<string>(startDate);
  const [tempEndDate, setTempEndDate] = useState<string>(endDate);

  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const sessionStore = localStorage.getItem("user");
        if (!sessionStore) throw new Error("No user stored");
        
        const userSession = JSON.parse(sessionStore);
        const activeUserId = userSession.id;

        // Fetch captain trip history from backend
        const res = await axios.get(`${LOCAL_API_URL}/trips/captain-history?captainId=${activeUserId}`);
        
        if (res.data && res.data.length > 0) {
          // Sort real data descending by journey date
          const sortedData = res.data.sort((a: any, b: any) => new Date(b.journeyDate).getTime() - new Date(a.journeyDate).getTime());
          setAllHistory(sortedData);
        } else {
          // No data found
          setAllHistory([]);
        }
      } catch (err) {
        console.error("History fetch failed:", err);
        setAllHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Filter effect
  useEffect(() => {
    if (!allHistory.length) return;
    
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);

    const filtered = allHistory.filter(item => {
      const d = new Date(item.journeyDate);
      return d >= s && d <= e;
    });
    setHistory(filtered);
  }, [allHistory, startDate, endDate]);

  if (loading) {
     return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}><Loader2 className="animate-spin" size={32} color="var(--brand-blue)" /></div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 className={styles.sectionTitle} style={{ fontSize: '28px', marginBottom: '8px' }}>Trip History</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>View and filter your recorded assigned trips.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>From</label>
            <input 
              type="date" 
              value={tempStartDate} 
              onChange={(e) => setTempStartDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>To</label>
            <input 
              type="date" 
              value={tempEndDate} 
              onChange={(e) => setTempEndDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>
          <button 
            onClick={() => {
              setStartDate(tempStartDate);
              setEndDate(tempEndDate);
            }}
            style={{ padding: '8px 16px', backgroundColor: 'var(--brand-blue)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', alignSelf: 'flex-end' }}
          >
            Apply
          </button>
        </div>
      </div>

      <div className={styles.card} style={{ padding: '0' }}>
        <div className={styles.tableWrapper}>
          <table className={styles.table} style={{ minWidth: '100%' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '16px 24px' }}>Date</th>
                <th style={{ padding: '16px 24px' }}>Service Route</th>
                <th style={{ padding: '16px 24px' }}>Assigned Vehicle</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? history.map((trip: any, index: number) => {
                 const d = new Date(trip.journeyDate);
                 // Status is always Present when trip is assigned (from this endpoint)
                 const status = 'Present'; 
                 return (
                <tr key={trip.tripId || index} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <CalendarDays size={16} color="#64748b" />
                        {`${d.getDate()} ${d.toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                        <Map size={16} color="var(--brand-blue)" />
                        {trip.serviceName ? `${trip.serviceName} - ${trip.serviceNumber}` : `Service ${trip.serviceNumber}`}
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px', fontFamily: 'monospace', fontWeight: 600, fontSize: '14px', color: '#475569' }}>
                    {trip.vehicleNumber || 'Unassigned'}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', padding: '6px 12px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>Present - Assigned</span>
                  </td>
                </tr>
              )}) : (
                 <tr>
                   <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No trips found for the selected date range.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
