// Task item component + shared hooks

const { useState, useRef, useEffect, useMemo, useCallback } = React;

/* ---- Icons ---- */
const Icon = {
  Check: ({size=12}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Plus: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Chevron: ({size=14, dir="right"}) => {
    const r = {right: 0, down: 90, left: 180, up: -90}[dir];
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{transform:`rotate(${r}deg)`}}>
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  },
  Repeat: ({size=12}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 6l2-2h6a2 2 0 012 2v1M13 10l-2 2H5a2 2 0 01-2-2V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Flag: ({size=12}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 2v12M4 3h7l-1.5 2.5L11 8H4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Drag: ({size=12}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="4" r="1.2" fill="currentColor"/>
      <circle cx="10" cy="4" r="1.2" fill="currentColor"/>
      <circle cx="6" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="10" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="6" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="10" cy="12" r="1.2" fill="currentColor"/>
    </svg>
  ),
  Trash: ({size=12}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9a1.5 1.5 0 001.5 1.4h2a1.5 1.5 0 001.5-1.4L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Arrow: ({size=12, dir="right"}) => {
    const r = {right:0, left:180, up:-90, down:90}[dir];
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{transform:`rotate(${r}deg)`}}>
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  },
  Inbox: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 9l2-5h8l2 5v4H2V9zM2 9h4l1 1h2l1-1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Someday: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Week: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Settings: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Sun: ({size=13}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Moon: ({size=13}) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M13 10A6 6 0 016 3a6 6 0 100 10 6 6 0 007-3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ---- Tag chip ---- */
function TagChip({ tag }) {
  const t = TAGS[tag];
  if (!t) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px 2px 6px",
      borderRadius: 9999,
      background: "var(--bg-sunken)",
      boxShadow: "inset 0 0 0 1px var(--line)",
      color: "var(--ink-soft)",
      fontSize: 11, fontWeight: 600,
      letterSpacing: "-0.01em",
    }}>
      <span style={{width:6, height:6, borderRadius:9999, background:t.color, flexShrink:0}}/>
      {t.label}
    </span>
  );
}

function TagDot({ tag }) {
  const t = TAGS[tag];
  if (!t) return null;
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8, borderRadius: 9999,
      background: t.color,
      boxShadow: "0 0 0 1.5px var(--bg)",
    }} title={t.label}/>
  );
}

/* ---- Checkbox ---- */
function Checkbox({ checked, onChange, accent }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      aria-pressed={checked}
      style={{
        width: 18, height: 18, flexShrink: 0,
        borderRadius: 5,
        border: "1.5px solid var(--line-strong)",
        background: checked ? (accent || "var(--accent)") : "transparent",
        color: checked ? "#fff" : "transparent",
        display: "grid", placeItems: "center",
        padding: 0,
        transition: "all 120ms ease",
      }}
    >
      <Icon.Check size={11}/>
    </button>
  );
}

/* ---- Priority flag ---- */
function PriorityFlag({ priority }) {
  if (!priority) return null;
  const color = priority === "high" ? "var(--prio-high)"
              : priority === "med"  ? "var(--prio-med)" : "var(--prio-low)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      color, fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      <Icon.Flag size={10}/>
      {priority === "high" ? "P1" : priority === "med" ? "P2" : "P3"}
    </span>
  );
}

/* ---- Task row ---- */
function TaskRow({
  task, onChange, onDelete, onDragStart, onDragEnd, draggingId,
  accent, compact = false, showDragHandle = true, onOpen,
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const subDone  = task.subtasks.filter(s => s.done).length;
  const subTotal = task.subtasks.length;

  function commit() {
    const v = draft.trim();
    if (v) onChange({ ...task, title: v });
    setEditing(false);
  }

  const isDragging = draggingId === task.id;

  return (
    <div
      className="task-row"
      draggable={!editing}
      onDragStart={(e) => {
        if (editing) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart?.(task.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: compact ? "7px 10px" : "10px 12px",
        borderRadius: 10,
        opacity: isDragging ? 0.35 : 1,
        background: "transparent",
        position: "relative",
        cursor: editing ? "text" : "grab",
        transition: "background 100ms ease",
      }}
      onMouseEnter={e => e.currentTarget.classList.add("hover")}
      onMouseLeave={e => e.currentTarget.classList.remove("hover")}
    >
      {showDragHandle && (
        <span className="drag-handle" style={{
          alignSelf: "center",
          color: "var(--ink-faint)",
          opacity: 0,
          transition: "opacity 100ms ease",
          marginLeft: -14, marginRight: -4,
        }}>
          <Icon.Drag/>
        </span>
      )}
      <span style={{ marginTop: 2, flexShrink: 0 }}>
        <Checkbox checked={task.done} onChange={v => onChange({...task, done: v})} accent={accent}/>
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                if (e.key === "Escape") { setDraft(task.title); setEditing(false); }
              }}
              style={{
                flex: 1, minWidth: 0,
                border: "none", outline: "none", background: "transparent",
                fontSize: compact ? 13 : 14, fontWeight: 500, letterSpacing: "-0.01em",
                lineHeight: 1.4,
                padding: 0, color: "var(--ink)",
              }}
            />
          ) : (
            <span
              onClick={(e) => { e.stopPropagation(); if (onOpen) onOpen(task); else setEditing(true); }}
              onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
              style={{
                fontSize: compact ? 13 : 14, fontWeight: 500, letterSpacing: "-0.01em",
                color: task.done ? "var(--ink-mute)" : "var(--ink)",
                textDecoration: task.done ? "line-through" : "none",
                textDecorationColor: "var(--ink-faint)",
                lineHeight: 1.4, wordBreak: "break-word",
                flex: 1,
              }}
            >
              {task.title}
            </span>
          )}

          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <PriorityFlag priority={task.priority}/>
            {task.recurring && (
              <span style={{color:"var(--ink-faint)", display:"inline-flex", alignItems:"center"}}>
                <Icon.Repeat/>
              </span>
            )}
          </span>
        </div>

        {(task.tags.length > 0 || subTotal > 0 || task.note) && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
            {task.tags.map(t => <TagChip key={t} tag={t}/>)}
            {subTotal > 0 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="ghost-btn"
                style={{ padding: "1px 7px", fontSize: 10, gap: 3 }}
              >
                <Icon.Chevron size={9} dir={expanded ? "down" : "right"}/>
                {subDone}/{subTotal}
              </button>
            )}
          </div>
        )}

        {expanded && task.subtasks.length > 0 && (
          <div style={{
            marginTop: 8, paddingLeft: 10,
            display: "flex", flexDirection: "column", gap: 5,
            borderLeft: "1.5px solid var(--line)",
          }}>
            {task.subtasks.map(s => (
              <div key={s.id} style={{display:"flex", alignItems:"center", gap:8}}>
                <Checkbox
                  checked={s.done}
                  onChange={v => onChange({
                    ...task,
                    subtasks: task.subtasks.map(x => x.id===s.id ? {...x, done:v} : x),
                  })}
                  accent={accent}
                />
                <span style={{
                  fontSize: 12,
                  color: s.done ? "var(--ink-mute)" : "var(--ink-soft)",
                  textDecoration: s.done ? "line-through" : "none",
                }}>{s.title}</span>
              </div>
            ))}
          </div>
        )}

        {expanded && task.note && (
          <div style={{
            marginTop: 6, fontSize: 12, color: "var(--ink-mute)",
            fontStyle: "italic", lineHeight: 1.5,
          }}>
            {task.note}
          </div>
        )}
      </div>

      <div className="row-actions" style={{
        opacity: 0, display: "flex", gap: 2, alignItems: "center",
        transition: "opacity 100ms ease", flexShrink: 0,
      }}>
        <button
          onClick={() => onDelete(task.id)}
          className="ghost-btn"
          style={{padding:"4px 6px", color:"var(--ink-mute)"}}
        >
          <Icon.Trash/>
        </button>
      </div>
    </div>
  );
}

/* ---- Inline add ---- */
function InlineAdd({ onAdd, placeholder = "Nova tarefa…", accent, compact = false, autofocus = false }) {
  const [active, setActive] = useState(autofocus);
  const [draft, setDraft] = useState("");
  const ref = useRef(null);

  useEffect(() => { if (active && ref.current) ref.current.focus(); }, [active]);

  function commit(keepOpen = false) {
    const v = draft.trim();
    if (v) onAdd(v);
    setDraft("");
    if (!keepOpen) setActive(false);
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="add-row"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: compact ? "7px 10px" : "9px 12px",
          color: "var(--ink-faint)", background: "transparent",
          border: "none", width: "100%", borderRadius: 10,
          fontSize: 13, fontWeight: 500, textAlign: "left",
          transition: "color 100ms ease, background 100ms ease",
        }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 5,
          border: "1.5px dashed var(--line-strong)",
          display: "grid", placeItems: "center", color: "inherit", flexShrink: 0,
        }}>
          <Icon.Plus size={10}/>
        </span>
        {placeholder}
      </button>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: compact ? "7px 10px" : "9px 12px",
      borderRadius: 10,
      background: "var(--bg-raised)",
      boxShadow: "var(--ring-strong)",
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5,
        border: `1.5px solid ${accent || "var(--accent)"}`,
        flexShrink: 0,
      }}/>
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(false)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(e.shiftKey); }
          if (e.key === "Escape") { setDraft(""); setActive(false); }
        }}
        placeholder="Digite e Enter (Shift+Enter pra adicionar outra)"
        style={{
          flex: 1, border: "none", outline: "none", background: "transparent",
          fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em",
        }}
      />
    </div>
  );
}

/* ---- Lunch divider ---- */
function LunchDivider() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      margin: "6px 0",
      userSelect: "none",
    }}>
      <div style={{flex: 1, height: 1, background: "var(--line)"}}/>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--ink-faint)",
        display: "flex", alignItems: "center", gap: 5,
        padding: "2px 8px",
        borderRadius: 9999,
        background: "var(--bg-sunken)",
        boxShadow: "inset 0 0 0 1px var(--line)",
      }}>
        <Icon.Sun size={9}/>
        almoço
      </span>
      <div style={{flex: 1, height: 1, background: "var(--line)"}}/>
    </div>
  );
}

Object.assign(window, {
  Icon, TagChip, TagDot, Checkbox, PriorityFlag, TaskRow, InlineAdd, LunchDivider,
});
