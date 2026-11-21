import { Fragment, useEffect, useMemo, useState } from "react";
import {
  api,
  toRows,
  useAction,
  Panel,
  Button,
  ErrorNote,
  FileDrop,
  DataTable,
  Stat,
  downloadCsv,
} from "./ui";

const isIssue = (r) =>
  /mismatch|missing|fail|short|excess|error/i.test(
    String(r.status ?? r.result ?? r.verdict ?? ""),
  );

export default function Case2Compliance() {
  const [wage, setWage] = useState([]);
  const [pf, setPf] = useState([]);
  const [esic, setEsic] = useState([]);
  const [result, setResult] = useState(null);
  const [view, setView] = useState("all");

  useEffect(() => {
    loadData.run();
  }, []);

  const loadData = useAction(async () => {
    setResult(
      await api("/api/cs2/jobs", {
        method: "GET",
      }),
    );
  });

  const uploadData = useAction(async () => {
    setResult(
      await api("/api/cs2/jobs", {
        method: "POST",
        files: { wagesheet: wage, pf_ecr: pf, esic_ecr: esic },
      }),
    );
    loadData.run();
  });

  const rows = useMemo(() => toRows(result), [result]);
  const issues = useMemo(() => rows.filter(isIssue), [rows]);
  const shown = view === "issues" ? issues : rows;
  const summary = result && !Array.isArray(result) ? result.summary : null;

  return (
    <>
      <Panel
        title="Compare wagesheet with ECR"
        note="Upload both files to find employees whose wages or PF contributions don't line up."
      >
        <div className="three">
          <FileDrop
            label="Wagesheet"
            accept=".xlsx,.xls"
            files={wage}
            onFiles={(files) => setWage(files[0] ? [files[0]] : [])}
          />
          <FileDrop
            label="PF ECR"
            accept=".pdf"
            files={pf}
            onFiles={(files) => setPf(files[0] ? [files[0]] : [])}
          />
          <FileDrop
            label="ESIC ECR"
            accept=".pdf"
            files={esic}
            onFiles={(files) => setEsic(files[0] ? [files[0]] : [])}
          />
        </div>
        <div className="row">
          <Button
            busy={uploadData.loading}
            disabled={!wage.length || !pf.length || !esic.length}
            onClick={uploadData.run}
          >
            Run comparison
          </Button>
        </div>
        <ErrorNote error={uploadData.error} />
      </Panel>
      {result && (
        <Panel
          title="Comparison results"
          actions={
            <>
              <Button
                variant="ghost"
                busy={loadData.loading}
                onClick={loadData.run}
              >
                Refresh
              </Button>
              <div className="seg" role="tablist">
                <button
                  className={view === "all" ? "on" : ""}
                  onClick={() => setView("all")}
                >
                  All rows ({rows.length})
                </button>
                <button
                  className={view === "issues" ? "on" : ""}
                  onClick={() => setView("issues")}
                >
                  Issues ({issues.length})
                </button>
              </div>
            </>
          }
        >
          {summary && (
            <div className="stats">
              {Object.entries(summary).map(([k, v]) => (
                <Stat key={k} label={k.replace(/_/g, " ")} value={v} />
              ))}
            </div>
          )}
          <DataTable
            type="case2"
            primary={["id", "source", "status", "created_at"]}
            rows={shown}
            empty={
              view === "issues"
                ? "No issues found. Every row matches."
                : "No rows returned."
            }
          />
        </Panel>
      )}
    </>
  );
}
