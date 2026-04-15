"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Users, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "../shared.module.css";

const LOCAL_API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:4000";

interface DepotSummary {
  stationId: number;
  stationName: string;
  totalCaptains: number;
  assignedToday: number;
  presentToday: number;
  absentToday: number;
  presentPercentage: number;
}

interface Captain {
  captainId: number;
  captainName: string;
  depotStationId: number;
  depotName: string;
  mobile: string;
  totalAssigned: number;
  tripsStarted: number;
  services: string | null;
  vehicles: string | null;
  status: "Assigned" | "Unassigned";
}

export default function OpsDashboardPage() {
  const router = useRouter();
  const [depots, setDepots] = useState<DepotSummary[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepotId, setSelectedDepotId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch depot summary
        const depotRes = await fetch(`${LOCAL_API_URL}/trips/depot-summary`);
        if (depotRes.ok) {
          const depotResult = await depotRes.json();
          setDepots(depotResult);
        } else {
          console.error('Depot summary fetch failed:', depotRes.status);
        }

        // Fetch captains list
        const captainRes = await fetch(`${LOCAL_API_URL}/trips/ops-captains-list`);
        if (captainRes.ok) {
          const captainResult = await captainRes.json();
          setCaptains(captainResult);
        } else {
          console.error('Captains list fetch failed:', captainRes.status);
        }
      } catch (error) {
        console.error('Error fetching ops dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate global metrics
  const globalMetrics = useMemo(() => {
    const totalCaptains = depots.reduce((sum, d) => sum + d.totalCaptains, 0);
    const assignedToday = depots.reduce((sum, d) => sum + d.assignedToday, 0);
    const unassignedToday = depots.reduce((sum, d) => sum + d.absentToday, 0);
    const avgAssigned = totalCaptains > 0 ? Math.round((assignedToday / totalCaptains) * 100) : 0;

    return { totalCaptains, assignedToday, unassignedToday, avgAssigned };
  }, [depots]);

  // Filter captains based on selected depot and search term
  const filteredCaptains = useMemo(() => {
    let filtered = captains;

    if (selectedDepotId !== null) {
      filtered = filtered.filter(c => c.depotStationId === selectedDepotId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.captainName.toLowerCase().includes(term) ||
        c.mobile?.includes(term)
      );
    }

    return filtered;
  }, [captains, selectedDepotId, searchTerm]);

  const handleDepotClick = (depotId: number) => {
    // Navigate to depot captain roster view
    router.push(`/dashboard/depot/roster?depotId=${depotId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--brand-blue)" />
          <span>Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '8px' }}>
          Operations Dashboard
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Real-time visibility across all depots
        </p>
      </div>

      {/* Global KPI Cards */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Network Captains</div>
          <div className={styles.cardValue}>{globalMetrics.totalCaptains}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Total active headcount</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Assigned Today</div>
          <div className={styles.cardValue}>{globalMetrics.assignedToday}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{globalMetrics.avgAssigned}% assigned</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Unassigned Today</div>
          <div className={styles.cardValue}>{globalMetrics.unassignedToday}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Not assigned</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Depots</div>
          <div className={styles.cardValue}>{depots.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Total locations</div>
        </div>
      </div>

      {/* Depot Performance Cards */}
      <div className={styles.card} style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Depot Performance Summary</h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Click on a depot to view detailed manager dashboard</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {depots.map((depot) => (
            <div
              key={depot.stationId}
              onClick={() => handleDepotClick(depot.stationId)}
              style={{
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backgroundColor: 'white',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-blue)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} /> {depot.stationName}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Total Captains</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brand-navy)' }}>{depot.totalCaptains}</div>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Assigned Today</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>{depot.assignedToday}</div>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Unassigned</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>{depot.absentToday}</div>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Assigned %</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brand-blue)' }}>{depot.totalCaptains > 0 ? Math.round((depot.assignedToday / depot.totalCaptains) * 100) : 0}%</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--brand-blue)', fontWeight: 600, marginTop: '8px' }}>
                → View Depot Dashboard
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Captain Roster Section */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 className={styles.sectionTitle}>
              Captain Roster
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {selectedDepotId
                ? `Showing ${filteredCaptains.length} captains from selected depot`
                : `Showing all ${filteredCaptains.length} captains`}
            </p>
          </div>
          {selectedDepotId && (
            <button
              onClick={() => {
                setSelectedDepotId(null);
                setSearchTerm("");
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search by captain name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Captains Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Depot</th>
                <th style={{ padding: '12px 16px' }}>Mobile</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCaptains.length > 0 ? filteredCaptains.map((captain) => (
                <tr key={captain.captainId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{captain.captainName}</td>
                  <td style={{ padding: '12px 16px' }}>{captain.depotName}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{captain.mobile}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: captain.status === 'Assigned' ? '#d1fae5' : '#fee2e2',
                      color: captain.status === 'Assigned' ? '#065f46' : '#7f1d1d',
                      border: `1px solid ${captain.status === 'Assigned' ? '#6ee7b7' : '#fca5a5'}`
                    }}>
                      {captain.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    No captains found
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
