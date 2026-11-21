import "./app.css";
import Case1Parcels from "./Case1Parcels";
import Case2Compliance from "./Case2Compliance";
import Case3PnL from "./Case3PnL";

import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";

const TABS = [
  { id: "case1", label: "Parcel images", View: Case1Parcels },
  { id: "case2", label: "Wagesheet vs ECR", View: Case2Compliance },
  { id: "case3", label: "FC P&L monitor", View: Case3PnL },
];

function Layout() {
  const [tab, setTab] = useState("case1");
  const navigate = useNavigate();
  const onOpen = useCallback(
    (tab) => {
      setTab(tab);
      navigate(`/${tab}`);
    },
    [navigate],
  );
  const { View } = TABS.find((t) => t.id === tab);
  return (
    <div className="shell">
      <nav className="side" aria-label="Tasks">
        <div className="brand">Ops desk</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "on" : ""}
            onClick={() => onOpen(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="main">
        <View onOpen={setTab} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/case1" replace />} />
        <Route path="/case1" element={<Case1Parcels />} />
        <Route path="/case2" element={<Case2Compliance />} />
        <Route path="/case3" element={<Case3PnL />} />
      </Route>
    </Routes>
  );
}
