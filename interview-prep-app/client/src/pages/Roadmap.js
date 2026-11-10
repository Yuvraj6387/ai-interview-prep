import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiMap, FiCalendar, FiCheck, FiChevronDown, FiPlay, FiRefreshCw,
  FiBookOpen, FiHelpCircle, FiLoader, FiTarget
} from 'react-icons/fi';
import { roadmapAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';

const LEVELS = [
  { value: 'Beginner', hint: 'New to this' },
  { value: 'Intermediate', hint: 'Know the basics' },
  { value: 'Advanced', hint: 'Polishing up' },
];
const DURATIONS = [
  { value: 3, hint: 'Last-minute revision' },
  { value: 5, hint: 'Quick revision' },
  { value: 7, hint: 'Quick sprint' },
  { value: 10, hint: 'Short and focused' },
  { value: 14, hint: 'Steady pace' },
  { value: 21, hint: 'Thorough prep' },
  { value: 30, hint: 'Deep prep' },
];
const GOAL_EXAMPLES = [
  'React frontend developer interview',
  'DSA for product-based companies',
  'Node.js backend interview',
  'HR & behavioral round',
  'System design basics',
];

const PHASE_STYLE = {
  Easy: { label: 'Easy Phase', blurb: 'Fundamentals', dot: 'bg-emerald-500', bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-400', heading: 'text-emerald-700' },
  Medium: { label: 'Medium Phase', blurb: 'Apply & practice', dot: 'bg-amber-500', bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', border: 'border-amber-400', heading: 'text-amber-700' },
  Strong: { label: 'Strong Phase', blurb: 'Advanced & mock', dot: 'bg-rose-500', bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700', border: 'border-rose-400', heading: 'text-rose-700' },
};
// Practice in a mock interview at the difficulty of the day's phase.
const PHASE_DIFFICULTY = { Easy: 'Easy', Medium: 'Medium', Strong: 'Hard' };

const Card = ({ children, className = '' }) => (
  <div className={`card p-5 md:p-6 ${className}`}>{children}</div>
);

const OptionButton = ({ active, onClick, title, hint }) => (
  <button
    type="button"
    onClick={onClick}
    className={`py-3 px-2 rounded-lg border-2 text-sm font-semibold transition-smooth ${
      active ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-orange-200'
    }`}
  >
    {title}
    <span className="block text-xs font-normal text-gray-500">{hint}</span>
  </button>
);

const PlanForm = ({ onCreate, creating }) => {
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [duration, setDuration] = useState(7);

  const submit = (e) => {
    e.preventDefault();
    onCreate({ goal: goal.trim(), level, duration });
  };

  return (
    <Card>
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label htmlFor="goal" className="block text-sm font-semibold text-gray-800 mb-2">
            What do you want to prepare for?
          </label>
          <input
            id="goal"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={150}
            placeholder="e.g. React frontend developer interview"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm text-gray-800"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {GOAL_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setGoal(example)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-smooth"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Your current level</p>
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.map(({ value, hint }) => (
              <OptionButton key={value} active={level === value} onClick={() => setLevel(value)} title={value} hint={hint} />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-semibold text-gray-800 mb-2">
            How many days do you have to prepare?
          </label>
          <div className="relative sm:w-72">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full pl-9 pr-9 py-3 text-sm text-gray-800 border border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none appearance-none bg-white"
            >
              {DURATIONS.map(({ value, hint }) => (
                <option key={value} value={value}>{value} days · {hint}</option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {Object.values(PHASE_STYLE).map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}: {s.blurb}
            </span>
          ))}
        </div>

        <button
          type="submit"
          disabled={creating || goal.trim().length < 3}
          className="btn-primary w-full sm:w-auto"
        >
          {creating ? <FiLoader className="animate-spin" /> : <FiMap />}
          <span>{creating ? 'Building your plan...' : `Generate ${duration}-Day Plan`}</span>
        </button>
      </form>
    </Card>
  );
};

const ProgressOverview = ({ roadmap, progress }) => {
  const percent = progress.totalItems ? Math.round((progress.doneItems / progress.totalItems) * 100) : 0;

  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="md:w-56 flex-shrink-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <FiCalendar size={16} className="text-orange-600" /> Overall
          </p>
          <p className="text-3xl font-bold text-gray-800 font-display">{percent}%</p>
          <p className="text-xs text-gray-500 mt-1">
            Day {progress.today} of {roadmap.duration} · {progress.doneItems}/{progress.totalItems} items
          </p>
        </div>
        <div className="flex-1 grid sm:grid-cols-3 gap-4">
          {progress.phases.map((phase) => {
            const style = PHASE_STYLE[phase.name];
            const phasePercent = phase.totalItems ? Math.round((phase.doneItems / phase.totalItems) * 100) : 0;
            return (
              <div key={phase.name} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">{phasePercent}%</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Day {phase.from}{phase.to !== phase.from ? `–${phase.to}` : ''} · {style.blurb}
                </p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full ${style.bar}`} initial={false} animate={{ width: `${phasePercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

const CheckItem = ({ item, onToggle }) => (
  <div className="flex items-start gap-3 py-1.5">
    <button
      type="button"
      onClick={onToggle}
      aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
      className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-smooth ${
        item.done ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-300 hover:border-orange-500'
      }`}
    >
      {item.done && <FiCheck size={13} strokeWidth={3} />}
    </button>
    <p className={`flex-1 text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.text}</p>
  </div>
);

const DayCard = ({ day, isToday, open, onToggleOpen, onToggleItem, onPractice }) => {
  const items = [...day.tasks, ...day.questions];
  const doneCount = items.filter((i) => i.done).length;
  const complete = items.length > 0 && doneCount === items.length;
  const style = PHASE_STYLE[day.phase];

  return (
    <div className={`bg-white rounded-xl shadow-md border-l-4 ${complete || isToday ? style.border : 'border-transparent'}`}>
      <button type="button" onClick={onToggleOpen} className="w-full flex items-center gap-4 px-5 py-4 text-left">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          complete ? style.chip : isToday ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          {complete ? <FiCheck size={18} /> : day.day}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {day.topic}
            {isToday && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">Today</span>}
          </p>
          {day.goal && <p className="text-xs text-gray-500 truncate">{day.goal}</p>}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{doneCount}/{items.length}</span>
        <FiChevronDown className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && day.subtopics?.length > 0 && (
        <div className="px-5 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Subtopics</p>
          <div className="flex flex-wrap gap-2">
            {day.subtopics.map((sub) => (
              <span key={sub} className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.chip}`}>{sub}</span>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className={`px-5 pb-5 grid md:grid-cols-2 gap-5 pt-4 ${day.subtopics?.length > 0 ? '' : 'border-t border-gray-100'}`}>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              <FiBookOpen size={13} /> Study
            </p>
            {day.tasks.map((item, i) => (
              <CheckItem key={i} item={item} onToggle={() => onToggleItem(day.day, 'tasks', i, !item.done)} />
            ))}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              <FiHelpCircle size={13} /> Practice Questions
            </p>
            {day.questions.map((item, i) => (
              <CheckItem key={i} item={item} onToggle={() => onToggleItem(day.day, 'questions', i, !item.done)} />
            ))}
            <button
              type="button"
              onClick={() => onPractice(day)}
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-orange-700 hover:text-orange-600"
            >
              <FiPlay size={12} /> Practice {day.topic} in a mock interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Roadmap = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openDays, setOpenDays] = useState(new Set());
  const [confirmReset, setConfirmReset] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const response = await roadmapAPI.get();
      setData(response.data);
      if (response.data.progress) setOpenDays(new Set([response.data.progress.today]));
    } catch (error) {
      console.error('Error loading roadmap:', error);
      showToast('Unable to load your study plan', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (input) => {
    setCreating(true);
    try {
      const response = await roadmapAPI.create(input);
      setData(response.data);
      setOpenDays(new Set([1]));
      showToast(`Your ${input.duration}-day plan is ready`, 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to build your plan. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Ticks update straight away; the server's copy replaces them when it answers.
  const handleToggleItem = async (dayNumber, kind, index, done) => {
    const previous = data;
    setData((prev) => ({
      ...prev,
      roadmap: {
        ...prev.roadmap,
        days: prev.roadmap.days.map((d) => (d.day !== dayNumber ? d : {
          ...d,
          [kind]: d[kind].map((item, i) => (i === index ? { ...item, done } : item)),
        })),
      },
    }));
    try {
      const response = await roadmapAPI.toggleItem(dayNumber, kind, index, done);
      setData(response.data);
    } catch (error) {
      setData(previous);
      showToast('Could not save that change. Please try again.', 'error');
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    try {
      await roadmapAPI.remove();
      setData({ roadmap: null, progress: null });
    } catch (error) {
      showToast('Could not delete the plan. Please try again.', 'error');
    }
  };

  const toggleDay = (dayNumber) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  };

  const practiceDay = (day) => {
    navigate('/mock-interview', {
      state: {
        source: 'roadmap',
        difficulty: PHASE_DIFFICULTY[day.phase],
        jobContext: { title: data.roadmap.goal, skills: [], topics: day.subtopics?.length ? day.subtopics : [day.topic] },
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  const roadmap = data?.roadmap;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-2 font-display">Learning Roadmap</h1>
            {roadmap ? (
              <p className="flex items-center gap-2 text-zinc-600">
                <FiTarget className="flex-shrink-0 text-orange-400" />
                <span className="truncate">{roadmap.goal}</span>
                <span className="text-zinc-500 flex-shrink-0">· {roadmap.level} · {roadmap.duration} days</span>
              </p>
            ) : (
              <p className="text-zinc-600">Tell us your goal and get a plan that goes from easy to interview-ready</p>
            )}
          </div>
          {roadmap && (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 border border-stone-200 rounded-lg hover:bg-orange-50 transition-smooth self-start sm:self-auto flex-shrink-0"
            >
              <FiRefreshCw size={14} /> New Plan
            </button>
          )}
        </motion.div>

        {!roadmap ? (
          <PlanForm onCreate={handleCreate} creating={creating} />
        ) : (
          <>
            <ProgressOverview roadmap={roadmap} progress={data.progress} />

            {['Easy', 'Medium', 'Strong'].map((phaseName) => {
              const days = roadmap.days.filter((d) => d.phase === phaseName);
              if (days.length === 0) return null;
              const style = PHASE_STYLE[phaseName];
              return (
                <div key={phaseName} className="space-y-3">
                  <h3 className={`flex items-center gap-2 text-sm font-semibold pt-2 ${style.heading}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    {style.label}
                    <span className="font-normal text-zinc-500">· {style.blurb}</span>
                  </h3>
                  {days.map((day) => (
                    <DayCard
                      key={day.day}
                      day={day}
                      isToday={day.day === data.progress.today}
                      open={openDays.has(day.day)}
                      onToggleOpen={() => toggleDay(day.day)}
                      onToggleItem={handleToggleItem}
                      onPractice={practiceDay}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Start a new plan?"
        message="This deletes your current plan and its progress, so you can build a fresh one for a new goal."
        confirmLabel="Delete & start over"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};

export default Roadmap;
