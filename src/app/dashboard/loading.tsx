import { Skeleton, SkeletonCard, SkeletonText, SkeletonChart } from "@/components/ui/Skeleton";

function SkeletonStatCard() {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonText width="40%" />
        <Skeleton style={{ width: 28, height: 28, borderRadius: "8px" }} />
      </div>
      <SkeletonText width="60%" />
      <SkeletonText width="45%" />
    </div>
  );
}

function SkeletonTxRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <Skeleton style={{ width: 40, height: 40, borderRadius: "12px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <SkeletonText width="55%" />
        <SkeletonText width="35%" />
      </div>
      <SkeletonText width="70px" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div style={{ padding: "24px 32px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
          <SkeletonText width="220px" />
          <SkeletonText width="160px" />
        </div>
        <Skeleton style={{ width: 100, height: 38, borderRadius: "12px" }} />
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "20px", marginBottom: "24px" }}>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "24px" }}>
          <SkeletonText width="140px" />
          <div style={{ marginTop: "20px" }}>
            <SkeletonChart />
          </div>
        </div>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "24px" }}>
          <SkeletonText width="120px" />
          <div style={{ marginTop: "20px" }}>
            <SkeletonChart />
          </div>
        </div>
      </div>

      {/* Transactions + Budgets */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SkeletonText width="160px" />
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3, 4, 5].map((i) => <SkeletonTxRow key={i} />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SkeletonText width="140px" />
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
