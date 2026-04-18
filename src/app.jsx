// Main Weeklist app

function App() {
  const [tasks, setTasks]     = useState(() => buildInitialTasks());
  const [view, setView]       = useState("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(TODAY, 1));
  const [showWeekend, setShowWeekend] = useState(() => {
    const v = localStorage.getItem("wl_weekend");
    return v === null ? true : v === "1";
  });
  const [dark, setDark]       = useState(() => localStorage.getItem("wl_dark") === "1");
  const [variant, setVariant] = useState(() => localStorage.getItem("wl_variant") || "manifesto");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("wl_sidebar_collapsed") === "1"
  );
  const [draggingId, setDraggingId] = useState(null);
  const [tweaksPanel, setTweaksPanel] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Persist preferences
  useEffect(() => { localStorage.setItem("wl_weekend", showWeekend ? "1" : "0"); }, [showWeekend]);
  useEffect(() => { localStorage.setItem("wl_dark", dark ? "1" : "0"); }, [dark]);
  useEffect(() => { localStorage.setItem("wl_variant", variant); }, [variant]);
  useEffect(() => { localStorage.setItem("wl_sidebar_collapsed", sidebarCollapsed ? "1" : "0"); }, [sidebarCollapsed]);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // Accent per variant
  const accent = variant === "manifesto" ? "var(--accent)"
              : variant === "quiet"     ? "var(--accent-2)"
              : "var(--accent-3)";

  useEffect(() => {
    const root = document.documentElement;
    ["--accent","--accent-ink","--accent-soft"].forEach(k => root.style.removeProperty(k));
    if (variant === "quiet") {
      root.style.setProperty("--accent", "#b8643c");
      root.style.setProperty("--accent-ink", "#ffffff");
      root.style.setProperty("--accent-soft", "#f3dccb");
    } else if (variant === "columns") {
      root.style.setProperty("--accent", "#3d4a5c");
      root.style.setProperty("--accent-ink", "#ffffff");
      root.style.setProperty("--accent-soft", "#dde3ec");
    }
  }, [variant]);

  // Design tool tweaks bridge
  useEffect(() => {
    function onMsg(e) {
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "__activate_edit_mode")   setTweaksPanel(true);
      if (d.type === "__deactivate_edit_mode") setTweaksPanel(false);
    }
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (view !== "week") return;
      if (e.key === "ArrowLeft"  || e.key === "h") { setWeekStart(w => addDays(w, -7)); e.preventDefault(); }
      if (e.key === "ArrowRight" || e.key === "l") { setWeekStart(w => addDays(w, 7));  e.preventDefault(); }
      if (e.key === "t" || e.key === "T") { setWeekStart(startOfWeek(TODAY, 1)); e.preventDefault(); }
      if (e.key === "w" || e.key === "W") { setShowWeekend(s => !s); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  /* ---- Task actions ---- */
  function addTask(bucketKey, title, slot = "am") {
    setTasks(prev => {
      const t = makeTask(title);
      t.slot = slot;
      const next = { ...prev };
      next[bucketKey] = [...(prev[bucketKey] || []), t];
      return next;
    });
  }

  function updateTask(nt) {
    setTasks(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k].some(t => t.id === nt.id)) {
          next[k] = next[k].map(t => t.id === nt.id ? nt : t);
          break;
        }
      }
      return next;
    });
    setEditingTask(prev => prev && prev.id === nt.id ? nt : prev);
  }

  function deleteTask(id) {
    setTasks(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k].some(t => t.id === id)) {
          next[k] = next[k].filter(t => t.id !== id);
          break;
        }
      }
      return next;
    });
  }

  function moveTask(id, toKey) {
    setTasks(prev => {
      const next = { ...prev };
      let task = null, fromKey = null;
      for (const k of Object.keys(next)) {
        const idx = next[k].findIndex(t => t.id === id);
        if (idx >= 0) { task = next[k][idx]; fromKey = k; break; }
      }
      if (!task || fromKey === toKey) return prev;
      next[fromKey] = next[fromKey].filter(t => t.id !== id);
      next[toKey] = [...(next[toKey] || []), task];
      return next;
    });
  }

  const sharedProps = {
    tasks, accent, draggingId,
    onOpenTask: setEditingTask,
    onAddTask: addTask,
    onUpdateTask: updateTask,
    onDeleteTask: deleteTask,
    onMoveTask: moveTask,
    onDragStart: setDraggingId,
    onDragEnd: () => setDraggingId(null),
  };

  return (
    <div style={{display: "flex", height: "100vh", background: "var(--bg)", color: "var(--ink)"}}>
      <Sidebar
        view={view} onViewChange={setView}
        activeWeekStart={weekStart} onWeekSelect={setWeekStart}
        tasks={tasks}
        showWeekend={showWeekend} onToggleWeekend={setShowWeekend}
        dark={dark} onToggleDark={setDark}
        variant={variant}
        onToggleVariant={() => setVariant(v => v === "manifesto" ? "quiet" : v === "quiet" ? "columns" : "manifesto")}
        accent={accent}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(v => !v)}
      />

      <main style={{flex: 1, minWidth: 0, display: "flex", flexDirection: "column"}}>
        {view === "week" && (
          <WeekView
            weekStart={weekStart}
            variant={variant} showWeekend={showWeekend}
            onChangeVariant={setVariant}
            onPrevWeek={() => setWeekStart(w => addDays(w, -7))}
            onNextWeek={() => setWeekStart(w => addDays(w, 7))}
            onToday={() => setWeekStart(startOfWeek(TODAY, 1))}
            {...sharedProps}
          />
        )}

        {view === "inbox" && (
          <ListView
            title="inbox"
            subtitle="Sem data · capture rápido"
            bucket="__inbox"
            {...sharedProps}
          />
        )}

        {view === "someday" && (
          <ListView
            title="alguma hora"
            subtitle="Sem compromisso · talvez um dia"
            bucket="__someday"
            {...sharedProps}
          />
        )}
      </main>

      {tweaksPanel && (
        <TweaksPanel
          showWeekend={showWeekend} onToggleWeekend={setShowWeekend}
          dark={dark} onToggleDark={setDark}
          variant={variant} onToggleVariant={setVariant}
          onClose={() => setTweaksPanel(false)}
        />
      )}

      {editingTask && (
        <TaskEditor
          task={editingTask}
          accent={accent}
          onChange={updateTask}
          onDelete={deleteTask}
          onClose={() => setEditingTask(null)}
          onMoveTask={moveTask}
        />
      )}
    </div>
  );
}

function TweaksPanel({ showWeekend, onToggleWeekend, dark, onToggleDark, variant, onToggleVariant, onClose }) {
  function send(edits) {
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
  }
  return (
    <div style={{
      position: "fixed", right: 16, bottom: 16, zIndex: 50,
      width: 280, padding: 18,
      background: "var(--bg-raised)", borderRadius: 18,
      boxShadow: "var(--shadow-pop)", color: "var(--ink)",
    }}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
        <strong style={{fontFamily:"var(--font-display)", fontSize:16, letterSpacing:"-0.02em", fontStyle:"italic"}}>
          Tweaks
        </strong>
        <button className="ghost-btn" onClick={onClose} style={{padding:"2px 8px", fontSize:14}}>×</button>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        <TweakRow label="Layout">
          <div style={{display:"flex", gap:4}}>
            {[["manifesto","Editorial"],["quiet","Quieto"],["columns","Colunas"]].map(([v,label]) => (
              <button key={v} onClick={() => { onToggleVariant(v); send({variant:v}); }} style={{
                padding:"4px 9px", borderRadius:9999, border:"none",
                fontSize:11, fontWeight:600,
                background: variant===v ? "var(--ink)" : "var(--bg-sunken)",
                color: variant===v ? "var(--bg-raised)" : "var(--ink-soft)",
                cursor:"pointer",
              }}>{label}</button>
            ))}
          </div>
        </TweakRow>
        <TweakRow label="Fim de semana">
          <Toggle on={showWeekend} onChange={v => { onToggleWeekend(v); send({showWeekend:v}); }}/>
        </TweakRow>
        <TweakRow label="Modo escuro">
          <Toggle on={dark} onChange={v => { onToggleDark(v); send({dark:v}); }}/>
        </TweakRow>
      </div>

      <div style={{
        marginTop:14, paddingTop:10, borderTop:"1px solid var(--line)",
        fontSize:11, color:"var(--ink-mute)", lineHeight:1.6,
      }}>
        <kbd>←</kbd> <kbd>→</kbd> semana · <kbd>t</kbd> hoje · <kbd>w</kbd> fim-de-semana
      </div>
    </div>
  );
}

function TweakRow({ label, children }) {
  return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:13, color:"var(--ink-soft)"}}>
      <span>{label}</span>
      {children}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
