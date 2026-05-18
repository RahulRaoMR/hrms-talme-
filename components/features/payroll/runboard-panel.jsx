"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/status-badge";

const fallbackStages = [
  { id: 1, label: "Attendance", status: "In Review", owner: "HR Admin", timestamp: "Pending", tone: "gold" },
  { id: 2, label: "Earnings", status: "Pending", owner: "Payroll Lead", timestamp: "Pending", tone: "slate" },
  { id: 3, label: "Payroll Tax", status: "Pending", owner: "Finance Control", timestamp: "Pending", tone: "slate" },
  { id: 4, label: "Bank Release", status: "Pending", owner: "Treasury", timestamp: "Pending", tone: "slate" }
];

function stageComplete(stage) {
  return ["completed", "released", "approved"].some((value) =>
    String(stage.status || "").toLowerCase().includes(value)
  );
}

export default function RunboardPanel({ stages = fallbackStages }) {
  const resolvedStages = stages.length ? stages : fallbackStages;
  const [activeStage, setActiveStage] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const nextActive =
      resolvedStages.find((stage) => !stageComplete(stage))?.id ||
      resolvedStages[resolvedStages.length - 1]?.id ||
      1;
    setActiveStage(nextActive);
    setIsLoaded(true);
  }, [resolvedStages]);

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Runboard</p>
          <h3>Payroll stages</h3>
        </div>
      </div>
      <div className="runboard">
        {isLoaded &&
          resolvedStages.map((stage) => {
            const isActive = activeStage === stage.id;
            const isCompleted = stageComplete(stage);

            return (
              <button
                key={stage.id}
                className={`flow-card ${isActive ? "active-stage" : ""} ${isCompleted ? "completed-stage" : ""}`}
                onClick={() => setActiveStage(stage.id)}
                type="button"
              >
                <strong>{stage.id}</strong>
                <small>{stage.label}</small>
                <StatusBadge tone={stage.tone}>{stage.status}</StatusBadge>
                <small>{stage.owner}</small>
                <small>{stage.timestamp}</small>
                {isCompleted ? <span className="stage-check">Done</span> : null}
              </button>
            );
          })}
      </div>
    </article>
  );
}
