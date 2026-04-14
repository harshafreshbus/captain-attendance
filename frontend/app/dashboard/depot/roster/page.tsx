"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Users, UserCheck, UserX, AlertTriangle, Loader2, MapPin, Bus, Calendar, X, ExternalLink, History, TrendingUp } from "lucide-react";
import axios from "axios";

const LOCAL_API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:4000";
import styles from "../../shared.module.css";

export default function CaptainRosterPage() {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaptain, setSelectedCaptain] = useState<any>(null);
  const [captainHistory, setCaptainHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const fetchHistory = async (captainId: number) => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${LOCAL_API_URL}/trips/captain-history?captainId=${captainId}`);
      if (res.data) {
        setCaptainHistory(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenProfile = (captain: any) => {
    setSelectedCaptain(captain);
    fetchHistory(captain.captainId);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <div style={{ color: 'var(--muted)', fontWeight: 500 }}>Loading comprehensive roster...</div>
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
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-navy)' }}>Depot Captain Roster</h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Audit overall attendance and historical trip performance for all captains in your depot.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Captain Name</th>
                <th>Captain ID</th>
                <th>Trips Assigned</th>
                <th>Trips Started</th>
                <th>Overall Attendance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {roster.length > 0 ? roster.map((captain) => {
                const attendanceRate = captain.totalTrips > 0 
                  ? Math.round((captain.tripsStarted / captain.totalTrips) * 100) 
                  : 0;
                
                return (
                  <tr key={captain.captainId} onClick={() => handleOpenProfile(captain)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{captain.captainName}</td>
                    <td style={{ color: 'var(--muted)' }}>#{captain.captainId}</td>
                    <td style={{ fontWeight: 600 }}>{captain.totalTrips}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{captain.tripsStarted}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', maxWidth: '80px' }}>
                          <div style={{ width: `${attendanceRate}%`, height: '100%', backgroundColor: attendanceRate > 90 ? '#16a34a' : attendanceRate > 70 ? '#eab308' : '#dc2626', borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{attendanceRate}%</span>
                      </div>
                    </td>
                    <td>
                      <button className={styles.badge} style={{ backgroundColor: 'var(--brand-blue)', color: 'white', border: 'none', cursor: 'pointer' }}>
                        View History
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No captains found for this depot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Captain History Modal */}
      {selectedCaptain && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className={styles.card} style={{ maxWidth: '750px', width: '100%', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedCaptain(null)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
              <X size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--brand-navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700 }}>
                {selectedCaptain.captainName.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '4px' }}>{selectedCaptain.captainName}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 600, color: 'var(--brand-blue)' }}>
                    <TrendingUp size={16} /> 
                    {Math.round((selectedCaptain.tripsStarted / selectedCaptain.totalTrips) * 100)}% Lifetime Attendance
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>ID: {selectedCaptain.captainId}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Trips Assigned</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#166534' }}>{selectedCaptain.totalTrips}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Trips Successfully Started</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e40af' }}>{selectedCaptain.tripsStarted}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
               <History size={18} className="text-blue-600" />
               <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Complete Trip Audit</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                  <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--muted)' }}>Loading history...</p>
                </div>
              ) : captainHistory.length > 0 ? captainHistory.map((trip: any, idx: number) => (
                <div key={idx} style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ color: 'var(--brand-blue)', fontWeight: 700, minWidth: '80px' }}>
                      {new Date(trip.journeyDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-navy)' }}>Service {trip.serviceNumber}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{trip.sourceStation} → {trip.destinationStation}</div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: trip.startedAt ? '#16a34a' : '#94a3b8' }}>
                      {trip.startedAt ? 'Started OK' : 'No Data'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {trip.vehicleNumber || 'No VH'}
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  No historical trip record available.
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setSelectedCaptain(null)}
              style={ {
                marginTop: '32px', width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                backgroundColor: 'var(--brand-navy)', color: 'white', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Close History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
