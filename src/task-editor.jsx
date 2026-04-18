// Task detail editor modal

function TaskEditor({ task, onChange, onClose, onDelete, accent, onMoveTask }) {
  const [draft, setDraft] = useState(task);
  const titleRef = useRef(null);
  useEffect(() => { if (titleRef.current) titleRef.current.focus(); }, []);

  // Keep draft in sync if parent pushes updates (e.g. checkbox elsewhere)
  useEffect(() => { setDraft(task); }, [task.id]);

  function update(patch) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  }

  function toggleTag(tag) {
    const has = draft.tags.includes(tag);
    update({ tags: has ? draft.tags.filter(t => t !== tag) : [...draft.tags, tag] });
  }

  function addSubtask() {
    update({ subtasks: [...draft.subtasks, { id: `s${Date.now()}`, title: "", done: false }] });
  }

  function updateSub(sid, patch) {
    update({ subtasks: draft.subtasks.map(s => s.id === sid ? { ...s, ...patch } : s) });
  }

  function removeSub(sid) {
    update({ subtasks: draft.subtasks.filter(s => s.id !== sid) });
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(20,20,17,0.32)",
      display: "grid", placeItems: "center",
      padding: 24,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 580,
          background: "var(--bg-raised)",
          borderRadius: 22,
          boxShadow: "var(--shadow-pop)",
          padding: 28,
          maxHeight: "90vh", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 20,
        }}>

        {/* Header */}
        <div style={{display: "flex", alignItems: "flex-start", gap: 12}}>
          <span style={{marginTop: 7, flexShrink: 0}}>
            <Checkbox checked={draft.done} onChange={v => update({done: v})} accent={accent}/>
          </span>
          <input
            ref={titleRef}
            value={draft.title}
            onChange={e => update({title: e.target.value})}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onClose(); }}}
            placeholder="Nome da tarefa"
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent", color: "var(--ink)",
              fontFamily: "var(--font-display)", fontStyle: "italic",
              fontSize: 28, fontWeight: 400, letterSpacing: "-0.01em",
              lineHeight: 1.15,
              textDecoration: draft.done ? "line-through" : "none",
              textDecorationColor: "var(--ink-faint)",
              padding: 0,
            }}
          />
          <button className="ghost-btn" onClick={onClose} style={{padding:"4px 9px", fontSize:18, lineHeight:1}}>×</button>
        </div>

        {/* Date + Slot */}
        <EditorSection label="Data e período">
          <div style={{display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start"}}>
            <EditorField label="Data">
              <input
                type="date"
                value={draft._date || ""}
                onChange={e => {
                  const val = e.target.value;
                  update({ _date: val });
                  if (val && onMoveTask) onMoveTask(draft.id, val);
                }}
                style={{
                  border: "1px solid var(--line-strong)",
                  borderRadius: 8, padding: "5px 10px",
                  background: "var(--bg-sunken)", color: "var(--ink)",
                  fontSize: 13, fontFamily: "var(--font-body)",
                  outline: "none",
                }}
              />
            </EditorField>
            <EditorField label="Período">
              <div style={{display: "flex", gap: 4}}>
                {[["am","Manhã"],["pm","Tarde"]].map(([v,label]) => {
                  const active = draft.slot === v;
                  return (
                    <button key={v} onClick={() => update({slot: v})} style={{
                      padding: "5px 12px", borderRadius: 9999,
                      border: "none", fontSize: 12, fontWeight: 600,
                      background: active ? (accent || "var(--accent)") : "var(--bg-sunken)",
                      color: active ? "#fff" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}>{label}</button>
                  );
                })}
              </div>
            </EditorField>
          </div>
        </EditorSection>

        {/* Priority + Recurring */}
        <EditorSection label="Propriedades">
          <div style={{display: "flex", gap: 16, flexWrap: "wrap"}}>
            <EditorField label="Prioridade">
              <div style={{display: "flex", gap: 4}}>
                {[[null,"—"],["high","P1"],["med","P2"],["low","P3"]].map(([v, label]) => {
                  const color = v === "high" ? "var(--prio-high)" : v === "med" ? "var(--prio-med)" : v === "low" ? "var(--prio-low)" : "var(--ink-mute)";
                  const active = draft.priority === v;
                  return (
                    <button key={String(v)} onClick={() => update({priority: v})} style={{
                      padding: "5px 10px", borderRadius: 9999,
                      border: "none", fontSize: 11, fontWeight: 700,
                      background: active ? color : "var(--bg-sunken)",
                      color: active ? "#fff" : "var(--ink-soft)",
                      cursor: "pointer", letterSpacing: "0.04em",
                    }}>{label}</button>
                  );
                })}
              </div>
            </EditorField>
            <EditorField label="Recorrência">
              <div style={{display: "flex", gap: 4, flexWrap: "wrap"}}>
                {[[null,"Nenhuma"],["daily","Diária"],["weekly","Semanal"],["monthly","Mensal"]].map(([v, label]) => {
                  const active = draft.recurring === v;
                  return (
                    <button key={String(v)} onClick={() => update({recurring: v})} style={{
                      padding: "5px 10px", borderRadius: 9999,
                      border: "none", fontSize: 11, fontWeight: 600,
                      background: active ? "var(--ink)" : "var(--bg-sunken)",
                      color: active ? "var(--bg-raised)" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}>{label}</button>
                  );
                })}
              </div>
            </EditorField>
          </div>
        </EditorSection>

        {/* Tags */}
        <EditorSection label="Tags">
          <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
            {Object.entries(TAGS).map(([key, tag]) => {
              const active = draft.tags.includes(key);
              return (
                <button key={key} onClick={() => toggleTag(key)} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 9999,
                  border: active ? "1.5px solid var(--ink)" : "1.5px solid var(--line-strong)",
                  background: active ? "var(--bg-sunken)" : "transparent",
                  color: "var(--ink)", fontSize: 12, fontWeight: 500,
                  letterSpacing: "-0.01em", cursor: "pointer",
                }}>
                  <span style={{width:8, height:8, borderRadius:9999, background: tag.color, flexShrink:0}}/>
                  {tag.label}
                </button>
              );
            })}
          </div>
        </EditorSection>

        {/* Subtasks */}
        <EditorSection label={`Subtarefas${draft.subtasks.length > 0 ? ` · ${draft.subtasks.filter(s=>s.done).length}/${draft.subtasks.length}` : ""}`}>
          <div style={{display: "flex", flexDirection: "column", gap: 5}}>
            {draft.subtasks.map(s => (
              <div key={s.id} style={{display: "flex", alignItems: "center", gap: 8}}>
                <Checkbox checked={s.done} onChange={v => updateSub(s.id, {done: v})} accent={accent}/>
                <input
                  value={s.title}
                  onChange={e => updateSub(s.id, {title: e.target.value})}
                  placeholder="Subtarefa…"
                  style={{
                    flex: 1, border: "none", outline: "none", background: "transparent",
                    fontSize: 14, color: "var(--ink)",
                    textDecoration: s.done ? "line-through" : "none",
                    textDecorationColor: "var(--ink-faint)",
                    padding: "4px 0",
                  }}
                />
                <button className="ghost-btn" onClick={() => removeSub(s.id)} style={{padding:"3px 6px"}}>
                  <Icon.Trash/>
                </button>
              </div>
            ))}
            <button onClick={addSubtask} className="ghost-btn" style={{
              padding: "6px 8px", fontSize: 12, justifyContent: "flex-start",
              color: "var(--ink-mute)",
            }}>
              <Icon.Plus size={12}/> Adicionar subtarefa
            </button>
          </div>
        </EditorSection>

        {/* Notes */}
        <EditorSection label="Notas">
          <textarea
            value={draft.note || ""}
            onChange={e => update({note: e.target.value})}
            placeholder="Contexto, links, detalhes…"
            rows={3}
            style={{
              width: "100%", resize: "vertical",
              border: "1px solid var(--line-strong)",
              borderRadius: 10, padding: "10px 12px",
              background: "var(--bg-sunken)", color: "var(--ink)",
              fontSize: 13, lineHeight: 1.6, fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
        </EditorSection>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 12, borderTop: "1px solid var(--line)",
        }}>
          <button onClick={() => { onDelete(task.id); onClose(); }}
            className="ghost-btn" style={{color: "var(--prio-high)", fontSize: 12}}>
            <Icon.Trash/> Excluir
          </button>
          <button onClick={onClose} className="pill-btn" style={{fontSize: 13, background: accent || "var(--accent)"}}>
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorSection({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--ink-mute)",
        marginBottom: 10,
      }}>{label}</div>
      {children}
    </div>
  );
}

function EditorField({ label, children }) {
  return (
    <div style={{display: "flex", flexDirection: "column", gap: 6}}>
      <span style={{fontSize: 11, color: "var(--ink-mute)"}}>{label}</span>
      {children}
    </div>
  );
}

Object.assign(window, { TaskEditor });
