import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Circle, Plus, Sparkles } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

type Filter = 'All' | 'Active' | 'Completed';
const STORAGE_KEY = 'little-room-tasks';
const queryClient = new QueryClient();

function loadTasks(): Task[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value.filter((task): task is Task =>
      typeof task?.id === 'string' &&
      typeof task?.title === 'string' &&
      typeof task?.completed === 'boolean' &&
      typeof task?.createdAt === 'string',
    );
  } catch {
    return [];
  }
}

function Home() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [filter, setFilter] = useState<Filter>('All');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // The task list remains usable in this session if browser storage is unavailable.
    }
  }, [tasks]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => filter === 'All' || (filter === 'Active' ? !task.completed : task.completed)),
    [tasks, filter],
  );
  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.length - activeCount;
  const today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const task: Task = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [task, ...current]);
    setDraft('');
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task,
    ));
  }

  const emptyTitle = filter === 'Completed'
    ? 'Nothing checked off yet'
    : filter === 'Active'
      ? 'You’re all caught up'
      : 'A little space to begin';
  const emptyCopy = filter === 'Completed'
    ? 'When you finish something, it will find its way here.'
    : filter === 'Active'
      ? 'There are no open tasks right now. Enjoy the breathing room.'
      : 'Add one thing you’d like to make room for today.';

  return (
    <main className="app-shell" data-testid="page-todo">
      <aside className="intro" aria-label="About your task list">
        <div className="brand-mark" data-testid="text-app-name">
          <span className="mark-icon"><Circle size={14} strokeWidth={1.7} /></span>
          <span>Little Room</span>
        </div>
        <div className="intro-copy">
          <p className="eyebrow">A quieter kind of to-do</p>
          <h1>Make room<br />for what <em>matters.</em></h1>
          <p className="intro-subtitle">One clear thought at a time. Keep the day close, and let the rest wait.</p>
        </div>
        <div className="day-note" data-testid="text-day-note">
          A small list can hold<br />a surprisingly good day.
        </div>
      </aside>

      <section className="workspace" aria-labelledby="list-heading">
        <header className="workspace-head">
          <div className="date-line">
            <span className="date-dot">Your day</span>
            <time data-testid="text-today">{today}</time>
          </div>
          <h2 id="list-heading">Today, gently.</h2>
          <p className="workspace-intro">Write it down. Give it your attention.</p>
        </header>

        <form className="task-form" onSubmit={addTask} data-testid="form-add-task">
          <input
            className="task-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What’s on your mind?"
            aria-label="New task"
            maxLength={180}
            data-testid="input-task-title"
          />
          <button className="add-button" type="submit" aria-label="Add task" data-testid="button-add-task">
            <Plus size={19} strokeWidth={1.8} />
          </button>
        </form>

        <div className="list-toolbar">
          <div className="filter-group" role="group" aria-label="Filter tasks" data-testid="group-task-filters">
            {(['All', 'Active', 'Completed'] as const).map((item) => (
              <button
                key={item}
                className="filter-button"
                type="button"
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
                data-testid={`filter-${item.toLowerCase()}`}
              >
                {item}
              </button>
            ))}
          </div>
          <span className="remaining" data-testid="text-active-count">
            {activeCount} {activeCount === 1 ? 'task left' : 'tasks left'}
          </span>
        </div>

        <div className="task-list" role="list" aria-label={`${filter} tasks`} data-testid="list-tasks">
          {visibleTasks.length > 0 ? visibleTasks.map((task, index) => (
            <div
              className="task-row"
              role="listitem"
              key={task.id}
              style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
              data-testid={`task-row-${task.id}`}
            >
              <button
                className={`check-button${task.completed ? ' is-complete' : ''}`}
                type="button"
                aria-label={`${task.completed ? 'Mark as active' : 'Mark as complete'}: ${task.title}`}
                aria-pressed={task.completed}
                onClick={() => toggleTask(task.id)}
                data-testid={`button-toggle-task-${task.id}`}
              >
                {task.completed && <Check size={13} strokeWidth={2.7} />}
              </button>
              <span
                className={`task-title${task.completed ? ' is-complete' : ''}`}
                data-testid={`text-task-title-${task.id}`}
              >
                {task.title}
              </span>
            </div>
          )) : (
            <div className="empty-state" data-testid="empty-state">
              <div className="empty-art" aria-hidden="true"><Sparkles size={23} strokeWidth={1.5} /></div>
              <h3 data-testid="text-empty-title">{emptyTitle}</h3>
              <p data-testid="text-empty-message">{emptyCopy}</p>
            </div>
          )}
        </div>

        <footer className="workspace-foot">
          <span className="foot-mark"><Sparkles size={12} strokeWidth={1.7} /> A little at a time</span>
          <span data-testid="text-completed-count">
            {completedCount > 0 ? `${completedCount} ${completedCount === 1 ? 'task' : 'tasks'} done` : 'Take it at your pace'}
          </span>
        </footer>
      </section>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;