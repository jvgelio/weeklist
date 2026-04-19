import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { startOfWeek, addDays, isoDate } from '../lib/constants'
import type { Task, TaskMap, View, Variant } from '../lib/types'
import {
  useWeekTasks,
  useBucketTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useMoveTask,
} from '../hooks/use-tasks'
import { Sidebar } from './sidebar'
import { WeekView, ListView } from './views'
import { TaskEditor } from './task-editor'
import { TaskRow } from './task-components'

const TODAY = new Date()

// ---- Accent per variant ----

function accentForVariant(variant: Variant): string {
  if (variant === 'quiet')   return '#b8643c'
  if (variant === 'columns') return '#3d4a5c'
  return 'var(--accent)'
}

function applyAccentCSS(variant: Variant) {
  const root = document.documentElement
  ;['--accent', '--accent-ink', '--accent-soft'].forEach(k => root.style.removeProperty(k))
  if (variant === 'quiet') {
    root.style.setProperty('--accent', '#b8643c')
    root.style.setProperty('--accent-ink', '#ffffff')
    root.style.setProperty('--accent-soft', '#f3dccb')
  } else if (variant === 'columns') {
    root.style.setProperty('--accent', '#3d4a5c')
    root.style.setProperty('--accent-ink', '#ffffff')
    root.style.setProperty('--accent-soft', '#dde3ec')
  }
}

// ---- App ----

export default function App() {
  const [view, setView]       = useState<View>('week')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(TODAY, 1))
  const [showWeekend, setShowWeekend] = useState(() => {
    const v = localStorage.getItem('wl_weekend')
    return v === null ? true : v === '1'
  })
  const [dark, setDark]         = useState(() => localStorage.getItem('wl_dark') === '1')
  const [variant, setVariant]   = useState<Variant>(() => {
    const v = localStorage.getItem('wl_variant')
    return (v === 'quiet' || v === 'columns') ? v : 'columns'
  })
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('wl_sidebar_collapsed') === '1')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)

  // Preferences persistence
  useEffect(() => { localStorage.setItem('wl_weekend', showWeekend ? '1' : '0') }, [showWeekend])
  useEffect(() => { localStorage.setItem('wl_dark', dark ? '1' : '0') }, [dark])
  useEffect(() => { localStorage.setItem('wl_variant', variant) }, [variant])
  useEffect(() => { localStorage.setItem('wl_sidebar_collapsed', collapsed ? '1' : '0') }, [collapsed])

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  // Accent CSS vars
  useEffect(() => { applyAccentCSS(variant) }, [variant])

  const accent = accentForVariant(variant)

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (view !== 'week') return
      if (e.key === 'ArrowLeft'  || e.key === 'h') { setWeekStart(w => addDays(w, -7)); e.preventDefault() }
      if (e.key === 'ArrowRight' || e.key === 'l') { setWeekStart(w => addDays(w, 7));  e.preventDefault() }
      if (e.key === 't' || e.key === 'T') { setWeekStart(startOfWeek(TODAY, 1)); e.preventDefault() }
      if (e.key === 'w' || e.key === 'W') { setShowWeekend(s => !s); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  // ---- Data queries ----

  const weekResult    = useWeekTasks(weekStart)
  const inboxResult   = useBucketTasks('__inbox')

  const weekTasks:   TaskMap = weekResult.data ?? {}
  const inboxTasks:  Task[]  = inboxResult.data ?? []

  // Build TaskMap shapes for views that expect it
  const inboxMap:   TaskMap = { __inbox: inboxTasks }

  // Sidebar needs a merged map for the mini-calendar density
  const sidebarMap: TaskMap = { ...weekTasks, __inbox: inboxTasks }

  // ---- Mutations ----

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const moveTask   = useMoveTask()

  function handleAddTask(bucketKey: string, title: string, slot: 'am' | 'pm' = 'am') {
    const tasksInBucket = weekTasks[bucketKey] ?? inboxTasks ?? []
    const position = tasksInBucket.length
    createTask.mutate({ title, bucketKey, slot, position })
  }

  function handleAddBucketTask(bucketKey: string, title: string) {
    const list = inboxTasks
    createTask.mutate({ title, bucketKey, position: list.length })
  }

  function handleUpdateTask(task: Task) {
    updateTask.mutate({
      id: task.id,
      data: {
        title:     task.title,
        done:      task.done,
        slot:      task.slot,
        priority:  task.priority,
        recurring: task.recurring,
        tags:      task.tags,
        note:      task.note,
      },
    })
    // keep editor in sync optimistically
    setEditingTask(prev => prev?.id === task.id ? task : prev)
  }

  function handleDeleteTask(id: string) {
    deleteTask.mutate(id)
  }

  function handleMoveTask(id: string, bucketKey: string) {
    // Find current task to know its position; drop at end of target
    const allTasks = [
      ...Object.values(weekTasks).flat(),
      ...inboxTasks,
    ]
    const task = allTasks.find(t => t.id === id)
    if (!task || task.bucketKey === bucketKey) return
    const targetList = weekTasks[bucketKey] ?? inboxTasks
    moveTask.mutate({ id, bucketKey, position: targetList.length })
  }

  // ---- DnD ----

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const allTasks = [
      ...Object.values(weekTasks).flat(),
      ...inboxTasks,
    ]
    setDraggingTask(allTasks.find(t => t.id === id) ?? null)
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const overId = over.id as string

    const allTasks = [
      ...Object.values(weekTasks).flat(),
      ...inboxTasks,
    ]

    const task = allTasks.find(t => t.id === taskId)
    if (!task) return

    // Determine target bucket
    const isBucketKey = /^\d{4}-\d{2}-\d{2}$/.test(overId) || overId.startsWith('weeklist-') || overId.startsWith('__')

    if (isBucketKey) {
      if (task.bucketKey === overId) return
      const targetList = weekTasks[overId] ?? inboxTasks
      moveTask.mutate({ id: taskId, bucketKey: overId, position: targetList.length })
    } else {
      // Dropped over another task — find its bucket and position
      const overTask = allTasks.find(t => t.id === overId)
      if (!overTask) return
      const targetBucket = overTask.bucketKey
      const targetList = weekTasks[targetBucket] ?? inboxTasks
      const overIndex = targetList.findIndex(t => t.id === overId)
      const newPosition = overIndex >= 0 ? overIndex : targetList.length
      moveTask.mutate({ id: taskId, bucketKey: targetBucket, position: newPosition })
    }
  }, [weekTasks, inboxTasks, moveTask])

  // ---- Shared props ----

  const sharedDayProps = {
    accent,
    onOpenTask: setEditingTask,
    onUpdateTask: handleUpdateTask,
    onDeleteTask: handleDeleteTask,
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
        <Sidebar
          view={view} onViewChange={setView}
          activeWeekStart={weekStart} onWeekSelect={setWeekStart}
          taskMap={sidebarMap}
          showWeekend={showWeekend}
          accent={accent}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(v => !v)}
        />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {view === 'week' && (
            <WeekView
              weekStart={weekStart}
              tasks={weekTasks}
              variant={variant}
              showWeekend={showWeekend}
              dark={dark}
              onChangeVariant={setVariant}
              onToggleWeekend={() => setShowWeekend(s => !s)}
              onToggleDark={() => setDark(d => !d)}
              onPrevWeek={() => setWeekStart(w => addDays(w, -7))}
              onNextWeek={() => setWeekStart(w => addDays(w, 7))}
              onToday={() => setWeekStart(startOfWeek(TODAY, 1))}
              onAddTask={handleAddTask}
              onMoveTask={handleMoveTask}
              {...sharedDayProps}
            />
          )}

          {view === 'inbox' && (
            <ListView
              title="inbox"
              subtitle="Sem data · capture rápido"
              bucket="__inbox"
              tasks={inboxMap}
              onAddTask={handleAddBucketTask}
              {...sharedDayProps}
            />
          )}
        </main>

        <DragOverlay>
          {draggingTask && (
            <div style={{
              background: 'var(--bg-raised)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-pop)',
              opacity: 0.95,
              pointerEvents: 'none',
            }}>
              <TaskRow
                task={draggingTask}
                accent={accent}
                showDragHandle={false}
                onChange={() => {}}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </div>

      {editingTask && (
        <TaskEditor
          task={editingTask}
          accent={accent}
          onChange={handleUpdateTask}
          onDelete={handleDeleteTask}
          onClose={() => setEditingTask(null)}
          onMoveTask={handleMoveTask}
        />
      )}
    </DndContext>
  )
}
