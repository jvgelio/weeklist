// Mock data + date helpers for Weeklist

const TAGS = {
  work:     { label: "work",     color: "var(--tag-work)" },
  personal: { label: "personal", color: "var(--tag-personal)" },
  urgent:   { label: "urgent",   color: "var(--tag-urgent)" },
  focus:    { label: "focus",    color: "var(--tag-focus)" },
  health:   { label: "health",   color: "var(--tag-health)" },
  errand:   { label: "errand",   color: "var(--tag-errand)" },
};

const TODAY = new Date(2026, 3, 15); // Apr 15 2026 (Wed)

const DAY_NAMES_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES_LONG_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTH_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function startOfWeek(date, weekStart = 1) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const day = d.getDay();
  const diff = (day - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const dd = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function sameDay(a,b){ return isoDate(a)===isoDate(b); }

let _id = 0;
const uid = () => `t${++_id}`;

// slot: "am" | "pm" — which side of the lunch break
function T(title, opts = {}) {
  return {
    id: uid(),
    title,
    done: opts.done || false,
    tags: opts.tags || [],
    priority: opts.priority || null,
    recurring: opts.recurring || null, // "daily" | "weekly" | "monthly"
    subtasks: opts.subtasks || [],
    note: opts.note || "",
    slot: opts.slot || "am",
  };
}

function buildInitialTasks() {
  const today = TODAY;
  const monday = startOfWeek(today, 1);
  const d = (offset) => isoDate(addDays(monday, offset));

  const lastFri = isoDate(addDays(monday, -3));
  const lastThu = isoDate(addDays(monday, -4));

  return {
    [lastThu]: [
      T("Revisar contrato fornecedor", { tags: ["work", "urgent"], priority: "high", slot: "am" }),
    ],
    [lastFri]: [
      T("Ligar pro dentista", { tags: ["personal", "health"], slot: "am" }),
      T("Fechar relatório Q1", { tags: ["work"], priority: "high", slot: "pm" }),
    ],
    [d(0)]: [
      T("Weekly planning", { tags: ["work"], recurring: "weekly", done: true, slot: "am" }),
      T("Code review: auth refactor", { tags: ["work", "focus"], priority: "high", slot: "am",
        subtasks: [
          { id: "s1", title: "Session management", done: true },
          { id: "s2", title: "Token rotation", done: true },
          { id: "s3", title: "Edge cases + tests", done: false },
        ] }),
      T("Academia — pernas", { tags: ["health"], recurring: "weekly", done: true, slot: "pm" }),
      T("Responder Luiza sobre aniversário", { tags: ["personal"], done: true, slot: "pm" }),
    ],
    [d(1)]: [
      T("Stand-up time", { tags: ["work"], recurring: "daily", done: true, slot: "am" }),
      T("Spec: onboarding v2", { tags: ["work", "focus"], priority: "high", slot: "am",
        note: "Draft com Ana até sexta, sessão de review na segunda que vem." }),
      T("Comprar presente do Téo", { tags: ["personal", "errand"], priority: "med", slot: "pm" }),
    ],
    [d(2)]: [
      T("Stand-up time", { tags: ["work"], recurring: "daily", slot: "am" }),
      T("1:1 com Ana", { tags: ["work"], priority: "med", slot: "am" }),
      T("Entrevista candidato Sr. iOS", { tags: ["work", "focus"], priority: "high", slot: "am" }),
      T("Deep work: arquitetura do sync", { tags: ["focus"], priority: "high", slot: "pm",
        subtasks: [
          { id: "a", title: "Modelar invariantes", done: false },
          { id: "b", title: "Esboçar 2 abordagens", done: false },
          { id: "c", title: "Levar pra discussão sexta", done: false },
        ]}),
      T("Correr 5k", { tags: ["health"], slot: "pm" }),
      T("Pagar boleto do condomínio", { tags: ["personal", "errand"], priority: "med", slot: "pm" }),
    ],
    [d(3)]: [
      T("Stand-up time", { tags: ["work"], recurring: "daily", slot: "am" }),
      T("Roadmap Q2 — draft", { tags: ["work", "focus"], priority: "high", slot: "am" }),
      T("Jantar com a Mari", { tags: ["personal"], priority: "med", slot: "pm" }),
    ],
    [d(4)]: [
      T("Stand-up time", { tags: ["work"], recurring: "daily", slot: "am" }),
      T("Review: arquitetura do sync", { tags: ["work", "focus"], priority: "high", slot: "am" }),
      T("Retrospectiva da semana", { tags: ["work"], recurring: "weekly", slot: "pm" }),
      T("Feira orgânica", { tags: ["personal", "errand"], recurring: "weekly", slot: "pm" }),
    ],
    [d(5)]: [
      T("Trilha no parque", { tags: ["health", "personal"], slot: "am" }),
      T("Ler 'The Paper Menagerie'", { tags: ["personal"], slot: "pm" }),
    ],
    [d(6)]: [
      T("Meal prep", { tags: ["personal", "health"], recurring: "weekly", slot: "am" }),
      T("Revisar a semana que vem", { tags: ["focus"], recurring: "weekly", slot: "pm" }),
    ],
    __inbox: [
      T("Ideia: template de OKRs pro time", { tags: ["work"] }),
      T("Escrever sobre feedback assimétrico", { tags: ["focus"] }),
      T("Renovar seguro do carro", { tags: ["personal", "errand"], priority: "med" }),
    ],
    __someday: [
      T("Aprender a fazer pão de fermentação natural", { tags: ["personal"] }),
      T("Viagem pra Chapada Diamantina", { tags: ["personal"] }),
      T("Curso de tipografia avançada", { tags: ["focus"] }),
      T("Trocar o setup da mesa", { tags: ["personal"] }),
    ],
  };
}

Object.assign(window, {
  TAGS,
  TODAY,
  DAY_NAMES_PT,
  DAY_NAMES_LONG_PT,
  MONTH_PT,
  startOfWeek,
  addDays,
  isoDate,
  sameDay,
  buildInitialTasks,
  uid,
  makeTask: T,
});
