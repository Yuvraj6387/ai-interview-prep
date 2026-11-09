import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiMap, FiMic, FiTag, FiTrendingUp, FiCalendar, FiCheck, FiChevronDown,
  FiPlay, FiRefreshCw, FiBookOpen, FiHelpCircle, FiArrowRight, FiLoader
} from 'react-icons/fi';
import { roadmapAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';

const WEAK_SKILL_BAR = 60;

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-xl p-6 md:p-8 ${className}`}>{children}</div>
);

const CardTitle = ({ icon: Icon, children }) => (
  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
    <Icon size={16} className="text-cyan-600" />
    {children}
  </h3>
);

// Weak areas found from interview results, shown before a plan is made.
const WeakAreas = ({ insights }) => (
  <div className="grid md:grid-cols-2 gap-6">
    <Card>
      <CardTitle icon={FiTag}>Weak Topics</CardTitle>
      {insights.weakTopics.length === 0 ? (
        <p className="text-sm text-gray-400">No repeat topics yet. The plan will cover fundamentals.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {insights.weakTopics.map(({ name, count }) => (
            <span key={name} className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
              {name}{count > 1 && <span className="text-amber-500"> ×{count}</span>}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4">
        Topics your last {insights.interviewCount} interview{insights.interviewCount === 1 ? '' : 's'} recommended most often.
      </p>
    </Card>

    <Card>
      <CardTitle icon={FiTrendingUp}>Interview Skills</CardTitle>
      <div className="space-y-3">
        {insights.skills.map(({ label, score }) => {
          const weak = score < WEAK_SKILL_BAR;
          return (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className={weak ? 'font-semibold text-amber-700' : 'text-gray-600'}>{label}</span>
                <span className={weak ? 'font-semibold text-amber-700' : 'text-gray-500'}>{score}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${weak ? 'bg-amber-400' : 'bg-cyan-500'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  </div>
);

const PlanBuilder = ({ insights, onCreate, creating }) => {
  const [duration, setDuration] = useState(7);

  return (
    <>
      <WeakAreas insights={insights} />
      <Card>
        <h3 className="text-lg font-bold text-gray-800 mb-1 font-display">Build your study plan</h3>
        <p className="text-sm text-gray-600 mb-5">
          A day-by-day plan that targets the weak areas above, with practice questions for each day.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-5 max-w-sm">
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`py-3 rounded-lg border-2 text-sm font-semibold transition-smooth ${
                duration === d
                  ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                  : 'border-gray-200 text-gray-600 hover:border-cyan-200'
              }`}
            >
              {d}-day plan
              <span className="block text-xs font-normal text-gray-500">{d === 7 ? 'Quick sprint' : 'Deep prep'}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onCreate(duration)}
          disabled={creating}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-semibold rounded-lg hover:shadow-xl transition-smooth"
        >
          {creating ? <FiLoader className="animate-spin" /> : <FiMap />}
          <span>{creating ? 'Building your plan...' : `Generate ${duration}-Day Plan`}</span>
        </button>
      </Card>
    </>
  );
};

const ProgressCards = ({ roadmap, progress, onPracticeInterview }) => {
  const percent = progress.totalItems ? Math.round((progress.doneItems / progress.totalItems) * 100) : 0;
  const scoreChange = progress.currentScore === null ? null : progress.currentScore - roadmap.baselineScore;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardTitle icon={FiCalendar}>Completion</CardTitle>
        <div className="flex items-end justify-between mb-2">
          <p className="text-3xl font-bold text-gray-800 font-display">{percent}%</p>
          <p className="text-sm text-gray-500">Day {progress.today} of {roadmap.duration}</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-cyan-500 rounded-full"
            initial={false}
            animate={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {progress.doneItems} of {progress.totalItems} items done · {progress.completedDays} day{progress.completedDays === 1 ? '' : 's'} fully complete
        </p>
      </Card>

      <Card>
        <CardTitle icon={FiTrendingUp}>Improvement</CardTitle>
        {progress.interviewsSince === 0 ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Your average score was <span className="font-semibold text-gray-800">{roadmap.baselineScore}</span> when
              you started. Take a mock interview to see how far you've come.
            </p>
            <button
              onClick={onPracticeInterview}
              className="flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-600"
            >
              <FiMic /> Take a mock interview <FiArrowRight />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average score</span>
              <span className="text-sm font-semibold text-gray-800">
                {roadmap.baselineScore} → {progress.currentScore}
                <span className={`ml-2 ${scoreChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {scoreChange >= 0 ? '+' : ''}{scoreChange}
                </span>
              </span>
            </div>
            {progress.skills.map(({ name, before, now }) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{name}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {before} → {now}
                  <span className={`ml-2 ${now - before >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {now - before >= 0 ? '+' : ''}{now - before}
                  </span>
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-1">
              From {progress.interviewsSince} interview{progress.interviewsSince === 1 ? '' : 's'} since the plan started.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

const CheckItem = ({ item, onToggle, children }) => (
  <div className="flex items-start gap-3 py-1.5">
    <button
      type="button"
      onClick={onToggle}
      aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
      className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-smooth ${
        item.done ? 'bg-cyan-600 border-cyan-600 text-white' : 'border-gray-300 hover:border-cyan-500'
      }`}
    >
      {item.done && <FiCheck size={13} strokeWidth={3} />}
    </button>
    <p className={`flex-1 text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.text}</p>
    {children}
  </div>
);

const DayCard = ({ day, isToday, open, onToggleOpen, onToggleItem, onPractice }) => {
  const items = [...day.tasks, ...day.questions];
  const doneCount = items.filter((i) => i.done).length;
  const complete = items.length > 0 && doneCount === items.length;

  return (
    <div className={`bg-white rounded-xl shadow-md border-l-4 ${
      complete ? 'border-emerald-400' : isToday ? 'border-cyan-500' : 'border-transparent'
    }`}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          complete ? 'bg-emerald-50 text-emerald-600' : isToday ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          {complete ? <FiCheck size={18} /> : day.day}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {day.topic}
            {isToday && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">Today</span>}
          </p>
          {day.goal && <p className="text-xs text-gray-500 truncate">{day.goal}</p>}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{doneCount}/{items.length}</span>
        <FiChevronDown className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 grid md:grid-cols-2 gap-5 border-t border-gray-100 pt-4">
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
              onClick={() => onPractice(day.topic)}
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-cyan-700 hover:text-cyan-600"
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

  const handleCreate = async (duration) => {
    setCreating(true);
    try {
      const response = await roadmapAPI.create(duration);
      setData((prev) => ({ ...prev, ...response.data }));
      setOpenDays(new Set([1]));
      showToast(`Your ${duration}-day plan is ready`, 'success');
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
      setData((prev) => ({ ...prev, ...response.data }));
    } catch (error) {
      setData(previous);
      showToast('Could not save that change. Please try again.', 'error');
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    try {
      await roadmapAPI.remove();
      setData((prev) => ({ ...prev, roadmap: null, progress: null }));
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

  const practiceTopic = (topic) => {
    navigate('/mock-interview', {
      state: {
        source: 'roadmap',
        jobContext: { title: data.roadmap.role, skills: [], topics: topic ? [topic] : data.roadmap.weakTopics },
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
  const insights = data?.insights;

  // A 30-day plan reads easier in weeks.
  const weeks = [];
  if (roadmap) {
    const size = roadmap.duration === 30 ? 7 : roadmap.duration;
    for (let i = 0; i < roadmap.days.length; i += size) weeks.push(roadmap.days.slice(i, i + size));
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">Learning Roadmap</h1>
            <p className="text-slate-300">
              {roadmap
                ? `Your ${roadmap.duration}-day plan${roadmap.role ? ` for ${roadmap.role}` : ''}, built from your interview results`
                : 'A personalised study plan built from your interview results'}
            </p>
          </div>
          {roadmap && (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 border border-white/25 rounded-lg hover:bg-white/10 transition-smooth self-start sm:self-auto"
            >
              <FiRefreshCw size={14} /> New Plan
            </button>
          )}
        </motion.div>

        {!insights || insights.interviewCount === 0 ? (
          <Card className="text-center !p-12">
            <div className="w-24 h-24 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiMap size={40} className="text-cyan-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 font-display">Take an interview first</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Your roadmap is built from what your mock interviews reveal. Finish one and we'll find your weak topics.
            </p>
            <button
              onClick={() => navigate('/mock-interview')}
              className="flex items-center justify-center space-x-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg hover:shadow-xl transition-smooth mx-auto"
            >
              <FiMic />
              <span>Start Mock Interview</span>
            </button>
          </Card>
        ) : !roadmap ? (
          <PlanBuilder insights={insights} onCreate={handleCreate} creating={creating} />
        ) : (
          <>
            <ProgressCards
              roadmap={roadmap}
              progress={data.progress}
              onPracticeInterview={() => practiceTopic(null)}
            />

            {roadmap.weakTopics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Focus</span>
                {roadmap.weakTopics.map((topic) => (
                  <span key={topic} className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-cyan-200 border border-white/15">
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {weeks.map((week, w) => (
              <div key={w} className="space-y-3">
                {weeks.length > 1 && (
                  <h3 className="text-sm font-semibold text-slate-300 pt-2">Week {w + 1}</h3>
                )}
                {week.map((day) => (
                  <DayCard
                    key={day.day}
                    day={day}
                    isToday={day.day === data.progress.today}
                    open={openDays.has(day.day)}
                    onToggleOpen={() => toggleDay(day.day)}
                    onToggleItem={handleToggleItem}
                    onPractice={practiceTopic}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Start a new plan?"
        message="This deletes your current plan and its progress. You can then build a fresh one from your latest results."
        confirmLabel="Delete & start over"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};

export default Roadmap;
