"use client";

export default function FilterChips({ options, value, onChange }) {
  return (
    <div className="filter-row" role="group" aria-label="Filter options">
      {options.map((option) => (
        <button
          key={option}
          className={value === option ? "active-chip chip-button" : "chip-button"}
          onClick={() => onChange(option)}
          type="button"
          aria-pressed={value === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
