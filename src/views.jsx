// Week view + Inbox view + Someday view

function WeekView({
  weekStart, tasks, variant, showWeekend,
  accent, draggingId, onOpenTask,
  onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
  onDragStart, onDragEnd,
  onPrevWeek, onNextWeek, onToday,
  onChangeVariant,
}) {
  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i));
  const visibleDays = showWeekend ? days : days.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  const weekend = days.filter(d => d.getDay() === 0 || d.getDay() === 6);

  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const rangeLabel = sameMonth
    ? `${weekStart.getDate()}–${end.getDate()} ${MONTH_PT[weekStart.getMonth()]} ${end.getFullYear()}`
    : `${weekStart.getDate()} ${MONTH_PT[weekStart.getMonth()]} – ${end.getDate()} ${MONTH_PT[end.getMonth()]} ${end.getFullYear()}`;

  const overdueTasks = useMemo(() => {
    const out = [];
    Object.entries(tasks).forEach(([k, list]) => {
      if (k.startsWith("__")) return;
      const d = new Date(k + "T00:00:00");
      if (d < weekStart) {
        list.forEach(t => { if (!t.done) out.push({ ...t, _from: k }); });
      }
    });
    return out;
  }, [tasks, weekStart]);

  function pullAllOverdue() {
    const todayKey = isoDate(TODAY);
    overdueTasks.forEach(t => onMoveTask(t.id, todayKey));
  }

  const isColumns = variant === "columns";
  const sidePad   = isColumns ? "0 24px 24px" : variant === "manifesto" ? "0 48px 120px" : "0 32px 120px";

  return (
    <div style={{flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column"}}>
      {/* Header */}
      <div style={{
        padding: isColumns ? "24px 24px 16px" : variant === "manifesto" ? "32px 48px 20px" : "24px 32px 16px",
        flexShrink: 0,
      }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 20, marginBottom: overdueTasks.length > 0 ? 14 : 0,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 5,
            }}>Semana</div>
            {isColumns || variant === "manifesto" ? (
              <h1 style={{
                margin: 0, fontFamily: "var(--font-display)",
                fontSize: 32, fontWeight: 400, fontStyle: "italic",
                letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--ink)",
                whiteSpace: "nowrap",
              }}>
                {rangeLabel}
              </h1>
            ) : (
              <h1 style={{
                margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
                color: "var(--ink)", whiteSpace: "nowrap",
              }}>
                {rangeLabel}
              </h1>
            )}
          </div>

          <div style={{display: "flex", alignItems: "center", gap: 6}}>
            <button className="ghost-btn" onClick={onPrevWeek} title="Semana anterior (←)">
              <Icon.Arrow dir="left"/>
            </button>
            <button className="ghost-btn" onClick={onToday} style={{
              background: "var(--bg-sunken)", fontWeight: 600, fontSize: 12,
            }}>
              Hoje
            </button>
            <button className="ghost-btn" onClick={onNextWeek} title="Próxima semana (→)">
              <Icon.Arrow dir="right"/>
            </button>
            <span style={{width:1, height:18, background:"var(--line)", margin:"0 4px"}}/>
            <ViewModeToggle variant={variant} onChange={onChangeVariant}/>
          </div>
        </header>

        {overdueTasks.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, padding: "10px 14px",
            background: "var(--bg-raised)", boxShadow: "var(--ring)",
            borderRadius: 12,
            borderLeft: `3px solid var(--prio-high)`,
          }}>
            <div style={{display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0}}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--prio-high)",
              }}>atrasadas</span>
              <span style={{fontSize: 13, color: "var(--ink)", fontWeight: 500}}>
                {overdueTasks.length} tarefa{overdueTasks.length > 1 ? "s" : ""}
              </span>
              <span style={{
                fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {overdueTasks.slice(0,2).map(t => t.title).join(" · ")}
                {overdueTasks.length > 2 && " · …"}
              </span>
            </div>
            <button className="pill-btn" onClick={pullAllOverdue} style={{fontSize: 12, padding:"7px 14px"}}>
              <Icon.Arrow size={11}/> Puxar pra hoje
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {isColumns ? (
        <div style={{flex:1, minHeight:0, padding:"0 24px 24px", display:"flex", flexDirection:"column", gap:10}}>
          <div style={{flex:1, display:"flex", gap:10, minHeight:0}}>
            {visibleDays.map(d => {
              const key = isoDate(d);
              return (
                <DayColumn
                  key={key} date={d}
                  tasks={tasks[key] || []}
                  isToday={sameDay(d, TODAY)}
                  isWeekend={d.getDay() === 0 || d.getDay() === 6}
                  compact={showWeekend}
                  accent={accent}
                  draggingId={draggingId}
                  onOpenTask={onOpenTask}
                  onAddTask={onAddTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onMoveTask={onMoveTask}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              );
            })}
          </div>
          {!showWeekend && (
            <WeekendColumnsStrip
              days={weekend} tasks={tasks} accent={accent}
              draggingId={draggingId} onOpenTask={onOpenTask}
              onAddTask={onAddTask} onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask} onMoveTask={onMoveTask}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
            />
          )}
        </div>
      ) : (
        <div style={{flex:1, minHeight:0, overflowY:"auto", padding: sidePad}}>
          <div style={{display:"flex", flexDirection:"column", gap: variant === "quiet" ? 12 : 0}}>
            {visibleDays.map(d => {
              const key = isoDate(d);
              return (
                <DayRow
                  key={key} date={d}
                  tasks={tasks[key] || []}
                  variant={variant}
                  isToday={sameDay(d, TODAY)}
                  isWeekend={d.getDay() === 0 || d.getDay() === 6}
                  accent={accent}
                  draggingId={draggingId}
                  onOpenTask={onOpenTask}
                  onAddTask={onAddTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onMoveTask={onMoveTask}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              );
            })}
          </div>
          {!showWeekend && (
            <WeekendStrip
              days={weekend} tasks={tasks} variant={variant} accent={accent}
              draggingId={draggingId} onOpenTask={onOpenTask}
              onAddTask={onAddTask} onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask} onMoveTask={onMoveTask}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
            />
          )}
        </div>
      )}
    </div>
  );
}

function WeekendColumnsStrip({ days, tasks, accent, draggingId, onOpenTask,
  onAddTask, onUpdateTask, onDeleteTask, onMoveTask, onDragStart, onDragEnd }) {
  const [expanded, setExpanded] = useState(false);
  const totalTasks = days.reduce((sum, d) => sum + (tasks[isoDate(d)]?.length || 0), 0);
  return (
    <div style={{flexShrink: 0}}>
      <button onClick={() => setExpanded(e => !e)} className="ghost-btn"
        style={{fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", padding: "4px 10px", marginBottom: 6}}>
        <Icon.Chevron size={11} dir={expanded ? "down" : "right"}/>
        Fim de semana · {totalTasks} {totalTasks === 1 ? "tarefa" : "tarefas"}
      </button>
      {expanded && (
        <div style={{display: "flex", gap: 10, height: 200}}>
          {days.map(d => (
            <DayColumn key={isoDate(d)} date={d}
              tasks={tasks[isoDate(d)] || []}
              isToday={sameDay(d, TODAY)} isWeekend compact
              accent={accent} draggingId={draggingId} onOpenTask={onOpenTask}
              onAddTask={onAddTask} onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask} onMoveTask={onMoveTask}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekendStrip({
  days, tasks, variant, accent, draggingId, onOpenTask,
  onAddTask, onUpdateTask, onDeleteTask, onMoveTask, onDragStart, onDragEnd,
}) {
  const [expanded, setExpanded] = useState(false);
  const totalTasks = days.reduce((sum, d) => sum + (tasks[isoDate(d)]?.length || 0), 0);

  return (
    <div style={{
      marginTop: variant === "manifesto" ? 32 : 16,
      borderTop: "1px dashed var(--line-strong)",
      paddingTop: 16,
    }}>
      <button onClick={() => setExpanded(e => !e)} className="ghost-btn" style={{
        fontSize: 12, fontWeight: 600, color: "var(--ink-mute)",
        padding: "4px 10px", marginBottom: 12,
      }}>
        <Icon.Chevron size={12} dir={expanded ? "down" : "right"}/>
        Fim de semana · {totalTasks} {totalTasks === 1 ? "tarefa" : "tarefas"}
      </button>
      {expanded && (
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
          {days.map(d => {
            const key = isoDate(d);
            const dayTasks = tasks[key] || [];
            const amTasks = dayTasks.filter(t => t.slot !== "pm");
            const pmTasks = dayTasks.filter(t => t.slot === "pm");
            return (
              <div key={key} style={{
                padding: "14px 16px", borderRadius: 14,
                background: "var(--bg-sunken)",
              }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) onMoveTask(id, key); }}
              >
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "var(--ink-soft)",
                  marginBottom: 8, display: "flex", alignItems: "baseline", gap: 8,
                }}>
                  {DAY_NAMES_LONG_PT[d.getDay()]}
                  <span style={{fontSize: 11, fontWeight: 500, color: "var(--ink-mute)"}}>
                    {d.getDate()} {MONTH_PT[d.getMonth()]}
                  </span>
                </div>
                <div style={{display: "flex", flexDirection: "column"}}>
                  <div style={{display:"flex", flexDirection:"column", gap:2}}>
                    {amTasks.map(t => (
                      <TaskRow key={t.id} task={t} accent={accent} compact draggingId={draggingId}
                        onOpen={onOpenTask} onChange={onUpdateTask} onDelete={onDeleteTask}
                        onDragStart={onDragStart} onDragEnd={onDragEnd}/>
                    ))}
                    <InlineAdd compact onAdd={title => onAddTask(key, title, "am")} placeholder="+ manhã"/>
                  </div>
                  <LunchDivider/>
                  <div style={{display:"flex", flexDirection:"column", gap:2}}>
                    {pmTasks.map(t => (
                      <TaskRow key={t.id} task={t} accent={accent} compact draggingId={draggingId}
                        onOpen={onOpenTask} onChange={onUpdateTask} onDelete={onDeleteTask}
                        onDragStart={onDragStart} onDragEnd={onDragEnd}/>
                    ))}
                    <InlineAdd compact onAdd={title => onAddTask(key, title, "pm")} placeholder="+ tarde"/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* List view for Inbox / Someday */
function ListView({ title, subtitle, bucket, tasks, accent, draggingId, onOpenTask,
  onAddTask, onUpdateTask, onDeleteTask, onDragStart, onDragEnd }) {
  const list = tasks[bucket] || [];
  return (
    <div style={{flex:1, minWidth:0, overflowY:"auto", padding:"36px 48px 120px", maxWidth: 720}}>
      <div style={{marginBottom: 28}}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 6,
        }}>{subtitle}</div>
        <h1 style={{
          margin: 0, fontFamily: "var(--font-display)",
          fontSize: 44, fontWeight: 400, fontStyle: "italic",
          letterSpacing: "-0.02em", lineHeight: 1.0, color: "var(--ink)",
        }}>{title}</h1>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: 2}}>
        {list.map(t => (
          <TaskRow key={t.id} task={t} accent={accent} draggingId={draggingId}
            onOpen={onOpenTask}
            onChange={onUpdateTask} onDelete={onDeleteTask}
            onDragStart={onDragStart} onDragEnd={onDragEnd}/>
        ))}
        <InlineAdd onAdd={title => onAddTask(bucket, title)} autofocus={list.length === 0}/>
      </div>
    </div>
  );
}

/* Layout variant picker */
function ViewModeToggle({ variant, onChange }) {
  if (!onChange) return null;
  const opts = [
    { id: "manifesto", label: "Editorial" },
    { id: "quiet",     label: "Quieto"    },
    { id: "columns",   label: "Colunas"   },
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "var(--bg-sunken)", borderRadius: 999,
      padding: 3, boxShadow: "var(--ring)",
    }}>
      {opts.map(o => {
        const active = variant === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            border: 0, cursor: "pointer",
            padding: "4px 10px", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.01em", borderRadius: 999,
            background: active ? "var(--bg-raised)" : "transparent",
            color: active ? "var(--ink)" : "var(--ink-mute)",
            boxShadow: active ? "var(--ring)" : "none",
            fontFamily: "var(--font-body)",
            transition: "all .15s ease",
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

Object.assign(window, { WeekView, ListView });
