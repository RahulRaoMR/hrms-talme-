import { ArrowLeft, ArrowRight, Check, Download, Eye, FilePlus2, Pencil, Plus, RefreshCw, Search, Send, Trash2, Upload, X } from "lucide-react";

const tools = { Edit: Pencil, Delete: Trash2, View: Eye, Preview: Eye, Download, Refresh: RefreshCw, Search, Previous: ArrowLeft, Next: ArrowRight, Clear: X, Close: X };
const commands = { "Add User": Plus, "Add Setting": Plus, "Add Document": FilePlus2, "Upload File": Upload, "Add Worker": Plus, "Add Approval": Plus, "Add Employee": Plus, "Add Candidate": Plus, "Add Entry": Plus, "Compose Message": Send, Approve: Check, Send };

export default function CoreActionLabel({ label }) {
  const iconOnly = Boolean(tools[label]);
  const Icon = tools[label] || commands[label];
  if (!Icon) return label;
  return <span className={`core-action-label${iconOnly ? " is-icon" : ""}`} title={label}><Icon size={16} aria-hidden="true" /><span className={iconOnly ? "core-sr-only" : undefined}>{label}</span></span>;
}
