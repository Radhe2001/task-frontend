import { useEffect, useState } from "react";
import {
  api,
  toRows,
  useAction,
  Panel,
  Button,
  ErrorNote,
  FileDrop,
  DataTable,
  downloadCsv,
  Select,
} from "./ui";

export default function Case3PnL() {
  const [file, setFile] = useState([]);
  const [rows, setRows] = useState([]);
  const [fcName, setFcName] = useState("");
  const [fcTouched, setFcTouched] = useState(false);

  const load = useAction(async () => {
    const [r, a] = await Promise.all([api("/api/cs3/jobs")]);
    setRows(toRows(r));
  });
  const upload = useAction(async () => {
    await api("/api/cs3/jobs", {
      method: "POST",
      files: { data_file: file[0] },
      body: { fc_name: "FC1", notify: "true" },
    });
    setFile([]);
    await load.run();
  });
  const check = useAction(async () => {
    await api("/api/case3/run", { method: "POST" });
    await load.run();
  });

  useEffect(() => {
    load.run();
  }, []); // eslint-disable-line

  return (
    <>
      <Panel
        title="Daily P&L data"
        note="Upload the day's workbook, then run the check to flag fulfilment centres that need attention."
      >
        <FileDrop
          label="P&L workbook"
          accept=".xlsx,.xls,.csv"
          files={file}
          onFiles={setFile}
        />
        <Select
          label="FC name"
          placeholder="Choose a centre"
          hint="The fulfilment centre this workbook belongs to."
          options={["Gurgaon FC", "Bengaluru FC", "Delhi FC"]}
          value={fcName}
          onChange={(e) => setFcName(e.target.value)}
          required
        />
        <div className="row">
          <Button
            busy={upload.loading}
            disabled={!file.length || !fcName}
            onClick={upload.run}
          >
            Upload workbook
          </Button>
        </div>
        <ErrorNote error={upload.error || check.error} />
      </Panel>

      <Panel
        title={`Fulfilment centre P&L (${rows.length})`}
        actions={
          <>
            <Button variant="ghost" busy={load.loading} onClick={load.run}>
              Refresh
            </Button>
          </>
        }
      >
        <ErrorNote error={load.error} />
        <DataTable
          type="case3"
          primary={["id", "source", "status", "created_at"]}
          rows={rows}
          empty="No P&L data yet. Upload the workbook above."
        />
      </Panel>
    </>
  );
}
