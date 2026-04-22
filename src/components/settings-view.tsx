import React from 'react'
import { Sun, Cloud, Moon, LogOut, User as UserIcon } from 'lucide-react'
import type { SlotPrefs } from '../lib/types'
import { useUpdateSlotPrefs, useLogout } from '../hooks/use-tasks'

interface User { 
  name: string
  email: string
  avatarUrl?: string 
}

interface SettingsViewProps {
  user: User | null
  dark: boolean
  showWeekend: boolean
  dimPastDays: boolean
  slotPrefs: SlotPrefs
  onToggleDark: () => void
  onToggleWeekend: () => void
  onToggleDimPastDays: () => void
}

export function SettingsView({
  user, dark, showWeekend, dimPastDays, slotPrefs,
  onToggleDark, onToggleWeekend, onToggleDimPastDays
}: SettingsViewProps) {
  const updateSlots = useUpdateSlotPrefs()
  const logout = useLogout()

  const handleToggleSlot = (key: keyof SlotPrefs) => {
    updateSlots.mutate({ ...slotPrefs, [key]: !slotPrefs[key] })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 32, marginBottom: 32 }}>Configurações</h1>

      {/* Appearance Section */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-mute)', marginBottom: 16 }}>Aparência</div>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 14, padding: 20, boxShadow: 'var(--ring)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Tema</div>
            <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Escolha entre o modo claro ou escuro.</div>
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-sunken)', padding: 4, borderRadius: 999, gap: 4 }}>
            <button 
              onClick={() => dark && onToggleDark()}
              style={{ border: 0, padding: '6px 16px', borderRadius: 999, background: !dark ? 'var(--bg-raised)' : 'transparent', color: !dark ? 'var(--ink)' : 'var(--ink-mute)', fontSize: 13, fontWeight: 600, boxShadow: !dark ? 'var(--ring)' : 'none' }}>
              Claro
            </button>
            <button 
              onClick={() => !dark && onToggleDark()}
              style={{ border: 0, padding: '6px 16px', borderRadius: 999, background: dark ? 'var(--bg-raised)' : 'transparent', color: dark ? 'var(--ink)' : 'var(--ink-mute)', fontSize: 13, fontWeight: 600, boxShadow: dark ? 'var(--ring)' : 'none' }}>
              Escuro
            </button>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-mute)', marginBottom: 16 }}>Agenda</div>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 14, boxShadow: 'var(--ring)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Fim de semana</div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Exibir Sábado e Domingo na visualização da semana.</div>
            </div>
            <Switch on={showWeekend} onClick={onToggleWeekend} />
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Esmaecer passado</div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Tornar dias anteriores menos brilhantes.</div>
            </div>
            <Switch on={dimPastDays} onClick={onToggleDimPastDays} />
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Períodos do dia</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <SlotCard active={slotPrefs.am} icon={<Sun size={18} />} label="Manhã" onClick={() => handleToggleSlot('am')} />
              <SlotCard active={slotPrefs.pm} icon={<Cloud size={18} />} label="Tarde" onClick={() => handleToggleSlot('pm')} />
              <SlotCard active={slotPrefs.eve} icon={<Moon size={18} />} label="Noite" onClick={() => handleToggleSlot('eve')} />
            </div>
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-mute)', marginBottom: 16 }}>Conta</div>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 14, padding: 20, boxShadow: 'var(--ring)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(204, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--line)', display: 'grid', placeItems: 'center' }}>
              <UserIcon size={20} color="var(--ink-mute)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{user?.name || 'Usuário'}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: '1px solid #cc0000', color: '#cc0000', background: 'transparent', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </section>
    </div>
  )
}

function Switch({ on, onClick }: { on: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ width: 40, height: 22, background: on ? 'var(--accent)' : 'var(--line)', borderRadius: 999, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', left: on ? 20 : 2, top: 2, width: 18, height: 18, background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
    </div>
  )
}

function SlotCard({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{ flex: 1, padding: '16px 8px', borderRadius: 12, border: active ? '2px solid var(--accent)' : '1px solid var(--line)', background: active ? 'var(--accent-soft)' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
      <span style={{ color: active ? 'var(--accent)' : 'var(--ink-mute)' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--ink)' : 'var(--ink-mute)' }}>{label}</span>
    </button>
  )
}
