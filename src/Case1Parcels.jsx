import { useEffect, useMemo, useState } from "react";
import {
  api,
  toRows,
  useAction,
  Panel,
  Button,
  ErrorNote,
  FileDrop,
  downloadCsv,
  DataTable,
} from "./ui";

export default function Case1Parcels() {
  const [files, setFiles] = useState([]);
  const [rows, setRows] = useState([]);

  const load = useAction(async () =>
    setRows(toRows(await api("/api/cs1/jobs"))),
  );
  const process = useAction(async () => {
    await api("/api/cs1/jobs", { method: "POST", files: { files: files[0] } });
    setFiles([]);
    await load.run();
  });

  useEffect(() => {
    load.run();
  }, []); // eslint-disable-line

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files],
  );
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews],
  );

  return (
    <>
      <Panel
        title="Add parcel images"
        note="Barcodes and label text are read from each image and saved as shipment records."
      >
        <FileDrop
          label="Parcel photos"
          accept="image/*"
          multiple
          files={files}
          onFiles={setFiles}
        />
        {previews.length > 0 && (
          <div className="thumbs">
            {previews.map((p) => (
              <img key={p.url} src={p.url} alt={p.name} title={p.name} />
            ))}
          </div>
        )}
        <div className="row">
          <Button
            busy={process.loading}
            disabled={!files.length}
            onClick={process.run}
          >
            Upload and process
          </Button>
        </div>
        <ErrorNote error={process.error} />
      </Panel>

      <Panel
        title={`Shipments (${rows.length})`}
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
          type="case1"
          rows={rows}
          primary={["id", "source", "status", "created_at", "download"]}
        />
      </Panel>
    </>
  );
}
