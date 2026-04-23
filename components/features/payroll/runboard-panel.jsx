"use client";

import { useState, useEffect } from "react";

export default function RunboardPanel() {
  const [activeStage, setActiveStage] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("talme-payroll-stage");
    if (saved) {
      setActiveStage(parseInt(saved, 10));
    }
    setIsLoaded(true);
  }, []);

  const handleStageClick = (id) => {
    setActiveStage(id);
    localStorage.setItem("talme-payroll-stage", id.toString());
  };

  const stages = [
    { id: 1, label: "Attendance Locked" },
    { id: 2, label: "Earnings & Deductions" },
    { id: 3, label: "Payroll Tax Validation" },
    { id: 4, label: "Bank File Release" },
  ];

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Runboard</p>
          <h3>Payroll stages</h3>
        </div>
      </div>
      <div className="runboard">
        {isLoaded && stages.map((stage) => {
          const isActive = activeStage === stage.id;

          const isCompleted = activeStage > stage.id;
          
          return (
            <div 
              key={stage.id} 
              className={`flow-card ${isActive ? 'active-stage' : ''} ${isCompleted ? 'completed-stage' : ''}`}
              onClick={() => handleStageClick(stage.id)}
              style={{ cursor: 'pointer' }}
            >
              <strong>{stage.id}</strong>
              <small>{stage.label}</small>
              {isCompleted && <span className="stage-check">✓</span>}
            </div>
          );
        })}
      </div>
    </article>
  );
}

