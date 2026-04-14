"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Users, UserCheck, UserX, AlertTriangle, Loader2, MapPin, Bus, Calendar, X, ExternalLink, History } from "lucide-react";
import axios from "axios";
import styles from "../shared.module.css";

const LOCAL_API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:4000";

export default function DepotDashboard() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaptain, setSelectedCaptain] = useState<any>(null);
  const [captainHistory, setCaptainHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [unassignedData, setUnassignedData] = useState<any>(null);
  const [unassignedLoading, setUnassignedLoading] = useState(true);
  const [captainReasons, setCaptainReasons] = useState<Record<number, string>>({});

  const reasonOptions = [
    { value: '', label: 'Select reason...' },
    { value: 'Week Off', label: 'Week Off' },
    { value: 'Leave', label: 'Leave' },
    { value: 'Special Duty', label: 'Special Duty' },
    { value: 'Depot Spare', label: 'Depot Spare' },
    { value: 'Absent', label: 'Absent' }
  ];

  const handleReasonChange = (captainId: number, reason: string) => {
    setCaptainReasons(prev => ({
      ...prev,
      [captainId]: reason
    }));
  };

  useEffect(() => {
    const fetchDepotData = async () => {
      try {
        const sessionStore = localStorage.getItem("user");
        if (!sessionStore) throw new Error("No user stored");
        
        const userSession = JSON.parse(sessionStore);
        const activeUserId = userSession.id;
        const userTypeId = userSession.userTypeId || 7;

        // Fetch assignments for the specific Depot Manager
        const res = await axios.get(`${LOCAL_API_URL}/trips/live-assignments?userTypeId=${userTypeId}&userId=${activeUserId}`);
        if (res.data) {
          setTrips(res.data);
        }
      } catch (err) {
        console.error("Depot data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchUnassignedData = async () => {
      try {
        const sessionStore = localStorage.getItem("user");
        if (!sessionStore) return;
        
        const userSession = JSON.parse(sessionStore);
        const activeUserId = userSession.id;

        // Fetch unassigned captains from yesterday
        const res = await axios.get(`${LOCAL_API_URL}/trips/unassigned-captains-yesterday?userId=${activeUserId}`);
        if (res.data) {
          setUnassignedData(res.data);
        }
      } catch (err) {
        console.error("Unassigned captains fetch failed:", err);
      } finally {
        setUnassignedLoading(false);
      }
    };

    fetchDepotData();
    fetchUnassignedData();
  }, []);

  // Groups trips by captain - All assigned captains are marked "Present"
  const captainProfiles = useMemo(() => {
    const groups: Record<number, any> = {};
    trips.forEach(trip => {
      // Check both primary and co-captain mappings for this depot manager's station
      // The backend returns trips where the manager's station matches either role.
      const assignedCaptains = [];
      if (trip.captainId) assignedCaptains.push({ id: trip.captainId, name: trip.captainName });
      if (trip.coCaptainId) assignedCaptains.push({ id: trip.coCaptainId, name: trip.coCaptainName });

      assignedCaptains.forEach(c => {
        if (!groups[c.id]) {
          groups[c.id] = {
            id: c.id,
            name: c.name,
            services: new Set<string>(),
            vehicles: new Set<string>(),
            status: 'Present'
          };
        }
        if (trip.serviceNumber) groups[c.id].services.add(trip.serviceNumber);
        if (trip.vehicleNumber) groups[c.id].vehicles.add(trip.vehicleNumber);
      });
    });

    return Object.values(groups).map((c: any) => ({
      ...c,
      serviceNumbers: Array.from(c.services).join(', '),
      vehicleNumbers: Array.from(c.vehicles).join(', ')
    }));
  }, [trips]);

  const metrics = useMemo(() => {
    const total = unassignedData?.totalCaptains || captainProfiles.length;
    const presentCount = captainProfiles.length;
    const absentCount = unassignedData?.unassignedYesterday || 0;
    const punchRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    
    return { total, presentCount, absentCount, punchRate };
  }, [captainProfiles, unassignedData]);

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
    fetchHistory(captain.id);
  };

  const handleCloseProfile = () => {
    setSelectedCaptain(null);
  };

  const handleBackdropClick = (e: any) => {
    // Close only when clicking on the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      handleCloseProfile();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <div style={{ color: 'var(--muted)', fontWeight: 500 }}>Fetching depot assignments...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Captain Profile Modal - Must be outside any parent with position:relative */}
      {selectedCaptain && (
        <div onClick={handleBackdropClick} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '20px'
        }}>
          <div className={styles.card} style={{ maxWidth: '700px', width: '100%', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={handleCloseProfile} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
              <X size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--brand-navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700 }}>
                {selectedCaptain.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '4px' }}>{selectedCaptain.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`${styles.badge} ${styles.badgePresent}`}>
                    Assigned Today
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>ID: {selectedCaptain.id}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
               <History size={18} className="text-blue-600" />
               <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Full Service History</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                  <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--muted)' }}>Loading all trips...</p>
                </div>
              ) : captainHistory.length > 0 ? captainHistory.map((trip: any, idx: number) => (
                <div key={idx} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--brand-blue)' }}>
                      <Bus size={18} /> Service {trip.serviceNumber}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                      {new Date(trip.journeyDate).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Route</span>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{trip.sourceStation} → {trip.destinationStation}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Vehicle</span>
                      <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{trip.vehicleNumber || '-'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{trip.serviceName}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: trip.startedAt ? '#16a34a' : '#94a3b8' }}>
                      {trip.startedAt ? `Completed: ${new Date(trip.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Not Punched'}
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  No historical trip data found for this captain.
                </div>
              )}
            </div>
            
            <button 
              onClick={handleCloseProfile}
              style={{
                marginTop: '24px', width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--brand-navy)', color: 'white', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
      
      {/* Live Status Bar */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className={styles.sectionTitle} style={{ marginBottom: '4px' }}>Live Punch Status</h2>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Tracking unique captains assigned for today</div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-navy)' }}>
            {metrics.presentCount}<span style={{ fontSize: '16px', color: 'var(--muted)', fontWeight: 500 }}> / {metrics.total}</span>
          </div>
        </div>
        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${metrics.punchRate}%` }}></div>
          </div>
          <div className={styles.progressLabels}>
            <span>0%</span>
            <span style={{ color: 'var(--brand-blue)', fontWeight: 700 }}>{metrics.punchRate}% Assigned</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLabel}>Total Captains</div>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
              <Users size={20} />
            </div>
          </div>
          <div className={styles.cardValue}>{metrics.total}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Mapped to your station</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLabel}>Assigned Today</div>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
              <UserCheck size={20} />
            </div>
          </div>
          <div className={styles.cardValue}>{metrics.presentCount}</div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Currently assigned</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLabel}>Not Assigned</div>
            <div className={`${styles.iconWrapper} ${styles.iconRed}`}>
              <UserX size={20} />
            </div>
          </div>
          <div className={styles.cardValue}>{unassignedData?.unassignedYesterday || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Yesterday's unassigned</div>
        </div>
      </div>

      {/* Analytics Layout - Two Column */}
      <div className={styles.twoColLayout}>
        {/* Left: Current Captain Roster */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Current Captain Roster</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Click on a captain to view their full historical trip data and service profile.</p>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Captain Name</th>
                  <th>Attendance</th>
                  <th>Service Number</th>
                  <th>Vehicle Number</th>
                </tr>
              </thead>
              <tbody>
                {captainProfiles.length > 0 ? captainProfiles.map((captain) => (
                  <tr key={captain.id} onClick={() => handleOpenProfile(captain)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{captain.name}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgePresent}`}>
                        Assigned
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>{captain.serviceNumbers || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{captain.vehicleNumbers || '—'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                      No captains assigned to this depot station currently.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Unassigned Captains Yesterday Section */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '4px', fontSize: '16px' }}>Unassigned Captains Yesterday</h2>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
            {new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toLocaleDateString()}
          </p>
          
          <div className={styles.tableWrapper}>
            {unassignedLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>Loading...</p>
              </div>
            ) : unassignedData?.unassignedCaptains && unassignedData.unassignedCaptains.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Captain Name</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                {unassignedData.unassignedCaptains.map((captain: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, fontSize: '13px' }}>{captain.name}</td>
                    <td>
                      <select
                        value={captainReasons[captain.id] || ''}
                        onChange={(e) => handleReasonChange(captain.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: captainReasons[captain.id] ? '2px solid var(--brand-blue)' : '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          color: captainReasons[captain.id] ? 'var(--brand-navy)' : 'var(--muted)',
                          width: '100%',
                          minWidth: '120px'
                        }}
                      >
                        {reasonOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '12px' }}>
                All captains assigned yesterday.
              </div>
            )}
          </div>

        {unassignedData?.unassignedCaptains && unassignedData.unassignedCaptains.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-navy)', marginBottom: '2px' }}>
                {Object.values(captainReasons).filter((r: any) => r).length} / {unassignedData.unassignedCaptains.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {Object.values(captainReasons).filter((r: any) => r).length === unassignedData.unassignedCaptains.length 
                  ? '✓ Ready to save' 
                  : 'Fill all reasons'}
              </div>
            </div>
            <button
              onClick={() => {
                const allFilled = unassignedData.unassignedCaptains.every((c: any) => captainReasons[c.id]);
                if (allFilled) {
                  console.log('Save reasons:', captainReasons);
                  alert('Success! All reasons documented.\n\nData will be saved to database.\n\n' + JSON.stringify(captainReasons, null, 2));
                } else {
                  alert('Please fill reasons for ALL unassigned captains before saving.');
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--brand-navy)',
                color: 'white',
                fontWeight: 700,
                cursor: Object.values(captainReasons).filter((r: any) => r).length === unassignedData.unassignedCaptains.length ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                opacity: Object.values(captainReasons).filter((r: any) => r).length === unassignedData.unassignedCaptains.length ? 1 : 0.5
              }}
              disabled={Object.values(captainReasons).filter((r: any) => r).length !== unassignedData.unassignedCaptains.length}
            >
              Save All
            </button>
          </div>
        )}
        </div>
      </div>

    </div>
  );
}
