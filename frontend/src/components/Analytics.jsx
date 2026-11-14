
import { useState, useEffect } from "react";
import "../styles/Analytics.css";
import { API_URL } from "../config";

const TIME_RANGES = [
  { label: "Week", value: 1 },
  { label: "Month", value: 2 },
  { label: "Year", value: 3 },
  { label: "All time", value: 4 },
];

function RankingList({ title, items, suffix = "requests" }) {
  const max = Math.max(...items.map(item => item.count), 1);

  return (
    <section className="analytics-card ranking-card">
      <div className="analytics-card-header">
        <h2>{title}</h2>
      </div>

      <div className="ranking-list">
        {items.length === 0 ? (
          <p>No data available for this period.</p>
        ) : (
          items.map((item, index) => (
            <div className="ranking-item" key={`${item.name}-${index}`}>
              <div className="ranking-info">
                <div className="ranking-name">
                  <span className="ranking-number">{index + 1}.</span>
                  <strong>{item.name}</strong>
                </div>

                <span className="ranking-count">
                  {item.count.toLocaleString()} {suffix}
                </span>
              </div>

              <div className="ranking-track">
                <div
                  className="ranking-fill"
                  style={{
                    width: `${(item.count / max) * 100}%`
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RequestBreakdown({ breakdown }) {
  const total =
    breakdown.approved +
    breakdown.denied +
    breakdown.cancelled +
    breakdown.pending;

  const percentages = {
    approved: total ? (breakdown.approved / total) * 100 : 0,
    denied: total ? (breakdown.denied / total) * 100 : 0,
    cancelled: total ? (breakdown.cancelled / total) * 100 : 0,
    pending: total ? (breakdown.pending / total) * 100 : 0,
  };

  return (
    <section className="analytics-card breakdown-card">
      <div className="analytics-card-header">
        <h2>Request breakdown</h2>
      </div>

      <div className="breakdown-content">
        <div
          className="breakdown-donut"
          style={{
            background: `conic-gradient(
              #6366d9 0% ${percentages.approved}%,
              #e4a34c ${percentages.approved}% ${percentages.approved + percentages.denied}%,
              #dc6b6b ${percentages.approved + percentages.denied}% ${percentages.approved + percentages.denied + percentages.cancelled}%,
              #dce1eb ${percentages.approved + percentages.denied + percentages.cancelled}% 100%
            )`
          }}
        >
          <div className="donut-center">
            <strong>{total.toLocaleString()}</strong>
            <span>Requests</span>
          </div>
        </div>

        <div className="breakdown-legend">
          <div>
            <i className="legend-approved" />
            <span>Approved</span>
            <strong>{breakdown.approved.toLocaleString()}</strong>
          </div>

          <div>
            <i className="legend-denied" />
            <span>Denied</span>
            <strong>{breakdown.denied.toLocaleString()}</strong>
          </div>

          <div>
            <i style={{ background: "#dc6b6b" }} />
            <span>Cancelled</span>
            <strong>{breakdown.cancelled.toLocaleString()}</strong>
          </div>

          <div>
            <i className="legend-pending" />
            <span>Pending</span>
            <strong>{breakdown.pending.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Analytics({ organizationName, organizationId }) {
  const [timeRange, setTimeRange] = useState(2);

  const [data, setData] = useState({
    stats: {
      totalRequests: 0,
      approvalRate: 0,
      cancelled: 0,
      avgLength: 0,
    },
    breakdown: {
      approved: 0,
      denied: 0,
      cancelled: 0,
      pending: 0,
    },
    venues: [],
    users: [],
    spaces: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      setError("Organization ID is missing.");
      return;
    }

    const controller = new AbortController();

    async function fetchAnalytics() {
      setLoading(true);
      setError("");

      try {
        const base = `${API_URL}`;

        const endpoints = [
          `${base}/events/all/${timeRange}/${organizationId}`,
          `${base}/events/event_stats/${timeRange}/${organizationId}`,
          `${base}/events/avg_length/${timeRange}/${organizationId}`,
          `${base}/venues/ranked/${timeRange}/${organizationId}`,
          `${base}/users/ranked/${timeRange}/${organizationId}`,
          `${base}/spaces/ranked/${timeRange}/${organizationId}`,
        ];

        console.log("API URL:", API_URL);
        console.log("Request URLs:", endpoints);

        const responses = await Promise.all(
          endpoints.map(url =>
            fetch(url, { signal: controller.signal })
          )
        );

        if (responses.some(response => !response.ok)) {
          throw new Error("Unable to load analytics data.");
        }

        const [
          allEvents,
          eventStats,
          avgLength,
          venues,
          users,
          spaces,
        ] = await Promise.all(
          responses.map(response => response.json())
        );

        setData({
          stats: {
            totalRequests: Number(allEvents ?? 0),
            approvalRate: Number(eventStats?.approvalRate ?? 0),
            cancelled: Number(eventStats?.cancelled ?? 0),
            avgLength: Number(avgLength ?? 0),
          },

          breakdown: {
            approved: Number(eventStats?.approved ?? 0),
            denied: Number(eventStats?.denied ?? 0),
            cancelled: Number(eventStats?.cancelled ?? 0),
            pending: Number(eventStats?.pending ?? 0),
          },

          venues: (venues || []).map(row => ({
            name: row.name,
            count: Number(row.count) || 0,
          })),

          users: (users || []).map(row => ({
            name: row.name,
            count: Number(row.count) || 0,
          })),

          spaces: (spaces || []).map(row => ({
            name: row.name,
            venue: row.venue,
            count: Number(row.count) || 0,
          })),
        });

      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Analytics error:", err);
          setError("Unable to load analytics. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => controller.abort();

  }, [timeRange, organizationId]);

  return (
    <main className="main-content analytics-page">
      <div className="analytics-content">

        {/* Time range selector */}
        <div className="analytics-toolbar">
          <span>
            Overview
            {organizationName && ` - ${organizationName}`}
          </span>

          <div className="analytics-time-filter">
            {TIME_RANGES.map(option => (
              <button
                key={option.value}
                className={
                  timeRange === option.value ? "active" : ""
                }
                onClick={() => setTimeRange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="analytics-card">
            <p>Loading analytics...</p>
          </div>
        ) : error ? (
          <div className="analytics-card">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Statistic cards */}
            <section className="analytics-stats">

              <div className="analytics-card stat-card">
                <span>Total Requests</span>
                <strong>
                  {data.stats.totalRequests.toLocaleString()}
                </strong>
              </div>

              <div className="analytics-card stat-card">
                <span>Approval Rate</span>
                <strong>
                  {data.stats.approvalRate.toFixed(1)}%
                </strong>
              </div>

              <div className="analytics-card stat-card">
                <span>Cancelled Events</span>
                <strong>
                  {data.stats.cancelled.toLocaleString()}
                </strong>
              </div>

              <div className="analytics-card stat-card">
                <span>Avg. Event Length</span>
                <strong>
                  {data.stats.avgLength.toFixed(1)} hrs
                </strong>
              </div>

            </section>

            {/* Request breakdown */}
            <section className="analytics-middle">
              <RequestBreakdown breakdown={data.breakdown} />
            </section>

            {/* Rankings */}
            <section className="analytics-bottom">

              <div className="analytics-bottom-left">

                <RankingList
                  title="Most requested venues"
                  items={data.venues}
                />

                <RankingList
                  title="Top requesting users"
                  items={data.users}
                />

              </div>

              <div className="analytics-bottom-right">

                <RankingList
                  title="Most requested spaces"
                  items={data.spaces.map(space => ({
                    name: `${space.name} (${space.venue})`,
                    count: space.count,
                  }))}
                />

              </div>

            </section>
          </>
        )}

      </div>
    </main>
  );
}
