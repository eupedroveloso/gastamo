"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "./icons";

interface CalendarProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  /** Quando true, o rótulo mostra só o dia do mês (ex.: "Dia 15") — útil para fechamento de fatura onde só o dia é persistido. */
  dayOfMonthLabel?: boolean;
  /** Quando true, o rótulo mostra mês e ano por extenso (competência / fatura), ex.: "março de 2026". */
  competenceMonthLabel?: boolean;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function ChevronLeft() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <path d="M10 3.2L5.6 8l4.4 4.8" stroke="currentColor" strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <path d="M6 3.2L10.4 8 6 12.8" stroke="currentColor" strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

const YEAR_RANGE_START = 2020;
const YEAR_RANGE_END = 2035;

// Shared calendar grid used by Calendar and CalendarRange
export function CalendarGrid({
  viewYear,
  viewMonth,
  setViewYear,
  setViewMonth,
  isSelected,
  isInRange,
  isRangeStart,
  isRangeEnd,
  onSelectDay,
}: {
  viewYear: number;
  viewMonth: number;
  setViewYear: (y: number) => void;
  setViewMonth: (m: number) => void;
  isSelected: (dateStr: string) => boolean;
  isInRange?: (dateStr: string) => boolean;
  isRangeStart?: (dateStr: string) => boolean;
  isRangeEnd?: (dateStr: string) => boolean;
  onSelectDay: (dateStr: string) => void;
}) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const days: Array<{ day: number; inMonth: boolean; dateStr: string }> = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDay) {
      const d = prevMonthDays - firstDay + 1 + i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ day: d, inMonth: false, dateStr: toDateStr(y, m, d) });
    } else if (i - firstDay < daysInMonth) {
      const d = i - firstDay + 1;
      days.push({ day: d, inMonth: true, dateStr: toDateStr(viewYear, viewMonth, d) });
    } else {
      const d = i - firstDay - daysInMonth + 1;
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ day: d, inMonth: false, dateStr: toDateStr(y, m, d) });
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const todayS = todayStr();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Month/Year navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={prevMonth}
          style={{
            width: 28, height: 28, border: "none", background: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, color: "#525252",
          }}
        >
          <ChevronLeft />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }}>
          {/* Month selector */}
          <button
            type="button"
            onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
            style={{
              background: showMonthPicker ? "#F5F5F5" : "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 500, color: "#0A0A0A", fontFamily: "inherit",
              padding: "2px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 2,
            }}
          >
            {MONTHS[viewMonth]}
            <ChevronDownIcon size={12} color="#A3A3A3" />
          </button>

          {/* Year selector */}
          <button
            type="button"
            onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
            style={{
              background: showYearPicker ? "#F5F5F5" : "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 500, color: "#0A0A0A", fontFamily: "inherit",
              padding: "2px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 2,
            }}
          >
            {viewYear}
            <ChevronDownIcon size={12} color="#A3A3A3" />
          </button>

          {/* Month dropdown */}
          {showMonthPicker && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)",
                zIndex: 10, background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 12,
                boxShadow: "0px 4px 12px rgba(0,0,0,0.1)", padding: 8,
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, width: 200,
              }}
            >
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setViewMonth(i); setShowMonthPicker(false); }}
                  style={{
                    padding: "6px 4px", border: "none", borderRadius: 8,
                    background: i === viewMonth ? "#0F8F4E" : "transparent",
                    color: i === viewMonth ? "#FFFFFF" : "#0A0A0A",
                    fontSize: 12, fontWeight: i === viewMonth ? 600 : 400,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Year dropdown */}
          {showYearPicker && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)",
                zIndex: 10, background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 12,
                boxShadow: "0px 4px 12px rgba(0,0,0,0.1)", padding: 8,
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, width: 200,
                maxHeight: 200, overflowY: "auto",
              }}
            >
              {Array.from({ length: YEAR_RANGE_END - YEAR_RANGE_START + 1 }, (_, i) => YEAR_RANGE_START + i).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setShowYearPicker(false); }}
                  style={{
                    padding: "6px 2px", border: "none", borderRadius: 8,
                    background: y === viewYear ? "#0F8F4E" : "transparent",
                    color: y === viewYear ? "#FFFFFF" : "#0A0A0A",
                    fontSize: 12, fontWeight: y === viewYear ? 600 : 400,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={nextMonth}
          style={{
            width: 28, height: 28, border: "none", background: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, color: "#525252",
          }}
        >
          <ChevronRight />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center", fontSize: 11, fontWeight: 500,
              color: "#A3A3A3", padding: "6px 0", lineHeight: 1,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {days.map((d, i) => {
          const sel = isSelected(d.dateStr);
          const tod = d.dateStr === todayS;
          const inRange = isInRange?.(d.dateStr) ?? false;
          const rangeStart = isRangeStart?.(d.dateStr) ?? false;
          const rangeEnd = isRangeEnd?.(d.dateStr) ?? false;

          let bg = "transparent";
          let color = d.inMonth ? (tod ? "#0F8F4E" : "#0A0A0A") : "#D4D4D4";
          let fontWeight = 400;
          let borderRadius = "50%";

          if (sel || rangeStart || rangeEnd) {
            bg = "#0F8F4E";
            color = "#FFFFFF";
            fontWeight = 600;
          } else if (inRange) {
            bg = "#D6F5E3";
            color = "#0F6B38";
            borderRadius = "4px";
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(d.dateStr)}
              style={{
                height: 32, border: "none", borderRadius,
                background: bg, cursor: "pointer",
                fontSize: 13, fontWeight, color,
                fontFamily: "inherit", display: "flex",
                alignItems: "center", justifyContent: "center",
                lineHeight: 1, transition: "background 0.1s", padding: 0,
              }}
              onMouseEnter={(e) => { if (!sel && !rangeStart && !rangeEnd && !inRange) e.currentTarget.style.background = "#F5F5F5"; }}
              onMouseLeave={(e) => { if (!sel && !rangeStart && !rangeEnd && !inRange) e.currentTarget.style.background = "transparent"; }}
            >
              {d.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Painel só mês + ano (sem dias) — competência de fatura. */
function CompetenceMonthYearPicker({
  viewYear,
  setViewYear,
  valueYm,
  onSelectMonth,
}: {
  viewYear: number;
  setViewYear: (y: number) => void;
  valueYm: string;
  onSelectMonth: (monthIndex: number) => void;
}) {
  const [showYearPicker, setShowYearPicker] = useState(false);
  const prevYear = () => setViewYear(Math.max(YEAR_RANGE_START, viewYear - 1));
  const nextYear = () => setViewYear(Math.min(YEAR_RANGE_END, viewYear + 1));
  const years = Array.from(
    { length: YEAR_RANGE_END - YEAR_RANGE_START + 1 },
    (_, i) => YEAR_RANGE_START + i,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={prevYear}
          disabled={viewYear <= YEAR_RANGE_START}
          style={{
            width: 28,
            height: 28,
            border: "none",
            background: "none",
            cursor: viewYear <= YEAR_RANGE_START ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            color: viewYear <= YEAR_RANGE_START ? "#D4D4D4" : "#525252",
          }}
        >
          <ChevronLeft />
        </button>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowYearPicker(!showYearPicker)}
            style={{
              background: showYearPicker ? "#F5F5F5" : "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#0A0A0A",
              fontFamily: "inherit",
              padding: "4px 8px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {viewYear}
            <ChevronDownIcon size={12} color="#A3A3A3" />
          </button>
          {showYearPicker && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: "#FFFFFF",
                border: "1px solid #E5E5E5",
                borderRadius: 12,
                boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                padding: 8,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 4,
                width: 216,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setShowYearPicker(false);
                  }}
                  style={{
                    padding: "6px 2px",
                    border: "none",
                    borderRadius: 8,
                    background: y === viewYear ? "#0F8F4E" : "transparent",
                    color: y === viewYear ? "#FFFFFF" : "#0A0A0A",
                    fontSize: 11,
                    fontWeight: y === viewYear ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={nextYear}
          disabled={viewYear >= YEAR_RANGE_END}
          style={{
            width: 28,
            height: 28,
            border: "none",
            background: "none",
            cursor: viewYear >= YEAR_RANGE_END ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            color: viewYear >= YEAR_RANGE_END ? "#D4D4D4" : "#525252",
          }}
        >
          <ChevronRight />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {MONTHS_SHORT.map((label, i) => {
          const ym = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
          const sel = valueYm.length >= 7 && valueYm.slice(0, 7) === ym;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectMonth(i)}
              style={{
                padding: "10px 6px",
                border: "none",
                borderRadius: 10,
                background: sel ? "#0F8F4E" : "#F5F5F5",
                color: sel ? "#FFFFFF" : "#0A0A0A",
                fontSize: 12,
                fontWeight: sel ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                lineHeight: 1.2,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CalendarIcon = ({ color = "#A3A3A3" }: { color?: string }) => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M5.60002 1.99961C5.60002 1.77961 5.42002 1.59961 5.20002 1.59961C4.98002 1.59961 4.80002 1.77961 4.80002 1.99961V3.19961H4.00002C3.11752 3.19961 2.40002 3.91711 2.40002 4.79961V11.9996C2.40002 12.8821 3.11752 13.5996 4.00002 13.5996H12C12.8825 13.5996 13.6 12.8821 13.6 11.9996V4.79961C13.6 3.91711 12.8825 3.19961 12 3.19961H11.2V1.99961C11.2 1.77961 11.02 1.59961 10.8 1.59961C10.58 1.59961 10.4 1.77961 10.4 1.99961V3.19961H5.60002V1.99961ZM4.00002 3.99961H12C12.4425 3.99961 12.8 4.35711 12.8 4.79961V11.9996C12.8 12.4421 12.4425 12.7996 12 12.7996H4.00002C3.55752 12.7996 3.20002 12.4421 3.20002 11.9996V4.79961C3.20002 4.35711 3.55752 3.99961 4.00002 3.99961ZM4.60002 6.79961C4.60002 7.13211 4.86752 7.39961 5.20002 7.39961C5.53252 7.39961 5.80002 7.13211 5.80002 6.79961C5.80002 6.46711 5.53252 6.19961 5.20002 6.19961C4.86752 6.19961 4.60002 6.46711 4.60002 6.79961ZM10.8 9.39961C10.4675 9.39961 10.2 9.66711 10.2 9.99961C10.2 10.3321 10.4675 10.5996 10.8 10.5996C11.1325 10.5996 11.4 10.3321 11.4 9.99961C11.4 9.66711 11.1325 9.39961 10.8 9.39961ZM7.20002 6.79961C7.20002 7.01961 7.38002 7.19961 7.60002 7.19961H10.8C11.02 7.19961 11.2 7.01961 11.2 6.79961C11.2 6.57961 11.02 6.39961 10.8 6.39961H7.60002C7.38002 6.39961 7.20002 6.57961 7.20002 6.79961ZM8.40002 9.59961H5.20002C4.98002 9.59961 4.80002 9.77961 4.80002 9.99961C4.80002 10.2196 4.98002 10.3996 5.20002 10.3996H8.40002C8.62002 10.3996 8.80002 10.2196 8.80002 9.99961C8.80002 9.77961 8.62002 9.59961 8.40002 9.59961Z" fill={color} />
  </svg>
);

export function Calendar({
  value,
  onChange,
  placeholder = "Filtrar Data",
  dayOfMonthLabel,
  competenceMonthLabel,
}: CalendarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const y = parseInt(value.slice(0, 4), 10);
    const m = parseInt(value.slice(5, 7), 10) - 1;
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      setViewYear(y);
      setViewMonth(m);
    }
  }, [value]);

  const displayValue = value
    ? competenceMonthLabel && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${MONTHS[parseInt(value.slice(5, 7), 10) - 1].toLowerCase()} de ${value.slice(0, 4)}`
      : dayOfMonthLabel && /^\d{4}-\d{2}-(\d{2})$/.test(value)
        ? `Dia ${parseInt(value.slice(8, 10), 10)}`
        : selectedDate
          ? `${String(selectedDate.getUTCDate()).padStart(2, "0")}/${String(selectedDate.getUTCMonth() + 1).padStart(2, "0")}/${selectedDate.getUTCFullYear()}`
          : ""
    : "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#FFFFFF", border: "1px solid #E5E5E5",
          borderRadius: 16, padding: "8px 12px", cursor: "pointer", minWidth: 160,
        }}
      >
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 400,
          color: displayValue ? "#0A0A0A" : "#A3A3A3",
          lineHeight: 1.5, fontFamily: "inherit", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {displayValue || placeholder}
        </span>
        <CalendarIcon />
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "#FFFFFF", border: "1px solid #F5F5F5", borderRadius: 16,
          padding: 16, boxShadow: "0px 4px 12px rgba(0,0,0,0.08), 0px 1px 3px rgba(0,0,0,0.06)",
          width: competenceMonthLabel ? 260 : 280,
        }}>
          {competenceMonthLabel ? (
            <CompetenceMonthYearPicker
              viewYear={viewYear}
              setViewYear={setViewYear}
              valueYm={value && /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : ""}
              onSelectMonth={(monthIndex) => {
                const ym = `${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                onChange(`${ym}-01`);
                setOpen(false);
              }}
            />
          ) : (
            <CalendarGrid
              viewYear={viewYear}
              viewMonth={viewMonth}
              setViewYear={setViewYear}
              setViewMonth={setViewMonth}
              isSelected={(ds) => value === ds}
              onSelectDay={(ds) => {
                onChange(ds);
                setOpen(false);
              }}
            />
          )}

          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              style={{
                padding: "6px 8px", background: "none", border: "none", cursor: "pointer",
                fontSize: 12, color: "#A3A3A3", fontFamily: "inherit", textAlign: "center",
                width: "100%", marginTop: 8,
              }}
            >
              {competenceMonthLabel ? "Limpar fatura" : "Limpar data"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── CalendarRange: date range picker ──

interface CalendarRangeProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  placeholder?: string;
}

export function CalendarRange({ startDate, endDate, onChange, placeholder = "Período" }: CalendarRangeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const parsedStart = startDate ? new Date(startDate + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(parsedStart?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedStart?.getMonth() ?? today.getMonth());
  const [picking, setPicking] = useState<"start" | "end">("start");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const formatShort = (ds: string) => {
    const d = new Date(ds + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const displayValue = startDate && endDate
    ? `${formatShort(startDate)} - ${formatShort(endDate)}`
    : startDate
      ? `${formatShort(startDate)} - ...`
      : "";

  const handleSelect = (dateStr: string) => {
    if (picking === "start") {
      onChange(dateStr, "");
      setPicking("end");
    } else {
      if (dateStr < startDate) {
        onChange(dateStr, "");
        setPicking("end");
      } else {
        onChange(startDate, dateStr);
        setPicking("start");
      }
    }
  };

  const isInRange = (ds: string) => {
    if (!startDate || !endDate) return false;
    return ds > startDate && ds < endDate;
  };

  const presets = [
    {
      label: "Este mês",
      fn: () => {
        const y = today.getFullYear(), m = today.getMonth();
        const lastDay = getDaysInMonth(y, m);
        onChange(toDateStr(y, m, 1), toDateStr(y, m, lastDay));
        setPicking("start");
      },
    },
    {
      label: "Mês passado",
      fn: () => {
        const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const y = d.getFullYear(), m = d.getMonth();
        const lastDay = getDaysInMonth(y, m);
        onChange(toDateStr(y, m, 1), toDateStr(y, m, lastDay));
        setPicking("start");
      },
    },
    {
      label: "Últimos 7 dias",
      fn: () => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        onChange(
          toDateStr(start.getFullYear(), start.getMonth(), start.getDate()),
          toDateStr(end.getFullYear(), end.getMonth(), end.getDate())
        );
        setPicking("start");
      },
    },
    {
      label: "Últimos 30 dias",
      fn: () => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        onChange(
          toDateStr(start.getFullYear(), start.getMonth(), start.getDate()),
          toDateStr(end.getFullYear(), end.getMonth(), end.getDate())
        );
        setPicking("start");
      },
    },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: (startDate || endDate) ? "#0F8F4E" : "#FFFFFF",
          border: (startDate || endDate) ? "1px solid #0F8F4E" : "1px solid #E5E5E5",
          borderRadius: 16, padding: "8px 12px", cursor: "pointer", minWidth: 160,
        }}
      >
        <CalendarIcon color={(startDate || endDate) ? "#FFFFFF" : "#A3A3A3"} />
        <span style={{
          flex: 1, fontSize: 13, fontWeight: (startDate || endDate) ? 600 : 400,
          color: (startDate || endDate) ? "#FFFFFF" : "#A3A3A3",
          lineHeight: 1.5, fontFamily: "inherit", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {displayValue || placeholder}
        </span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
          background: "#FFFFFF", border: "1px solid #F5F5F5", borderRadius: 16,
          padding: 16, boxShadow: "0px 4px 12px rgba(0,0,0,0.08), 0px 1px 3px rgba(0,0,0,0.06)",
          display: "flex", gap: 16, width: "auto",
        }}>
          {/* Presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, borderRight: "1px solid #F5F5F5", paddingRight: 16, minWidth: 130 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#A3A3A3", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Atalhos
            </span>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={p.fn}
                style={{
                  padding: "6px 10px", background: "none", border: "none",
                  borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 400,
                  color: "#525252", fontFamily: "inherit", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {p.label}
              </button>
            ))}
            {(startDate || endDate) && (
              <>
                <div style={{ height: 1, background: "#F5F5F5", margin: "4px 0" }} />
                <button
                  type="button"
                  onClick={() => { onChange("", ""); setPicking("start"); }}
                  style={{
                    padding: "6px 10px", background: "none", border: "none",
                    borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 400,
                    color: "#DC2626", fontFamily: "inherit", textAlign: "left",
                  }}
                >
                  Limpar período
                </button>
              </>
            )}
          </div>

          {/* Calendar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 248 }}>
            {/* Selection indicator */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPicking("start")}
                style={{
                  flex: 1, padding: "6px 10px",
                  background: picking === "start" ? "#F0FDF4" : "#FAFAFA",
                  border: picking === "start" ? "1px solid #0F8F4E" : "1px solid #E5E5E5",
                  borderRadius: 10, cursor: "pointer", textAlign: "center",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  color: picking === "start" ? "#0F8F4E" : "#525252",
                }}
              >
                {startDate ? formatShort(startDate) : "Início"}
              </button>
              <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#A3A3A3" }}>→</span>
              <button
                type="button"
                onClick={() => setPicking("end")}
                style={{
                  flex: 1, padding: "6px 10px",
                  background: picking === "end" ? "#F0FDF4" : "#FAFAFA",
                  border: picking === "end" ? "1px solid #0F8F4E" : "1px solid #E5E5E5",
                  borderRadius: 10, cursor: "pointer", textAlign: "center",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  color: picking === "end" ? "#0F8F4E" : "#525252",
                }}
              >
                {endDate ? formatShort(endDate) : "Fim"}
              </button>
            </div>

            <CalendarGrid
              viewYear={viewYear}
              viewMonth={viewMonth}
              setViewYear={setViewYear}
              setViewMonth={setViewMonth}
              isSelected={(ds) => ds === startDate || ds === endDate}
              isInRange={isInRange}
              isRangeStart={(ds) => ds === startDate}
              isRangeEnd={(ds) => ds === endDate}
              onSelectDay={handleSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
}
