"use client";

export default function FilterChips({ options, value, onChange }) {
  return (
    <div className="filter-row">
      {options.map((option) => (
        <button
          key={option}
          className={value === option ? "active-chip chip-button" : "chip-button"}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
