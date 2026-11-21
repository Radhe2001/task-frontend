import { useRef, useState, useCallback, Fragment, useId } from "react";

export const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:8000";

/** Thin fetch wrapper. files = { fieldName: File | File[] } -> multipart upload */
export async function api(path, { method = "GET", files, json } = {}) {
  const opts = { method };
  if (files) {
    const fd = new FormData();
    Object.entries(files).forEach(([k, v]) =>
      [].concat(v).forEach((f) => fd.append(k, f)),
    );
    opts.body = fd;
  } else if (json) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(json);
  }
  const res = await fetch(API_URL + path, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const d = await res.json();
      msg = d.detail || d.message || msg;
    } catch {}
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json();
}

/** Accepts [..] or {rows|items|results|data: [..]} */
export const toRows = (d) =>
  Array.isArray(d) ? d : (d?.rows ?? d?.items ?? d?.results ?? d?.data ?? []);

/** Wraps an async action with loading + error state */
export function useAction(fn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(
    async (...a) => {
      setLoading(true);
      setError(null);
      try {
        return await fn(...a);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );
  return { run, loading, error };
}

export function downloadCsv(rows, name = "export.csv") {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Panel({ title, note, actions, children }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {note && <p className="note">{note}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function Button({ busy, children, variant = "primary", ...p }) {
  return (
    <button className={`btn ${variant}`} disabled={busy || p.disabled} {...p}>
      {busy ? "Working…" : children}
    </button>
  );
}

export function Select({
  label,
  hint,
  error,
  options = [],
  placeholder,
  id,
  className = "",
  ...rest
}) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const msgId = error || hint ? `${selectId}-msg` : undefined;
  const items = options.map((o) =>
    typeof o === "object" ? o : { value: o, label: o },
  );
  return (
    <div className={`field ${error ? "invalid" : ""} ${className}`}>
      {label && <label htmlFor={selectId}>{label}</label>}
      <div className="select-wrap">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={msgId}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {msgId && (
        <p id={msgId} className="field-msg">
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function ErrorNote({ error }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}

export function FileDrop({ label, accept, multiple, files, onFiles }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const pick = (list) => onFiles(multiple ? [...list] : [...list].slice(0, 1));
  return (
    <div
      className={`drop ${over ? "over" : ""}`}
      onClick={() => ref.current.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && ref.current.click()
      }
    >
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => pick(e.target.files)}
      />
      <strong>{label}</strong>
      <span>
        {files.length
          ? files.length === 1
            ? files[0].name
            : `${files.length} files selected`
          : "Drop here or click to browse"}
      </span>
    </div>
  );
}

const GOOD =
  /^(match|matched|ok|pass|passed|compliant|profit|healthy|success)/i;
const BAD = /(mismatch|missing|fail|error|loss|breach|non.?compliant|alert)/i;

export function Badge({ children }) {
  const s = String(children);
  const tone = GOOD.test(s) ? "good" : BAD.test(s) ? "bad" : "neutral";
  return <span className={`badge ${tone}`}>{s}</span>;
}

const fmt = (v) =>
  typeof v === "number"
    ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : v && typeof v === "object"
      ? JSON.stringify(v)
      : (v ?? "");

const isStatusCol = (c) => /status|result|verdict/i.test(c);

function Cell({ col, value }) {
  return isStatusCol(col) && value ? <Badge>{value}</Badge> : fmt(value);
}

/**
 * Auto-columns table with expandable rows.
 * - primary: column keys that are always visible. Default: the first `maxCols`
 *   columns, swapping in a status-like column if one exists.
 * - Each row has a toggle that reveals every remaining field underneath it.
 */
export function DataTable({
  type,
  rows,
  hide = [],
  primary,
  maxCols = 5,
  empty = "Nothing here yet.",
}) {
  const [open, setOpen] = useState(() => new Set());

  if (!rows.length) return <p className="empty">{empty}</p>;

  const summaryTypes = ["case1", "case2", "case3"];

  const all = Object.keys(rows[0]).filter((c) => !hide.includes(c));

  let main = primary
    ? primary.filter((c) => all.includes(c))
    : all.slice(0, maxCols);

  if (!primary) {
    const status = all.find(isStatusCol);

    if (status && !main.includes(status)) {
      main = [...main.slice(0, -1), status];
    }
  }

  const rowKey = (r, i) => r.id ?? i;

  const extrasOf = (r) =>
    Object.keys(r).filter((c) => !hide.includes(c) && !main.includes(c));

  const expandable =
    rows.some((r) => extrasOf(r).length > 0) || summaryTypes.includes(type);

  const allOpen = open.size === rows.length;

  const toggle = (k) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const toggleAll = () =>
    setOpen(allOpen ? new Set() : new Set(rows.map(rowKey)));

  return (
    <>
      {expandable && (
        <div className="table-tools">
          <button className="link" onClick={toggleAll}>
            {allOpen ? "Collapse all rows" : "Expand all rows"}
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {expandable && (
                <th className="toggle-col" aria-label="Expand row" />
              )}

              {main.map((c) => (
                <th key={c}>{c.replace(/_/g, " ")}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => {
              const k = rowKey(r, i);
              const isOpen = open.has(k);
              const extras = extrasOf(r);

              return (
                <Fragment key={k}>
                  <tr className={isOpen ? "open" : ""}>
                    {expandable && (
                      <td className="toggle-col">
                        {(extras.length > 0 || summaryTypes.includes(type)) && (
                          <button
                            className="toggle"
                            aria-expanded={isOpen}
                            aria-label={
                              isOpen ? "Hide details" : "Show details"
                            }
                            onClick={() => toggle(k)}
                          >
                            {isOpen ? "\u25BE" : "\u25B8"}
                          </button>
                        )}
                      </td>
                    )}

                    {main.map((c) => {
                      let val = r[c];

                      if (c === "created_at" && val) {
                        val = new Date(val * 1000).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        });
                      }

                      return (
                        <td
                          key={c}
                          className={
                            typeof r[c] === "number"
                              ? r[c] < 0
                                ? "num neg"
                                : "num"
                              : ""
                          }
                        >
                          <Cell col={c} value={val} />
                        </td>
                      );
                    })}
                  </tr>

                  {isOpen &&
                    (extras.length > 0 || summaryTypes.includes(type)) && (
                      <tr className="detail">
                        <td
                          colSpan={main.length + (expandable ? 1 : 0)}
                          className="detail-content"
                        >
                          {type === "case1" ? (
                            <ParcelSummary data={r} />
                          ) : type === "case2" ? (
                            <WageSummary data={r} />
                          ) : type === "case3" ? (
                            <JobFcsSummary data={r} />
                          ) : (
                            <dl className="detail-grid">
                              {extras.map((c) => {
                                let val = r[c];

                                if (c === "created_at" && val) {
                                  val = new Date(val * 1000).toLocaleString(
                                    "en-IN",
                                    {
                                      timeZone: "Asia/Kolkata",
                                    },
                                  );
                                }

                                return (
                                  <div key={c}>
                                    <dt>{c.replace(/_/g, " ")}</dt>
                                    <dd
                                      className={
                                        typeof r[c] === "number" && r[c] < 0
                                          ? "neg"
                                          : ""
                                      }
                                    >
                                      <Cell col={c} value={val} />
                                    </dd>
                                  </div>
                                );
                              })}
                            </dl>
                          )}
                        </td>
                      </tr>
                    )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ParcelSummary({ data }) {
  const results = data?.results ?? [];

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    return new Date(timestamp * 1000).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }

    return value;
  };

  const renderTable = (fields) => (
    <table className="summary-table">
      <tbody>
        {fields.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{formatValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="job-summary wage-summary parcel-summary">
      {/* Job Information */}
      <div className="summary-section">
        <h3>Job Information</h3>

        {renderTable([
          ["Job ID", data.id],
          ["Kind", data.kind],
          ["Source", data.source],
          ["Status", data.status],
          ["Stage", data.stage],
          ["Total", data.total],
          ["Done", data.done],
          ["Result Count", data.result_count ?? results.length],
          ["Error", data.error || "None"],
          ["Created At", formatDate(data.created_at)],
        ])}
      </div>

      {/* Parcel Overview */}
      <div className="summary-section">
        <h3>Parcel Overview</h3>

        {renderTable([
          ["Total Results", results.length],
          ["AWB Detected", results.filter((r) => r.awb).length],
          [
            "Multiple Parcels",
            results.filter((r) => r.status === "MULTIPLE_PARCELS").length,
          ],
          ["Weight Detected", results.filter((r) => r.weight).length],
          ["Dimensions Detected", results.filter((r) => r.dimensions).length],
        ])}
      </div>

      {/* Individual Parcel Results */}
      {results.map((item, index) => (
        <div className="summary-section" key={item.id ?? index}>
          <h3>Parcel Result #{index + 1}</h3>

          <h4>Shipment Information</h4>

          {renderTable([
            ["Result ID", item.id],
            ["Filename", item.filename],
            ["AWB Number", item.awb],
            ["Weight", item.weight],
            ["Dimensions", item.dimensions],
            ["Status", item.status],
          ])}

          <h4>AWB Detection Details</h4>

          {renderTable([
            ["AWB Source", item.awb_source],
            ["Header AWB", item.header_awb],
            ["Label AWB", item.label_awb],
          ])}

          <h4>Detection Information</h4>

          {renderTable([
            ["Job ID", item.job_id],
            ["Created At", formatDate(item.created_at)],
            ["Image Path", item.image_path],
          ])}

          <h4>Flag Reason</h4>

          {item.flag_reason ? (
            <p className="parcel-flag-reason">{item.flag_reason}</p>
          ) : (
            <p>No flags detected.</p>
          )}
        </div>
      ))}

      {/* Warnings */}
      <div className="summary-section">
        <h3>Warnings</h3>

        {(data.warnings ?? []).length > 0 ? (
          <ul>
            {data.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        ) : (
          <p>No warnings.</p>
        )}
      </div>
    </div>
  );
}

function WageSummary({ data }) {
  console.log(data);
  const summary = data?.summary ?? {};
  const pf = summary.pf ?? {};
  const esic = summary.esic ?? {};

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    return new Date(timestamp * 1000).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  };

  console.log("WageSummary data:", summary);

  const renderContribution = (title, contribution) => {
    const statuses = [
      "MATCHED",
      "NAME_MISMATCH",
      "AMOUNT_MISMATCH",
      "MISSING",
      "NOT_APPLICABLE",
      "REVIEW",
      "NOT_CHECKED",
    ];

    return (
      <div className="summary-section">
        <h3>{title} Reconciliation</h3>

        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Employees</th>
            </tr>
          </thead>

          <tbody>
            {statuses.map((status) => (
              <tr key={status}>
                <td>{status.replace(/_/g, " ")}</td>
                <td>{contribution[status] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4>Contribution Amounts</h4>

        <table>
          <tbody>
            <tr>
              <td>Deducted Total</td>
              <td className="num">
                ₹{(contribution.deducted_total ?? 0).toLocaleString("en-IN")}
              </td>
            </tr>

            <tr>
              <td>Deposited Total (Listed)</td>
              <td className="num">
                ₹
                {(contribution.deposited_total_for_listed ?? 0).toLocaleString(
                  "en-IN",
                )}
              </td>
            </tr>

            <tr>
              <td>Difference</td>
              <td className="num">
                ₹
                {(
                  (contribution.deducted_total ?? 0) -
                  (contribution.deposited_total_for_listed ?? 0)
                ).toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="wage-summary">
      <div className="summary-section">
        <h3>Job Information</h3>

        <table>
          <tbody>
            <tr>
              <td>Job ID</td>
              <td>{data.id}</td>
            </tr>
            <tr>
              <td>Kind</td>
              <td>{data.kind}</td>
            </tr>
            <tr>
              <td>Source</td>
              <td>{data.source}</td>
            </tr>
            <tr>
              <td>Status</td>
              <td>{data.status}</td>
            </tr>
            <tr>
              <td>Stage</td>
              <td>{data.stage}</td>
            </tr>
            <tr>
              <td>Total</td>
              <td>{data.total}</td>
            </tr>
            <tr>
              <td>Done</td>
              <td>{data.done}</td>
            </tr>
            <tr>
              <td>Error</td>
              <td>{data.error || "None"}</td>
            </tr>
            <tr>
              <td>Created At</td>
              <td>{formatDate(data.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <hr />
      <div className="summary-section">
        <h3>Employee Summary</h3>

        <table>
          <tbody>
            <tr>
              <td>Total Employees</td>
              <td>{summary.employees ?? 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <hr />

      {renderContribution("PF", pf)}
      <hr />

      {renderContribution("ESIC", esic)}
      <hr />

      <div className="summary-section">
        <h3>Warnings</h3>

        {(data.warnings ?? []).length > 0 ? (
          <ul>
            {data.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        ) : (
          <p>No warnings.</p>
        )}
      </div>
    </div>
  );
}

function JobFcsSummary({ data }) {
  const summary = data?.summary ?? {};

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    return new Date(timestamp * 1000).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <div className="job-summary">
      <div className="summary-section">
        <h3>Job Information</h3>

        <table>
          <tbody>
            <tr>
              <td>Job ID</td>
              <td>{data.id}</td>
            </tr>
            <tr>
              <td>Kind</td>
              <td>{data.kind}</td>
            </tr>
            <tr>
              <td>Source</td>
              <td>{data.source}</td>
            </tr>
            <tr>
              <td>Status</td>
              <td>{data.status}</td>
            </tr>
            <tr>
              <td>Stage</td>
              <td>{data.stage}</td>
            </tr>
            <tr>
              <td>Total</td>
              <td>{data.total}</td>
            </tr>
            <tr>
              <td>Done</td>
              <td>{data.done}</td>
            </tr>
            <tr>
              <td>Error</td>
              <td>{data.error || "None"}</td>
            </tr>
            <tr>
              <td>Created At</td>
              <td>{formatDate(data.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary-section">
        <h3>Summary</h3>

        <table>
          <tbody>
            <tr>
              <td>Days</td>
              <td>{summary.days ?? 0}</td>
            </tr>
            <tr>
              <td>FCs</td>
              <td>{(summary.fcs ?? []).join(", ")}</td>
            </tr>
            <tr>
              <td>Anomalies</td>
              <td>{summary.anomalies ?? 0}</td>
            </tr>
            <tr>
              <td>Digests</td>
              <td>{summary.digests ?? 0}</td>
            </tr>
            <tr>
              <td>Issue Count</td>
              <td>{summary.issue_count ?? 0}</td>
            </tr>
            <tr>
              <td>Targets Source</td>
              <td>{summary.targets_source || "N/A"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary-section">
        <h3>Colour Distribution</h3>

        <table>
          <thead>
            <tr>
              <th>Colour</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(summary.colours ?? {}).map(([colour, count]) => (
              <tr key={colour}>
                <td>{colour}</td>
                <td>{count}</td>
                <td>
                  {summary.days ? ((count / summary.days) * 100).toFixed(1) : 0}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-section">
        <h3>Issues</h3>

        {(summary.issues ?? []).length ? (
          <ul>
            {summary.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p>No issues found.</p>
        )}
      </div>

      <div className="summary-section">
        <h3>Warnings</h3>

        {(data.warnings ?? []).length ? (
          <ul>
            {data.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        ) : (
          <p>No warnings.</p>
        )}
      </div>
    </div>
  );
}

export function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-value">
        {typeof value === "number"
          ? value.toLocaleString("en-IN")
          : String(value ?? "—")}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
