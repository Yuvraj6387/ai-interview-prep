import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiShield, FiLoader, FiCheckCircle, FiXCircle, FiAlertTriangle, FiLayout, FiCpu,
  FiTrendingUp, FiTag, FiList,
} from 'react-icons/fi';
import { resumeAPI } from '../../services/api';
import { useToast } from '../ToastProvider';
import ScoreRing, { ScoreBar } from '../ScoreRing';

const STATUS_STYLE = {
  good: { label: 'Good', className: 'bg-green-50 text-green-700' },
  improve: { label: 'Improve', className: 'bg-amber-50 text-amber-700' },
  missing: { label: 'Missing', className: 'bg-red-50 text-red-700' },
};

const KeywordCard = ({ title, icon: Icon, items, tone }) => (
  <div className="bg-white rounded-2xl shadow-xl p-6">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
      <Icon size={16} className={tone === 'good' ? 'text-emerald-600' : 'text-amber-600'} />
      {title}
      <span className="text-gray-400 font-normal">({items.length})</span>
    </h3>
    {items.length === 0 ? (
      <p className="text-sm text-gray-400">None found</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {items.map((word) => (
          <span
            key={word}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              tone === 'good' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {word}
          </span>
        ))}
      </div>
    )}
  </div>
);

const AtsScanTab = ({ hasResume, suggestedRole }) => {
  const [targetRole, setTargetRole] = useState(suggestedRole || '');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  const handleScan = async (e) => {
    e.preventDefault();
    setScanning(true);
    try {
      const response = await resumeAPI.atsScan(targetRole.trim());
      setResult(response.data);
    } catch (error) {
      console.error('Error running ATS scan:', error);
      showToast(error.response?.data?.message || 'Failed to scan your resume. Please try again.', 'error');
    } finally {
      setScanning(false);
    }
  };

  if (!hasResume) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
        <FiShield size={40} className="text-cyan-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2 font-display">Upload your resume first</h3>
        <p className="text-gray-600">The ATS scan checks the resume you upload in the Analysis tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleScan} className="bg-white rounded-2xl shadow-xl p-5 md:p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Target role</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value.slice(0, 80))}
            placeholder="e.g. Frontend Developer"
            disabled={scanning}
            className="flex-1 px-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
          />
          <button
            type="submit"
            disabled={scanning}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-600/30 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? <FiLoader className="animate-spin" /> : <FiShield />}
            <span>{scanning ? 'Scanning...' : 'Run ATS Scan'}</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Checks formatting an ATS can trip on, plus the keywords recruiters search for in this role
        </p>
      </form>

      {result && !scanning && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <ScoreRing score={result.atsScore} label="ATS score" />
            <div className="flex-1 w-full">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 text-center md:text-left">ATS scan for</p>
              <h2 className="text-2xl font-bold text-gray-800 font-display mb-4 text-center md:text-left">{result.targetRole}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <ScoreBar label="Format" icon={FiLayout} score={result.formatScore} />
                <ScoreBar label="Content" icon={FiCpu} score={result.contentScore} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
              <FiLayout size={16} className="text-cyan-600" />
              Formatting checks
              <span className="text-gray-400 font-normal">({result.checks.filter((c) => c.passed).length}/{result.checks.length} passed)</span>
            </h3>
            <ul className="space-y-3">
              {result.checks.map((check) => (
                <li key={check.id} className="flex gap-3">
                  {check.passed
                    ? <FiCheckCircle size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    : <FiXCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{check.label}</p>
                    <p className="text-sm text-gray-600">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <KeywordCard title="Keywords found" icon={FiCheckCircle} items={result.presentKeywords} tone="good" />
            <KeywordCard title="Missing keywords" icon={FiTag} items={result.missingKeywords} tone="warn" />
          </div>

          {result.sections.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                <FiList size={16} className="text-cyan-600" />
                Section-wise feedback
              </h3>
              <div className="divide-y divide-gray-100">
                {result.sections.map((section) => {
                  const status = STATUS_STYLE[section.status];
                  return (
                    <div key={section.name} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 sm:w-40 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-800">{section.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">{section.feedback}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.topFixes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <FiTrendingUp size={16} className="text-cyan-600" />
                Fix these first
              </h3>
              <ul className="space-y-2">
                {result.topFixes.map((fix) => (
                  <li key={fix} className="flex gap-2 text-sm text-gray-600">
                    <FiAlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    {fix}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AtsScanTab;
