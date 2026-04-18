// Sidebar: week mini-calendar, views, backlog, someday

function MiniWeekStrip({ weekStart, isActive, onSelect, taskCountByDay, showWeekend }) {
  const days = Array.from({length:7}, (_,i) => addDays(weekStart, i));
  const visibleDays = showWeekend ? days : days.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  const end = addDays(weekStart, 6);
  const label = `${weekStart.getDate()} ${MONTH_PT[weekStart.getMonth()]} — ${end.getDate()} ${MONTH_PT[end.getMonth()]}`;

  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex", flexDirection: "column", gap: 6,
        padding: "10px 12px",
        borderRadius: 14,
        background: isActive ? "var(--bg-raised)" : "transparent",
        boxShadow: isActive ? "var(--ring)" : "none",
        border: "none", textAlign: "left",
        cursor: "pointer",
        transition: "background 120ms ease",
        width: "100%",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--line)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: isActive ? "var(--ink)" : "var(--ink-mute)",
        letterSpacing: "-0.01em",
      }}>
        {label}
      </div>
      <div style={{display: "flex", gap: 3}}>
        {visibleDays.map((d,i) => {
          const count = taskCountByDay[isoDate(d)] || 0;
          const isToday = sameDay(d, TODAY);
          return (
            <div key={i} style={{
              flex: 1,
              height: 24, borderRadius: 4,
              background: count > 0 ? "var(--ink-soft)" : "var(--line)",
              opacity: count === 0 ? 0.35 : Math.min(0.25 + count * 0.14, 1),
              outline: isToday ? `1.5px solid var(--accent)` : "none",
              outlineOffset: 1,
            }}/>
          );
        })}
      </div>
    </button>
  );
}

function ViewButton({ icon, label, count, active, onClick, accent, collapsed }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: collapsed ? "10px 0" : "9px 12px", borderRadius: 10,
        border: "none",
        background: active ? "var(--bg-raised)" : "transparent",
        boxShadow: active ? "var(--ring)" : "none",
        color: "var(--ink)",
        fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em",
        width: "100%", textAlign: collapsed ? "center" : "left",
        justifyContent: collapsed ? "center" : "flex-start",
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--line)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{color: active ? (accent || "var(--ink)") : "var(--ink-mute)"}}>{icon}</span>
      {!collapsed && <span style={{flex:1}}>{label}</span>}
      {!collapsed && count != null && count > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 600, color: "var(--ink-mute)",
          background: "var(--bg-sunken)", borderRadius: 9999,
          padding: "1px 7px", minWidth: 18, textAlign: "center",
        }}>{count}</span>
      )}
    </button>
  );
}

function Sidebar({
  view, onViewChange,
  activeWeekStart, onWeekSelect,
  tasks, showWeekend, onToggleWeekend,
  dark, onToggleDark,
  variant, onToggleVariant,
  accent,
  collapsed, onToggleCollapsed,
}) {
  const currentMonday = startOfWeek(TODAY, 1);
  const weeks = useMemo(() => {
    const arr = [];
    for (let i = -4; i <= 8; i++) {
      arr.push(addDays(currentMonday, i*7));
    }
    return arr;
  }, []);

  const countByDay = useMemo(() => {
    const map = {};
    Object.entries(tasks).forEach(([k, list]) => {
      if (k.startsWith("__")) return;
      map[k] = list.length;
    });
    return map;
  }, [tasks]);

  const inboxCount   = tasks.__inbox?.length || 0;
  const somedayCount = tasks.__someday?.length || 0;

  return (
    <aside style={{
      width: collapsed ? 54 : 260, flexShrink: 0,
      background: "var(--bg-sunken)",
      borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column",
      height: "100vh",
      transition: "width 200ms ease",
      overflow: "hidden",
    }}>
      {/* Brand + collapse toggle */}
      <div style={{
        padding: collapsed ? "16px 14px 14px" : "16px 14px 14px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: "1px solid var(--line)",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{display:"flex", alignItems:"center", gap:8, minWidth:0}}>
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              background: accent || "var(--accent)",
              display: "grid", placeItems: "center",
              color: "var(--accent-ink)", fontWeight: 700, fontSize: 13,
              fontFamily: "var(--font-display)", fontStyle:"italic", flexShrink: 0,
            }}>w</span>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-0.02em",
              fontStyle: "italic", color: "var(--ink)", whiteSpace: "nowrap",
            }}>weeklist</span>
          </div>
        )}
        <button onClick={onToggleCollapsed} className="ghost-btn"
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          style={{padding:"6px 7px", color:"var(--ink-mute)", flexShrink:0}}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
            style={{transform:`rotate(${collapsed?180:0}deg)`, transition:"transform 200ms ease"}}>
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* View navigation */}
      <div style={{padding: collapsed ? "10px 6px" : "10px 10px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0}}>
        <ViewButton collapsed={collapsed} icon={<Icon.Week/>} label="Semana" active={view==="week"}
          onClick={() => onViewChange("week")} accent={accent}/>
        <ViewButton collapsed={collapsed} icon={<Icon.Inbox/>} label="Inbox" count={inboxCount}
          active={view==="inbox"} onClick={() => onViewChange("inbox")} accent={accent}/>
        <ViewButton collapsed={collapsed} icon={<Icon.Someday/>} label="Alguma hora" count={somedayCount}
          active={view==="someday"} onClick={() => onViewChange("someday")} accent={accent}/>
      </div>

      {collapsed && <div style={{flex:1}}/>}

      {/* Mini week strips */}
      {!collapsed && (
        <div style={{
          padding: "4px 10px 6px",
          borderTop: "1px solid var(--line)",
          marginTop: 2, flexShrink: 0,
        }}>
          <div style={{
            padding: "8px 8px 4px",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--ink-mute)",
          }}>Semanas</div>
        </div>
      )}
      {!collapsed && (
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "0 10px 10px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {weeks.map((w, i) => (
            <MiniWeekStrip
              key={i}
              weekStart={w}
              isActive={view === "week" && sameDay(w, activeWeekStart)}
              onSelect={() => { onViewChange("week"); onWeekSelect(w); }}
              taskCountByDay={countByDay}
              showWeekend={showWeekend}
            />
          ))}
        </div>
      )}

      {/* Footer controls */}
      {!collapsed && (
        <div style={{
          borderTop: "1px solid var(--line)",
          padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 8, flexShrink: 0,
        }}>
          <ToggleRow label="Fim de semana" on={showWeekend} onChange={onToggleWeekend}/>
          <ToggleRow label="Modo escuro" on={dark} onChange={onToggleDark}/>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 12, color: "var(--ink-soft)", padding: "2px 0",
          }}>
            <span>Layout</span>
            <button onClick={onToggleVariant} className="ghost-btn" style={{
              padding: "3px 10px", fontSize: 11, fontWeight: 600,
              background: "var(--bg-raised)", boxShadow: "var(--ring)",
            }}>
              {variant === "manifesto" ? "Editorial" : variant === "quiet" ? "Quieto" : "Colunas"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function ToggleRow({ label, on, onChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontSize: 12, color: "var(--ink-soft)", padding: "2px 0",
    }}>
      <span>{label}</span>
      <Toggle on={on} onChange={onChange}/>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 30, height: 18, borderRadius: 9999,
        background: on ? "var(--accent)" : "var(--line-strong)",
        border: "none", padding: 0, position: "relative",
        transition: "background 150ms ease",
        cursor: "pointer", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2,
        left: on ? 14 : 2,
        width: 14, height: 14, borderRadius: 9999,
        background: on ? "var(--accent-ink)" : "var(--bg-raised)",
        transition: "left 150ms ease",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }}/>
    </button>
  );
}

Object.assign(window, { Sidebar, MiniWeekStrip, Toggle });
