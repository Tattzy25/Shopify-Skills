export function KpiCard({ label, value, accent = "#7dd3fc" }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: "#121a2b", border: `1px solid ${accent}44`, borderRadius: 12, padding: 16 }}>
      <div style={{ color: "#9aa7bd", fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  );
}
