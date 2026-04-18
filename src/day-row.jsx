// Day row — weekly layout element.
// Variants: "manifesto" (serif editorial), "quiet" (TeuxDeux rows), "columns" (kanban).
// Each day is split into morning (am) and afternoon (pm) by a lunch divider.

function DayRow({
  date, tasks, variant = "manifesto", isToday, isWeekend, compact = false,
  accent, draggingId, onOpenTask,
  onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
  onDragStart, onDragEnd,
}) {
  const [dragOver, setDragOver] = useState(false);
  const dayIdx   = date.getDay();
  const dayName  = DAY_NAMES_LONG_PT[dayIdx];
  const dayNum   = date.getDate();

  const amTasks = tasks.filter(t => t.slot !== "pm");
  const pmTasks = tasks.filter(t => t.slot === "pm");
  const completed = tasks.filter(t => t.done).length;
  const total     = tasks.length;
  const allDone   = total > 0 && completed === total;

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragOver) setDragOver(true);
  }
  function handleDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMoveTask(id, isoDate(date));
    setDragOver(false);
  }

  const taskProps = {
    accent, draggingId, onOpen: onOpenTask,
    onChange: onUpdateTask, onDelete: onDeleteTask,
    onDragStart, onDragEnd,
  };

  const addAM = (title) => {
    const t = makeTask(title);
    t.slot = "am";
    onAddTask(isoDate(date), title, "am");
  };
  const addPM = (title) => {
    onAddTask(isoDate(date), title, "pm");
  };

  /* ---- Manifesto ---- */
  if (variant === "manifesto") {
    return (
      <section
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "140px 1fr" : "180px 1fr",
          gap: compact ? 16 : 32,
          padding: compact ? "20px 0" : "28px 0",
          borderTop: "1px solid var(--line)",
          background: dragOver ? "var(--accent-soft)" : "transparent",
          borderRadius: dragOver ? 12 : 0,
          transition: "background 120ms ease",
        }}
      >
        {/* Day label */}
        <div style={{paddingTop: 2}}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: compact ? 38 : 52,
            fontWeight: 400, fontStyle: "italic",
            lineHeight: 0.95, letterSpacing: "-0.015em",
            color: isWeekend && !isToday ? "var(--ink-mute)" : "var(--ink)",
          }}>
            {dayName.toLowerCase()}
          </div>
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center", gap: 10,
            fontSize: 11, fontWeight: 500, color: "var(--ink-mute)",
          }}>
            <span style={{fontFamily: "var(--font-mono)"}}>
              {String(dayNum).padStart(2,"0")}·{MONTH_PT[date.getMonth()]}
            </span>
            {total > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: allDone ? "var(--accent)" : "var(--ink-mute)",
                fontFamily: "var(--font-mono)",
              }}>
                {completed}/{total}
              </span>
            )}
            {isToday && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.12em",
                color: "var(--accent)",
                borderTop: "1px solid var(--accent)",
                borderBottom: "1px solid var(--accent)",
                padding: "1px 6px",
              }}>hoje</span>
            )}
          </div>
        </div>

        {/* Tasks (am + lunch divider + pm) */}
        <div style={{display: "flex", flexDirection: "column", paddingRight: 8}}>
          <div style={{display: "flex", flexDirection: "column", gap: 2}}>
            {amTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
            <InlineAdd onAdd={addAM} placeholder={amTasks.length === 0 ? "Manhã…" : "+"}/>
          </div>
          <LunchDivider/>
          <div style={{display: "flex", flexDirection: "column", gap: 2}}>
            {pmTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
            <InlineAdd onAdd={addPM} placeholder={pmTasks.length === 0 ? "Tarde…" : "+"}/>
          </div>
        </div>
      </section>
    );
  }

  /* ---- Quiet (TeuxDeux) ---- */
  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: isToday ? "var(--bg-raised)" : "transparent",
        boxShadow: isToday ? "var(--ring)" : "none",
        border: dragOver ? `1.5px solid ${accent}` : "1.5px solid transparent",
        transition: "background 120ms ease, border 120ms ease",
      }}
    >
      {/* Day header */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10,
        paddingBottom: 8, borderBottom: "1px solid var(--line)",
      }}>
        <span style={{
          fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em",
          color: isWeekend && !isToday ? "var(--ink-mute)" : "var(--ink)",
        }}>
          {dayName}
        </span>
        <span style={{fontSize: 12, fontWeight: 500, color: "var(--ink-mute)"}}>
          {dayNum} {MONTH_PT[date.getMonth()]}
        </span>
        {isToday && (
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: accent,
            borderBottom: `1.5px solid ${accent}`, paddingBottom: 1,
          }}>hoje</span>
        )}
        <span style={{flex: 1}}/>
        {total > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 500, color: "var(--ink-mute)",
            fontFamily: "var(--font-mono)",
          }}>
            {completed}/{total}
          </span>
        )}
      </div>

      <div style={{display: "flex", flexDirection: "column"}}>
        <div style={{display: "flex", flexDirection: "column", gap: 2}}>
          {amTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps}/>)}
          <InlineAdd compact onAdd={addAM} placeholder={amTasks.length === 0 ? "Manhã…" : "+"}/>
        </div>
        <LunchDivider/>
        <div style={{display: "flex", flexDirection: "column", gap: 2}}>
          {pmTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps}/>)}
          <InlineAdd compact onAdd={addPM} placeholder={pmTasks.length === 0 ? "Tarde…" : "+"}/>
        </div>
      </div>
    </section>
  );
}

/* ---- Columns variant — kanban per day ---- */
function DayColumn({
  date, tasks, isToday, isWeekend, compact = false,
  accent, draggingId, onOpenTask,
  onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
  onDragStart, onDragEnd,
}) {
  const [dragOver, setDragOver] = useState(false);
  const dayIdx  = date.getDay();
  const dayShort = DAY_NAMES_PT[dayIdx];
  const dayNum  = date.getDate();
  const completed = tasks.filter(t => t.done).length;
  const total     = tasks.length;

  const amTasks = tasks.filter(t => t.slot !== "pm");
  const pmTasks = tasks.filter(t => t.slot === "pm");

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragOver) setDragOver(true);
  }
  function handleDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMoveTask(id, isoDate(date));
    setDragOver(false);
  }

  const taskProps = {
    accent, draggingId, compact: true, showDragHandle: false,
    onOpen: onOpenTask,
    onChange: onUpdateTask, onDelete: onDeleteTask,
    onDragStart, onDragEnd,
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        flex: compact ? "0 0 200px" : "1 1 0",
        minWidth: compact ? 200 : 170,
        display: "flex", flexDirection: "column",
        background: isToday ? "var(--bg-raised)" : "var(--bg-sunken)",
        borderRadius: 14,
        boxShadow: isToday ? "var(--ring-strong)" : "var(--ring)",
        border: dragOver ? `1.5px solid ${accent}` : "1.5px solid transparent",
        transition: "border 120ms ease",
        overflow: "hidden",
        opacity: isWeekend && !isToday ? 0.88 : 1,
      }}
    >
      {/* Column header */}
      <div style={{
        padding: "10px 12px 8px",
        borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "baseline", gap: 8,
        background: isToday ? "var(--bg-raised)" : "transparent",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: 18, fontWeight: 400, fontStyle: "italic",
          letterSpacing: "-0.01em",
          color: isToday ? (accent || "var(--accent)") : "var(--ink)",
        }}>
          {dayShort.toLowerCase()}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 500, color: "var(--ink-mute)",
          fontFamily: "var(--font-mono)",
        }}>
          {String(dayNum).padStart(2,"0")}
        </span>
        <span style={{flex: 1}}/>
        {total > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 500,
            color: completed === total ? (accent || "var(--accent)") : "var(--ink-mute)",
            fontFamily: "var(--font-mono)",
          }}>
            {completed}/{total}
          </span>
        )}
      </div>

      {/* Column content */}
      <div style={{
        flex: 1, padding: "6px 6px 4px",
        display: "flex", flexDirection: "column",
        overflowY: "auto", minHeight: 100,
      }}>
        {amTasks.map(t => (
          <div key={t.id} style={{background:"var(--bg)", borderRadius:8, padding:1, boxShadow:"var(--ring)", marginBottom:3}}>
            <TaskRow task={t} {...taskProps}/>
          </div>
        ))}
        <InlineAdd compact onAdd={title => onAddTask(isoDate(date), title, "am")} placeholder="+ manhã"/>

        <div style={{margin:"4px 4px", height:1, background:"var(--line)"}}/>
        <div style={{
          fontSize:8, fontWeight:700, letterSpacing:"0.12em",
          textTransform:"uppercase", color:"var(--ink-faint)",
          padding:"0 4px 3px", display:"flex", alignItems:"center", gap:4,
        }}>
          <Icon.Sun size={8}/> tarde
        </div>

        {pmTasks.map(t => (
          <div key={t.id} style={{background:"var(--bg)", borderRadius:8, padding:1, boxShadow:"var(--ring)", marginBottom:3}}>
            <TaskRow task={t} {...taskProps}/>
          </div>
        ))}
        <InlineAdd compact onAdd={title => onAddTask(isoDate(date), title, "pm")} placeholder="+ tarde"/>
      </div>
    </section>
  );
}

Object.assign(window, { DayRow, DayColumn });
