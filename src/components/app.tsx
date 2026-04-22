import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { startOfWeek, addDays, isoDate } from '../lib/constants'
import type { Task, TaskMap, View, Variant } from '../lib/types'
import * as api from '../lib/api'
import {
  useWeekTasks,
  useBucketTasks,
  useTaskDetail,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useMoveTask,
  useOverdueTasks,
  useTaskOccupancy,
  useAuth,
  useUpdateDisplayPrefs,
  type ClientMutationTrace,
} from '../hooks/use-tasks'
import { useIsMobile } from '../hooks/use-mobile'
import { Sidebar } from './sidebar'
import { WeekView, ListView, TagsView } from './views'
import { SettingsView } from './settings-view'
import { TaskEditor } from './task-editor'
import { TaskRow } from './task-components'
import { QuickAdd, type QuickAddCreateParams } from './quick-add'
import { Login } from './login'
import { MobileTabBar } from './mobile-tab-bar'
import type { SlotPrefs } from '../lib/types'
import { firstEnabledSlot } from '../lib/slot-utils'

const TODAY = new Date()
const TEXT_DEBOUNCE_MS = 300

type TextPatch = Partial<Pick<Task, 'title' | 'note'>>
type MutableTaskPatch = Parameters<typeof api.updateTask>[1]

// Accent per variant
function accentForVariant(variant: Variant): string {
  if (variant === 'quiet') return '#b8643c'
  if (variant === 'columns') return '#3d4a5c'
  return 'var(--accent)'
}

function applyAccentCSS(variant: Variant) {
  const root = document.documentElement
  ;['--accent', '--accent-ink', '--accent-soft'].forEach((k) => root.style.removeProperty(k))
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

function makeClientTrace(label: ClientMutationTrace['label']): ClientMutationTrace {
  return { label, startedAt: performance.now() }
}

function toUpdatePayload(current: Task, next: Task): MutableTaskPatch {
  const patch: MutableTaskPatch = {}

  if (current.title !== next.title) patch.title = next.title
  if (current.done !== next.done) patch.done = next.done
  if (current.slot !== next.slot) patch.slot = next.slot
  if (current.priority !== next.priority) patch.priority = next.priority
  if (current.recurring !== next.recurring) patch.recurring = next.recurring
  if (current.note !== next.note) patch.note = next.note

  const tagsChanged = current.tags.length !== next.tags.length
    || current.tags.some((tag, idx) => tag !== next.tags[idx])
  if (tagsChanged) patch.tags = next.tags

  return patch
}

export default function App() {
  const { data: authData, isLoading: authLoading } = useAuth()
  const isMobile = useIsMobile()
  const updateDisplayPrefs = useUpdateDisplayPrefs()

  const slotPrefs: SlotPrefs = {
    am:  authData?.user?.slotAm  ?? true,
    pm:  authData?.user?.slotPm  ?? true,
    eve: authData?.user?.slotEve ?? false,
  }

  const [view, setView] = useState<View>('week')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(TODAY, 1))
  const [showWeekend, setShowWeekend] = useState(() => {
    const v = localStorage.getItem('wl_weekend')
    return v === null ? true : v === '1'
  })
  const [dimPastDays, setDimPastDays] = useState(() => {
    const v = localStorage.getItem('wl_dim_past_days')
    return v === null ? true : v === '1'
  })
  const [dark, setDark] = useState(() => localStorage.getItem('wl_dark') === '1')
  const [variant, setVariant] = useState<Variant>(() => {
    const v = localStorage.getItem('wl_variant')
    return (v === 'quiet' || v === 'columns') ? v : 'columns'
  })
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('wl_sidebar_collapsed') === '1')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const textTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pendingTextPatchRef = useRef<Map<string, TextPatch>>(new Map())

  // Preferences persistence
  useEffect(() => { localStorage.setItem('wl_variant', variant) }, [variant])
  useEffect(() => { localStorage.setItem('wl_sidebar_collapsed', collapsed ? '1' : '0') }, [collapsed])

  // Sync dark/weekend/dimPastDays from server once auth loads
  useEffect(() => {
    if (!authData?.user) return
    setDark(authData.user.darkMode)
    setShowWeekend(authData.user.showWeekend)
    setDimPastDays(authData.user.dimPastDays)
    localStorage.setItem('wl_dark', authData.user.darkMode ? '1' : '0')
    localStorage.setItem('wl_weekend', authData.user.showWeekend ? '1' : '0')
    localStorage.setItem('wl_dim_past_days', authData.user.dimPastDays ? '1' : '0')
  }, [authData?.user?.id])

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  // Accent CSS vars
  useEffect(() => { applyAccentCSS(variant) }, [variant])
  const accent = accentForVariant(variant)
  const effectiveVariant: Variant = isMobile ? 'quiet' : variant

  // Cleanup text timers
  useEffect(() => {
    return () => {
      for (const timer of textTimersRef.current.values()) {
        clearTimeout(timer)
      }
      textTimersRef.current.clear()
      pendingTextPatchRef.current.clear()
    }
  }, [])

  const handleToggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d
      updateDisplayPrefs.mutate({ darkMode: next })
      localStorage.setItem('wl_dark', next ? '1' : '0')
      return next
    })
  }, [updateDisplayPrefs])

  const handleToggleWeekend = useCallback(() => {
    setShowWeekend((s) => {
      const next = !s
      updateDisplayPrefs.mutate({ showWeekend: next })
      localStorage.setItem('wl_weekend', next ? '1' : '0')
      return next
    })
  }, [updateDisplayPrefs])

  const handleToggleDimPastDays = useCallback(() => {
    setDimPastDays((d) => {
      const next = !d
      updateDisplayPrefs.mutate({ dimPastDays: next })
      localStorage.setItem('wl_dim_past_days', next ? '1' : '0')
      return next
    })
  }, [updateDisplayPrefs])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Alt+Q: global quick add (no view guard)
      if (e.altKey && e.key === 'q') {
        e.preventDefault()
        setShowQuickAdd(true)
        return
      }

      const tag = (e.target as HTMLElement).tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (view !== 'week') return
      if (e.key === 'ArrowLeft' || e.key === 'h') { setWeekStart((w) => addDays(w, -7)); e.preventDefault() }
      if (e.key === 'ArrowRight' || e.key === 'l') { setWeekStart((w) => addDays(w, 7)); e.preventDefault() }
      if (e.key === 't' || e.key === 'T') { setWeekStart(startOfWeek(TODAY, 1)); e.preventDefault() }
      if (e.key === 'w' || e.key === 'W') { handleToggleWeekend(); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, handleToggleWeekend])

  // Data queries
  const isAuth = !!authData?.user
  const weekResult = useWeekTasks(weekStart)
  const inboxResult = useBucketTasks('__inbox')
  const taskDetailResult = useTaskDetail(editingTaskId)
  const overdueResult = useOverdueTasks(weekStart)

  // Global occupancy for sidebar (1 week past to 8 weeks ahead = 10 weeks total)
  const sidebarStart = useMemo(() => isoDate(addDays(startOfWeek(TODAY, 1), -7)), [])
  const sidebarEnd = useMemo(() => isoDate(addDays(startOfWeek(TODAY, 1), 8 * 7 + 6)), [])
  const occupancyResult = useTaskOccupancy(sidebarStart, sidebarEnd)
  const occupancyMap = occupancyResult.data ?? {}

  const weekTasks: TaskMap = weekResult.data ?? {}
  const inboxTasks: Task[] = inboxResult.data ?? []
  const overdueTasks: Task[] = overdueResult.data ?? []
  const inboxMap: TaskMap = useMemo(() => ({ __inbox: inboxTasks }), [inboxTasks])
  const sidebarMap: TaskMap = useMemo(() => ({ ...weekTasks, __inbox: inboxTasks }), [weekTasks, inboxTasks])

  const allTasks = useMemo(
    () => [...Object.values(weekTasks).flat(), ...inboxTasks],
    [weekTasks, inboxTasks],
  )

  const editingListTask = useMemo(
    () => editingTaskId ? allTasks.find((task) => task.id === editingTaskId) ?? null : null,
    [allTasks, editingTaskId],
  )
  const editingTask = taskDetailResult.data ?? editingListTask



  // Mutations
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const moveTask = useMoveTask()

  const flushTaskTextPatch = useCallback((taskId: string) => {
    const timer = textTimersRef.current.get(taskId)
    if (timer) {
      clearTimeout(timer)
      textTimersRef.current.delete(taskId)
    }

    const patch = pendingTextPatchRef.current.get(taskId)
    if (!patch) return

    pendingTextPatchRef.current.delete(taskId)
    updateTask.mutate({
      id: taskId,
      data: patch,
      clientTrace: makeClientTrace('text'),
    })
  }, [updateTask])

  const queueTaskTextPatch = useCallback((taskId: string, patch: TextPatch) => {
    const current = pendingTextPatchRef.current.get(taskId) ?? {}
    pendingTextPatchRef.current.set(taskId, { ...current, ...patch })

    const activeTimer = textTimersRef.current.get(taskId)
    if (activeTimer) clearTimeout(activeTimer)

    const timer = setTimeout(() => {
      flushTaskTextPatch(taskId)
    }, TEXT_DEBOUNCE_MS)
    textTimersRef.current.set(taskId, timer)
  }, [flushTaskTextPatch])

  const handleAddTask = useCallback((bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve' = 'am') => {
    const tasksInBucket = bucketKey === '__inbox'
      ? inboxTasks
      : (weekTasks[bucketKey] ?? [])
    createTask.mutate({
      title,
      bucketKey,
      slot,
      position: tasksInBucket.length,
      clientTrace: makeClientTrace('create'),
    })
  }, [createTask, weekTasks, inboxTasks])

  const handleAddBucketTask = useCallback((bucketKey: string, title: string) => {
    createTask.mutate({
      title,
      bucketKey,
      position: inboxTasks.length,
      clientTrace: makeClientTrace('create'),
    })
  }, [createTask, inboxTasks.length])

  const handleQuickAdd = useCallback(({ title, bucketKey, priority, recurring, tags }: QuickAddCreateParams) => {
    const tasksInBucket = bucketKey === '__inbox'
      ? inboxTasks
      : (weekTasks[bucketKey] ?? [])
    createTask.mutate({
      title,
      bucketKey,
      slot: firstEnabledSlot(slotPrefs) ?? 'am',
      position: tasksInBucket.length,
      priority: priority ?? undefined,
      recurring,
      tags,
      clientTrace: makeClientTrace('create'),
    })
  }, [createTask, weekTasks, inboxTasks, slotPrefs])

  const handleUpdateTask = useCallback((task: Task) => {
    const current = allTasks.find((entry) => entry.id === task.id)
    if (!current) return

    const patch = toUpdatePayload(current, task)
    const keys = Object.keys(patch) as Array<keyof MutableTaskPatch>
    if (keys.length === 0) return

    const textOnly = keys.every((key) => key === 'title' || key === 'note')
    if (textOnly) {
      queueTaskTextPatch(task.id, patch)
      // Inline title edits arrive after blur, so flush immediately.
      flushTaskTextPatch(task.id)
      return
    }

    const isDoneToggleOnly = keys.length === 1 && keys[0] === 'done'
    updateTask.mutate({
      id: task.id,
      data: patch,
      clientTrace: makeClientTrace(isDoneToggleOnly ? 'toggle_done' : 'update'),
    })
  }, [allTasks, flushTaskTextPatch, queueTaskTextPatch, updateTask])

  const handleTaskTextChange = useCallback((taskId: string, patch: TextPatch) => {
    queueTaskTextPatch(taskId, patch)
  }, [queueTaskTextPatch])

  const handleFlushTaskText = useCallback((taskId: string) => {
    flushTaskTextPatch(taskId)
  }, [flushTaskTextPatch])

  const handleDeleteTask = useCallback((id: string) => {
    const timer = textTimersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      textTimersRef.current.delete(id)
    }
    pendingTextPatchRef.current.delete(id)
    deleteTask.mutate(id)
    if (editingTaskId === id) {
      setEditingTaskId(null)
    }
  }, [deleteTask, editingTaskId])

  const handleMoveTask = useCallback((id: string, bucketKey: string) => {
    const task = allTasks.find((entry) => entry.id === id)
    if (!task || task.bucketKey === bucketKey) return

    const targetList = bucketKey === '__inbox'
      ? inboxTasks
      : (weekTasks[bucketKey] ?? [])

    moveTask.mutate({
      id,
      bucketKey,
      position: targetList.length,
      clientTrace: makeClientTrace('move'),
    })
  }, [allTasks, inboxTasks, moveTask, weekTasks])

  const handleOpenTask = useCallback((task: Task) => {
    setEditingTaskId(task.id)
  }, [])

  const handleCloseEditor = useCallback(() => {
    if (editingTaskId) {
      flushTaskTextPatch(editingTaskId)
    }
    setEditingTaskId(null)
  }, [editingTaskId, flushTaskTextPatch])

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Estratégia de collision: prefere tasks sobre zonas, fallback para closestCenter
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    // Verifica se o ponteiro está dentro de algum droppable
    const pointerCollisions = pointerWithin(args)

    if (pointerCollisions.length > 0) {
      // Prefere colisão com task (não-zona) sobre zona droppable
      const taskCollision = pointerCollisions.find((c) => {
        const data = c.data?.droppableContainer?.data?.current as { type?: string } | undefined
        return data?.type !== 'zone'
      })
      if (taskCollision) return [taskCollision]
      return pointerCollisions
    }

    // Nenhum droppable sob o ponteiro — usa closestCenter como fallback
    return closestCenter(args)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string
    if (id.startsWith('overdue:')) {
      const taskId = id.slice('overdue:'.length)
      setDraggingTask(overdueTasks.find(t => t.id === taskId) ?? null)
      return
    }
    setDraggingTask(allTasks.find((task) => task.id === id) ?? null)
  }, [allTasks, overdueTasks])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const overId = over.id as string
    const overData = over.data?.current as
      | { type?: string; bucketKey?: string; slot?: string | null }
      | undefined

    // Caso 0: drag de tarefa atrasada do OverdueBanner
    if (typeof active.id === 'string' && (active.id as string).startsWith('overdue:')) {
      const taskId = (active.id as string).slice('overdue:'.length)
      let targetBucket: string | null = null
      let targetSlot: 'am' | 'pm' | 'eve' | null = null

      if (overData?.type === 'zone') {
        targetBucket = overData.bucketKey!
        targetSlot = (overData.slot as 'am' | 'pm' | 'eve' | null | undefined) ?? null
      } else if (/^\d{4}-\d{2}-\d{2}/.test(overId) || overId.includes('weeklist-') || overId.startsWith('__')) {
        if (overId.includes(':')) {
          const [bucket, slot] = overId.split(':')
          targetBucket = bucket
          targetSlot = slot as 'am' | 'pm' | 'eve'
        } else {
          targetBucket = overId
        }
      } else {
        const overTask = allTasks.find(t => t.id === overId)
        if (overTask) {
          targetBucket = overTask.bucketKey
          targetSlot = overTask.slot
        }
      }

      if (targetBucket) {
        const targetList = targetBucket === '__inbox' ? inboxTasks : (weekTasks[targetBucket] ?? [])
        moveTask.mutate({
          id: taskId,
          bucketKey: targetBucket,
          slot: targetSlot,
          position: targetList.length,
          clientTrace: makeClientTrace('move'),
        })
      }
      return
    }

    const task = allTasks.find((entry) => entry.id === taskId)
    if (!task) return

    // Caso 1: drop em zona explícita com data (AM/PM/weeklist/inbox via sidebar)
    if (overData?.type === 'zone') {
      const targetBucket = overData.bucketKey!
      const targetSlot = (overData.slot as 'am' | 'pm' | 'eve' | null | undefined) ?? null
      const targetList = targetBucket === '__inbox' ? inboxTasks : (weekTasks[targetBucket] ?? [])
      moveTask.mutate({
        id: taskId,
        bucketKey: targetBucket,
        slot: targetSlot,
        position: targetList.length,
        clientTrace: makeClientTrace('move'),
      })
      return
    }

    // Caso 2: drop em bucket pelo ID (compatibilidade com sidebar MiniWeekStrip / outros)
    const isDateBucket = /^\d{4}-\d{2}-\d{2}/.test(overId)
    const isWeeklistBucket = overId.includes('weeklist-')
    const isSpecialBucket = overId.startsWith('__')
    if (isDateBucket || isWeeklistBucket || isSpecialBucket) {
      let targetBucket = overId
      let targetSlot: 'am' | 'pm' | 'eve' | null = null
      if (overId.includes(':')) {
        const [bucket, slot] = overId.split(':')
        targetBucket = bucket
        targetSlot = slot as 'am' | 'pm' | 'eve'
      }
      const targetList = targetBucket === '__inbox' ? inboxTasks : (weekTasks[targetBucket] ?? [])
      moveTask.mutate({
        id: taskId,
        bucketKey: targetBucket,
        slot: targetSlot,
        position: targetList.length,
        clientTrace: makeClientTrace('move'),
      })
      return
    }

    // Caso 3: drop task-to-task (reorder ou cross-slot)
    const overTask = allTasks.find((entry) => entry.id === overId)
    if (!overTask) return

    const targetBucket = overTask.bucketKey
    // Usa o slot do data da tarefa de destino (mais confiável que inferir)
    const targetSlot = ((overData as { slot?: string | null } | undefined)?.slot ?? overTask.slot) as 'am' | 'pm' | 'eve' | null
    const targetList = targetBucket === '__inbox' ? inboxTasks : (weekTasks[targetBucket] ?? [])
    const overIndex = targetList.findIndex((entry) => entry.id === overId)

    moveTask.mutate({
      id: taskId,
      bucketKey: targetBucket,
      slot: targetSlot,
      position: overIndex >= 0 ? overIndex : targetList.length,
      clientTrace: makeClientTrace('move'),
    })
  }, [allTasks, inboxTasks, moveTask, weekTasks])

  const handlePullOneOverdue = useCallback((id: string) => {
    const todayKey = isoDate(TODAY)
    const targetList = weekTasks[todayKey] ?? []
    moveTask.mutate({
      id,
      bucketKey: todayKey,
      slot: null,
      position: targetList.length,
      clientTrace: makeClientTrace('move'),
    })
  }, [moveTask, weekTasks])

  const handlePullAllOverdue = useCallback(() => {
    const todayKey = isoDate(TODAY)
    const targetList = weekTasks[todayKey] ?? []
    overdueTasks.forEach((t, i) => {
      moveTask.mutate({
        id: t.id,
        bucketKey: todayKey,
        slot: null,
        position: targetList.length + i,
        clientTrace: makeClientTrace('move'),
      })
    })
  }, [moveTask, overdueTasks, weekTasks])

  const sharedDayProps = useMemo(() => ({
    accent,
    onOpenTask: handleOpenTask,
    onUpdateTask: handleUpdateTask,
    onDeleteTask: handleDeleteTask,
  }), [accent, handleDeleteTask, handleOpenTask, handleUpdateTask])

  if (authLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--ink)' }}>Loading...</div>
  }

  if (!isAuth) {
    return <Login />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
        <Sidebar
          view={view} onViewChange={(v) => { setView(v); if (isMobile) setSidebarOpen(false) }}
          activeWeekStart={weekStart} onWeekSelect={(d) => { setWeekStart(d); if (isMobile) setSidebarOpen(false) }}
          taskMap={sidebarMap}
          occupancyMap={occupancyMap}
          showWeekend={showWeekend}
          accent={accent}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          user={authData?.user ?? null}
          onOpenSettings={() => { setView('settings'); if (isMobile) setSidebarOpen(false) }}
          isMobile={isMobile}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="ghost-btn"
            style={{
              position: 'fixed',
              top: 12, left: 12, zIndex: 100,
              padding: '8px', borderRadius: 10,
              background: 'var(--bg-raised)',
              boxShadow: 'var(--ring)',
              minWidth: 40, minHeight: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Menu"
            aria-label="Abrir menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {view === 'week' && (
            <WeekView
              weekStart={weekStart}
              tasks={weekTasks}
              variant={effectiveVariant}
              showWeekend={showWeekend}
              dimPastDays={dimPastDays}
              dark={dark}
              onChangeVariant={(v) => { setVariant(v); localStorage.setItem('wl_variant', v) }}
              onToggleWeekend={handleToggleWeekend}
              onToggleDark={handleToggleDark}
              onPrevWeek={() => setWeekStart((w) => addDays(w, -7))}
              onNextWeek={() => setWeekStart((w) => addDays(w, 7))}
              onToday={() => setWeekStart(startOfWeek(TODAY, 1))}
              onAddTask={handleAddTask}
              onMoveTask={handleMoveTask}
              slotPrefs={slotPrefs}
              overdueTasks={overdueTasks}
              onPullOneOverdue={handlePullOneOverdue}
              onPullAllOverdue={handlePullAllOverdue}
              isMobile={isMobile}
              {...sharedDayProps}
            />
          )}

          {view === 'inbox' && (
            <ListView
              title="inbox"
              subtitle="Sem data · capture rapido"
              bucket="__inbox"
              tasks={inboxMap}
              onAddTask={handleAddBucketTask}
              draggingTask={draggingTask}
              weekStart={weekStart}
              {...sharedDayProps}
            />
          )}

          {view === 'tags' && <TagsView />}
          {view === 'settings' && (
            <SettingsView 
              user={authData?.user ?? null} 
              dark={dark} 
              showWeekend={showWeekend} 
              dimPastDays={dimPastDays}
              slotPrefs={slotPrefs}
              onToggleDark={handleToggleDark}
              onToggleWeekend={handleToggleWeekend}
              onToggleDimPastDays={handleToggleDimPastDays}
            />
          )}
        </main>

        {isMobile && (
          <MobileTabBar
            view={view}
            onViewChange={setView}
            inboxCount={inboxTasks.length}
            accent={accent}
          />
        )}

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
                isOverlay={true}
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
          onTextChange={handleTaskTextChange}
          onFlushText={handleFlushTaskText}
          onDelete={handleDeleteTask}
          onClose={handleCloseEditor}
          onMoveTask={handleMoveTask}
        />
      )}

      {showQuickAdd && (
        <QuickAdd
          weekStart={weekStart}
          weekTasks={weekTasks}
          inboxTasks={inboxTasks}
          onClose={() => setShowQuickAdd(false)}
          onCreate={(params) => {
            handleQuickAdd(params)
            setShowQuickAdd(false)
          }}
        />
      )}
    </DndContext>
  )
}
