import { useState, useMemo } from "react";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Bar } from "recharts";

const BASELINE_KWT = 1.15;
const RTH_YR = 2_970_000;
const KWH_YR = 3_400_000;
const DR = 0.03;

const savingChiller = [4346931,4281727,4217501,4154239,4091925,4030546,3970088,3910537,3851879,3794100,3680277,3569869,3462773,3358890,3258123];
const savingCPMS = [5798902,5711918,5626240,5541846,5458718,5376838,5296185,5216742,5138491,5061414,4909571,4762284,4619416,4480833,4346408];
const maintTotal = [507400,591711,540967,549355,557878,629130,639803,648740,659757,668983,680349,689875,701607,711440,723548];

function run(savings, investment) {
  const netCF = savings.map((s, i) => s - maintTotal[i]);
  let cum = -investment; const cumCF = netCF.map(n => { cum += n; return cum; });
  let npvR = -investment; const npv = netCF.map((n, i) => { npvR += n / (1 + DR) ** (i + 1); return Math.round(npvR); });
  const data = [{ year: 0, cumRev: 0, cumCost: investment, npv: -investment, cumCF: -investment, saving: 0, maint: 0, netCF: 0 }];
  let cR = 0, cC = investment;
  for (let i = 0; i < 15; i++) { cR += savings[i]; cC += maintTotal[i]; data.push({ year: i + 1, cumRev: cR, cumCost: cC, npv: npv[i], cumCF: cumCF[i], saving: savings[i], maint: maintTotal[i], netCF: netCF[i] }); }
  let pb = null; for (let i = 0; i < 15; i++) { if (cumCF[i] >= 0) { pb = i > 0 ? i + Math.abs(cumCF[i - 1]) / netCF[i] : investment / netCF[0]; break; } }
  if (pb === null) pb = 99;
  let rate = 0.1;
  for (let it = 0; it < 500; it++) { let nv = -investment, dn = 0; for (let i = 0; i < 15; i++) { nv += netCF[i] / (1 + rate) ** (i + 1); dn += -netCF[i] * (i + 1) / (1 + rate) ** (i + 2); } if (Math.abs(dn) < 1e-10) break; const nr = rate - nv / dn; if (Math.abs(nr - rate) < 1e-8) { rate = nr; break; } rate = nr; }
  let pbY = Math.floor(pb), pbM = Math.round((pb - pbY) * 12); if (pbM === 12) { pbY++; pbM = 0; }
  return { data, pbY, pbM, irr: rate, npvFinal: npv[14], totalSaving: savings.reduce((a, b) => a + b), totalMaint: maintTotal.reduce((a, b) => a + b), totalNet: netCF.reduce((a, b) => a + b) };
}

const SCENARIOS = [
  { id: "chiller", label: "Chiller Only", savings: savingChiller, kwt: 0.960, pctSaving: "38.5%", savingKwh: 1086732, color: "#2563eb" },
  { id: "cpms", label: "Chiller + CPMS", savings: savingCPMS, kwt: 0.759, pctSaving: "51.3%", savingKwh: 1449725, color: "#0d9488" },
];

const F = "'Cordia New', 'Segoe UI', sans-serif";
const FM = "'Cordia New', monospace";
const fmt = (v) => { if (Math.abs(v) >= 1e6) return `฿${(v / 1e6).toFixed(1)}M`; if (Math.abs(v) >= 1e3) return `฿${(v / 1e3).toFixed(0)}K`; return `฿${v}`; };
const fmtN = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtM = (v) => Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)} M` : fmtN(v);

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", fontSize: 16, fontFamily: FM, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
      <div style={{ color: "#6b7280", marginBottom: 6, fontWeight: 700, fontSize: 15 }}>Year {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 2 }}>
          <span style={{ color: "#374151", fontSize: 15 }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: p.color, fontSize: 16 }}>฿{fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [investment, setInvestment] = useState(15_500_000);
  const [inputText, setInputText] = useState("15,500,000");
  const [scId, setScId] = useState("cpms");
  const [view, setView] = useState("invest");
  const sc = SCENARIOS.find(s => s.id === scId);
  const r = useMemo(() => run(sc.savings, investment), [scId, investment]);
  const allR = useMemo(() => SCENARIOS.map(s => ({ ...s, ...run(s.savings, investment) })), [investment]);

  const handleInvestChange = (e) => { const raw = e.target.value.replace(/,/g, ""); setInputText(e.target.value); const num = parseInt(raw); if (!isNaN(num) && num > 0) setInvestment(num); };
  const handleBlur = () => { setInputText(investment.toLocaleString("en-US")); };
  const presets = [{ label: "12M", val: 12e6 },{ label: "13.5M", val: 13.5e6 },{ label: "15M", val: 15e6 },{ label: "15.5M", val: 15.5e6 },{ label: "18M", val: 18e6 },{ label: "20M", val: 20e6 }];

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "32px 28px", fontFamily: F, color: "#111827" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 48, background: sc.color, borderRadius: 4 }} />
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, fontFamily: F }}>YUM YUM — Investment Analysis ({sc.label})</h1>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 10, padding: 4 }}>
          {SCENARIOS.map(s => (
            <button key={s.id} onClick={() => setScId(s.id)} style={{
              padding: "10px 22px", borderRadius: 8, border: "none", fontSize: 18, fontWeight: 700, cursor: "pointer", fontFamily: F,
              background: scId === s.id ? s.color : "transparent", color: scId === s.id ? "#fff" : "#9ca3af",
              boxShadow: scId === s.id ? `0 2px 8px ${s.color}44` : "none", transition: "all .2s",
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Investment Input */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#374151", fontFamily: F }}>Investment (THB):</span>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontWeight: 700, fontSize: 20 }}>฿</span>
              <input type="text" value={inputText} onChange={handleInvestChange} onBlur={handleBlur} onFocus={(e) => e.target.select()}
                style={{ padding: "10px 14px 10px 30px", borderRadius: 10, border: "2px solid #e5e7eb", fontSize: 22, fontWeight: 800, fontFamily: FM, width: 220, color: "#0d9488", background: "#f9fafb", outline: "none" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {presets.map(p => (
              <button key={p.val} onClick={() => { setInvestment(p.val); setInputText(p.val.toLocaleString("en-US")); }}
                style={{ padding: "8px 16px", borderRadius: 8, border: investment === p.val ? "2px solid #0d9488" : "1px solid #e5e7eb",
                  background: investment === p.val ? "#f0fdfa" : "#fff", color: investment === p.val ? "#0d9488" : "#9ca3af",
                  fontSize: 16, fontWeight: 700, fontFamily: FM, cursor: "pointer" }}>฿{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Net Present Value", val: `฿${fmtN(r.npvFinal)}`, sub: `Investment: ฿${fmtN(investment)}`, color: "#0d9488" },
          { label: "IRR", val: `${(r.irr * 100).toFixed(2)}%`, sub: "Internal Rate of Return", color: "#16a34a" },
          { label: "Payback Period", val: r.pbY < 99 ? `${r.pbY}Y ${r.pbM}M` : "> 15Y", sub: `Saving Y1: ฿${fmtN(sc.savings[0])}`, color: "#2563eb" },
          { label: "Decision", val: r.irr > DR ? "Invest" : "Do Not", sub: `Net 15yr: ฿${fmtN(r.totalNet)}`, color: r.irr > DR ? "#16a34a" : "#ef4444" },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 20px", borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, fontFamily: F }}>{c.label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: c.color, fontFamily: FM }}>{c.val}</div>
            <div style={{ fontSize: 15, color: "#9ca3af", marginTop: 6, fontFamily: F }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Scenario Comparison Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px 18px", marginBottom: 24, overflowX: "auto" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, fontFamily: F }}>Scenario Comparison — Investment ฿{fmtN(investment)}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16, fontFamily: FM }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ padding: "8px 10px", background: "#0d9488", color: "#fff", fontWeight: 700, border: "1px solid #0a7c72", textAlign: "center" }}>No.</th>
              <th rowSpan={2} style={{ padding: "8px 10px", background: "#0d9488", color: "#fff", fontWeight: 700, border: "1px solid #0a7c72", textAlign: "center", minWidth: 110 }}>Description</th>
              <th colSpan={3} style={{ padding: "8px 10px", background: "#b91c1c", color: "#fff", fontWeight: 700, border: "1px solid #991b1b", textAlign: "center" }}>Baseline</th>
              <th colSpan={3} style={{ padding: "8px 10px", background: "#0d9488", color: "#fff", fontWeight: 700, border: "1px solid #0a7c72", textAlign: "center" }}>Propose</th>
              <th rowSpan={2} style={{ padding: "8px 10px", background: "#0d9488", color: "#fff", fontWeight: 700, border: "1px solid #0a7c72", textAlign: "center" }}>Cost Saving<br/><span style={{ fontSize: 13 }}>(THB Baht)</span></th>
              <th rowSpan={2} style={{ padding: "8px 10px", background: "#b91c1c", color: "#fff", fontWeight: 700, border: "1px solid #991b1b", textAlign: "center" }}>Simple<br/>Payback</th>
              <th rowSpan={2} style={{ padding: "8px 10px", background: "#b91c1c", color: "#fff", fontWeight: 700, border: "1px solid #991b1b", textAlign: "center" }}>IRR<br/><span style={{ fontSize: 13 }}>(%)</span></th>
            </tr>
            <tr>
              {["kW/Ton","RTh/Year","kWh/Year"].map(h => <th key={h} style={{ padding: "6px 10px", background: "#dc2626", color: "#fff", fontWeight: 600, border: "1px solid #991b1b", textAlign: "center", fontSize: 14 }}>{h}</th>)}
              {["kW/Ton","Saving\n(kWh/Year)","% Saving"].map(h => <th key={h} style={{ padding: "6px 10px", background: "#0a7c72", color: "#fff", fontWeight: 600, border: "1px solid #0a7c72", textAlign: "center", fontSize: 14, whiteSpace: "pre-line" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {allR.map((s, i) => {
              const isActive = s.id === scId;
              return (
                <tr key={i} onClick={() => setScId(s.id)} style={{ background: isActive ? "#f0fdf4" : i % 2 === 0 ? "#f9fafb" : "#fff", cursor: "pointer" }}>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #e5e7eb", fontSize: 16 }}>{i + 1}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #e5e7eb", fontSize: 16 }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: s.color, marginRight: 6, verticalAlign: "middle" }} />YUM YUM
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "center", color: "#dc2626", fontWeight: 700, border: "1px solid #e5e7eb" }}>{BASELINE_KWT.toFixed(2)}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", color: "#dc2626", fontWeight: 700, border: "1px solid #e5e7eb" }}>{fmtM(RTH_YR)}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", color: "#dc2626", fontWeight: 700, border: "1px solid #e5e7eb" }}>{fmtM(KWH_YR)}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #e5e7eb" }}>{s.kwt.toFixed(3)}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #e5e7eb" }}>{fmtN(s.savingKwh)}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #e5e7eb" }}>{s.pctSaving}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: "#0d9488", border: "1px solid #e5e7eb" }}>{fmtM(s.savings[0])}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 800, color: "#2563eb", border: "1px solid #e5e7eb", fontSize: 18, background: isActive ? "#eff6ff" : undefined }}>{s.pbY < 99 ? `${s.pbY}Y ${s.pbM}M` : "> 15Y"}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 800, color: "#16a34a", border: "1px solid #e5e7eb", fontSize: 18, background: isActive ? "#f0fdf4" : undefined }}>{(s.irr * 100).toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chart Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f3f4f6", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[{ id: "invest", label: "Investment Analysis" }, { id: "breakeven", label: "Breakeven" }, { id: "annual", label: "Annual Compare" }].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: view === t.id ? "#fff" : "transparent", color: view === t.id ? "#111827" : "#9ca3af", fontSize: 17, fontWeight: 600, cursor: "pointer", fontFamily: F, boxShadow: view === t.id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>{t.label}</button>
        ))}
      </div>

      {/* Charts */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px 20px" }}>
        {view === "invest" && (<>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: F }}>Investment Analysis — {sc.label}</div>
          <ResponsiveContainer width="100%" height={450}>
            <ComposedChart data={r.data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="year" tick={{ fontSize: 15, fill: "#6b7280", fontFamily: "Cordia New" }} axisLine={{ stroke: "#d1d5db" }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 14, fill: "#6b7280", fontFamily: "Cordia New" }} axisLine={{ stroke: "#d1d5db" }} />
              <Tooltip content={<TT />} /><Legend wrapperStyle={{ fontSize: 15, paddingTop: 12, fontFamily: "Cordia New" }} iconType="circle" />
              <ReferenceLine y={investment} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="8 6" label={{ value: `Investment: ฿${fmtN(investment)}`, fill: "#f59e0b", fontSize: 14, fontFamily: "Cordia New", position: "insideBottomLeft" }} />
              <Line type="monotone" dataKey="cumRev" name="Cumulative Revenue" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: "#16a34a", stroke: "#fff", strokeWidth: 1.5 }} />
              <Line type="monotone" dataKey="cumCost" name="Cumulative Operating Cost" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: "#ef4444", stroke: "#fff", strokeWidth: 1.5 }} />
              <Line type="monotone" dataKey="npv" name="Net Present Value (NPV)" stroke="#1f2937" strokeWidth={2.5} dot={{ r: 4, fill: "#1f2937", stroke: "#fff", strokeWidth: 1.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </>)}
        {view === "breakeven" && (<>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: F }}>Breakeven — {sc.label} (Payback {r.pbY < 99 ? `${r.pbY}Y ${r.pbM}M` : "> 15Y"})</div>
          <ResponsiveContainer width="100%" height={450}>
            <ComposedChart data={r.data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <defs><linearGradient id="cfUp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={sc.color} stopOpacity={0.15} /><stop offset="95%" stopColor={sc.color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="year" tick={{ fontSize: 15, fill: "#6b7280", fontFamily: "Cordia New" }} /><YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 14, fill: "#6b7280", fontFamily: "Cordia New" }} />
              <Tooltip content={<TT />} /><Legend wrapperStyle={{ fontSize: 15, paddingTop: 12, fontFamily: "Cordia New" }} iconType="circle" />
              <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="8 4" label={{ value: "Break Even", fill: "#ef4444", fontSize: 15, fontFamily: "Cordia New" }} />
              <Area type="monotone" dataKey="cumCF" name="Cumulative CF" stroke={sc.color} strokeWidth={3} fill="url(#cfUp)" dot={{ r: 4, fill: sc.color, stroke: "#fff", strokeWidth: 1.5 }} />
              <Line type="monotone" dataKey="npv" name="NPV @3%" stroke="#2563eb" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 3, fill: "#2563eb", stroke: "#fff", strokeWidth: 1.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </>)}
        {view === "annual" && (<>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: F }}>Annual Saving vs Maintenance — {sc.label}</div>
          <ResponsiveContainer width="100%" height={450}>
            <ComposedChart data={r.data.filter(d => d.year > 0)} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="year" tick={{ fontSize: 15, fill: "#6b7280", fontFamily: "Cordia New" }} /><YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 14, fill: "#6b7280", fontFamily: "Cordia New" }} />
              <Tooltip content={<TT />} /><Legend wrapperStyle={{ fontSize: 15, paddingTop: 12, fontFamily: "Cordia New" }} iconType="circle" />
              <Bar dataKey="saving" name="Energy Saving" fill="#16a34a" radius={[4, 4, 0, 0]} opacity={0.8} barSize={16} />
              <Bar dataKey="maint" name="Maintenance (5 items)" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.8} barSize={16} />
              <Line type="monotone" dataKey="netCF" name="Net Cash Flow" stroke={sc.color} strokeWidth={2.5} dot={{ r: 3, fill: sc.color, stroke: "#fff", strokeWidth: 1.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </>)}
      </div>

      {/* Cash Flow Table */}
      <div style={{ marginTop: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "20px", overflowX: "auto" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, fontFamily: F }}>Cash Flow — {sc.label} (Investment ฿{fmtN(investment)})</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16, fontFamily: FM }}>
          <thead><tr style={{ background: "#0d9488" }}>{["Year", "Saving", "Maint.", "Net CF", "Cumulative", "NPV"].map(h => (
            <th key={h} style={{ padding: "12px 14px", textAlign: h === "Year" ? "center" : "right", color: "#fff", fontWeight: 700, fontSize: 15 }}>{h}</th>
          ))}</tr></thead>
          <tbody>{r.data.map((d, i) => {
            const isPB = i > 1 && r.data[i - 1].cumCF < 0 && d.cumCF >= 0;
            return (<tr key={d.year} style={{ borderBottom: "1px solid #f3f4f6", background: isPB ? "#f0fdf4" : i % 2 === 0 ? "#f9fafb" : "#fff" }}>
              <td style={{ padding: "9px 14px", textAlign: "center", fontWeight: 700, color: isPB ? "#0d9488" : "#374151", fontSize: 16 }}>{d.year === 0 ? "Invest" : `Year ${d.year}`}{isPB ? " ★" : ""}</td>
              <td style={{ padding: "9px 14px", textAlign: "right", color: "#16a34a" }}>{d.saving ? fmtN(d.saving) : "−"}</td>
              <td style={{ padding: "9px 14px", textAlign: "right", color: "#d97706" }}>{d.maint ? fmtN(d.maint) : "−"}</td>
              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: d.year === 0 ? "#ef4444" : d.netCF >= 0 ? "#0d9488" : "#ef4444" }}>{d.year === 0 ? fmtN(-investment) : fmtN(d.netCF)}</td>
              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: d.cumCF >= 0 ? "#0d9488" : "#ef4444" }}>{fmtN(d.cumCF)}</td>
              <td style={{ padding: "9px 14px", textAlign: "right", color: d.npv >= 0 ? "#2563eb" : "#ef4444" }}>{fmtN(d.npv)}</td>
            </tr>);
          })}</tbody>
        </table>
      </div>

      <div style={{ textAlign: "center", fontSize: 15, color: "#9ca3af", marginTop: 20, paddingTop: 14, borderTop: "1px solid #e5e7eb", fontFamily: F }}>
        YUM YUM Chiller Feasibility • AltoTech Global Co., Ltd. • Maint = MA + MaintCh + Ozone + CalSensor + CalPM
      </div>
    </div>
  );
}
