"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Users, UserCheck, AlertOctagon, TrendingUp, ChevronDown, Search } from "lucide-react";
import styles from "../shared.module.css";

const LOCAL_API_URL = process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:4000";

interface OpsDashboardData {
  globalMetrics: {
    totalCaptains: number;
    present: number;
    absent: number;
    late: number;
  };
  depotPerformance: Array<{
    name: string;
    stationId: number;
    present: number;
    absent: number;
    late: number;
    total: number;
  }>;
  trendData: Array<{
    date: string;
    rate: number;
  }>;
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
  status: "Present" | "Absent" | "Unassigned";
}

function KPI({ label, value, subtext }: { label: string; value: number | string; subtext?: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.cardValue}>{value}</div>
      {subtext && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    'Present': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    'Absent': { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' },
    'Unassigned': { bg: '#fef3c7', text: '#78350f', border: '#fcd34d' },
  };
  const color = colors[status] || colors['Unassigned'];
  
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`,
    }}>
      {status}
    </span>
  );
}

export default function OpsDashboardPage() {
  const [metricsData, setMetricsData] = useState<OpsDashboardData | null>(null);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepot, setSelectedDepot] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch metrics
        const metricsRes = await fetch(`${LOCAL_API_URL}/trips/ops-dashboard-metrics`);
        if (metricsRes.ok) {
          const metricsResult = await metricsRes.json();
          setMetricsData(metricsResult);
        }

        // Fetch captains list
        const captainRes = await fetch(`${LOCAL_API_URL}/trips/ops-captains-list`);
        if (captainRes.ok) {
          const captainResult = await captainRes.json();
          setCaptains(captainResult);
        }
      } catch (error) {
        console.error('Error fetching ops dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const globalMetrics = metricsData?.globalMetrics || { totalCaptains: 0, present: 0, absent: 0, late: 0 };
  const depotPerformance = metricsData?.depotPerformance || [];

  const presentPercentage = globalMetrics.totalCaptains > 0 
    ? ((globalMetrics.present / globalMetrics.totalCaptains) * 100).toFixed(0)
    : 0;

  // Filter captains based on selected depot and search term
  const filteredCaptains = useMemo(() => {
    let filtered = captains;
    
    if (selectedDepot !== null) {
      filtered = filtered.filter(c => c.depotStationId === selectedDepot);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.captainName.toLowerCase().includes(term) ||
        c.mobile?.includes(term) ||
        c.depotName.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [captains, selectedDepot, searchTerm]);

  // Stats for filtered captains
  const filteredStats = useMemo(() => {
    const present = filteredCaptains.filter(c => c.status === "Present").length;
    const absent = filteredCaptains.filter(c => c.status === "Absent").length;
    const unassigned = filteredCaptains.filter(c => c.status === "Unassigned").length;
    return { present, absent, unassigned, total: filteredCaptains.length };
  }, [filteredCaptains]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div>Loading dashboard data...</div>
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
        <KPI 
          label="Network Captains" 
          value={globalMetrics.totalCaptains}
          subtext="Total active headcount"
        />
        <KPI 
          label="System Present" 
          value={`${globalMetrics.present}`}
          subtext={`${presentPercentage}% attendance target: 95%`}
        />
        <KPI 
          label="Critical Absences" 
          value={globalMetrics.absent}
          subtext="Not assigned today"
        />
        <KPI 
          label="Late Trips" 
          value={globalMetrics.late}
          subtext="Delayed starters"
        />
      </div>

      {/* Depot Performance Summary */}
      <div className={styles.card} style={{ marginTop: '24px', marginBottom: '24px' }}>
        <div className={styles.cardLabel}>Depot Performance Summary</div>
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {depotPerformance.map((depot) => (
            <div key={depot.stationId} style={{
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0b63ff';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(11, 99, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => setSelectedDepot(selectedDepot === depot.stationId ? null : depot.stationId)}
            >
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>{depot.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                {depot.total} captains
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                <span style={{ color: '#16a34a' }}>✓ {Math.round(depot.present)}%</span>
                <span style={{ color: '#dc2626' }}>✕ {depot.absent}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Captains List Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brand-navy)', marginBottom: '4px' }}>
              Captain Roster
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {selectedDepot ? `Showing ${filteredStats.total} captains from selected depot` : `Showing all ${filteredStats.total} captains`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedDepot && (
              <button
                onClick={() => setSelectedDepot(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Clear Depot Filter
              </button>
            )}
          </div>
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search by captain name, mobile, or depot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--muted)' }} />
        </div>

        {/* Captains Table */}
        <div className={styles.card} style={{ overflow: 'hidden' }}>
          {filteredCaptains.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <Users size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No captains found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Depot</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Mobile</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Trips Today</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Services</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCaptains.map((captain, idx) => (
                    <tr key={captain.captainId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>{captain.captainName}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '12px', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                          {captain.depotName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <a href={`tel:${captain.mobile}`} style={{ color: '#0b63ff', textDecoration: 'none' }}>
                          {captain.mobile || '-'}
                        </a>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={captain.status} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {captain.totalAssigned > 0 ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{captain.tripsStarted}/{captain.totalAssigned}</span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>
                              ({Math.round((captain.tripsStarted / captain.totalAssigned) * 100)}%)
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '12px', color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {captain.services || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats for Filtered View */}
        {(selectedDepot !== null || searchTerm) && (
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '4px' }}>Present</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#065f46' }}>{filteredStats.present}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#7f1d1d', marginBottom: '4px' }}>Absent</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#7f1d1d' }}>{filteredStats.absent}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#78350f', marginBottom: '4px' }}>Unassigned</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#78350f' }}>{filteredStats.unassigned}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
