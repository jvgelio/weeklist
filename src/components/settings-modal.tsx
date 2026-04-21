import React, { useState } from 'react'
import type { SlotPrefs } from '../lib/types'
import { useUpdateSlotPrefs } from '../hooks/use-tasks'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  slotPrefs: SlotPrefs
}

export function SettingsModal({ open, onClose, slotPrefs }: SettingsModalProps) {
  const [prefs, setPrefs] = useState<SlotPrefs>(slotPrefs)
  const updateSlots = useUpdateSlotPrefs()

  if (!open) return null

  function handleSave() {
    updateSlots.mutate(prefs, { onSuccess: onClose })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-raised)', borderRadius: 14, padding: 24, minWidth: 320, boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Configurações</h2>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-mute)', marginBottom: 10 }}>
            Períodos do dia
          </div>
          {([['am', 'Manhã'], ['pm', 'Tarde'], ['eve', 'Noite']] as [keyof SlotPrefs, string][]).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={e => setPrefs(p => ({ ...p, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: updateSlots.isPending ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={updateSlots.isPending}
          >
            {updateSlots.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
