'use client';

import { useEffect, useState } from 'react';
import { Skill } from '@/lib/skills-types';
import SkillCard from './skill-card';
import { Search, RefreshCw, Loader, ArrowUpDown, ChevronUp, ChevronDown, LayoutGrid, List } from 'lucide-react';

type SortField = 'name' | 'installed_date' | 'type' | 'status';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'grouped';

const TYPE_ORDER: Record<string, number> = {
  'integration': 0,
  'agent': 1,
  'tool': 2,
  'skill': 3,
  'credential-manager': 4,
};

const TYPE_LABELS: Record<string, string> = {
  'integration': 'Integrations',
  'agent': 'Agents',
  'tool': 'Tools',
  'skill': 'Skills',
  'credential-manager': 'Credential Managers',
};

const TYPE_COLORS: Record<string, string> = {
  'integration': 'border-blue-400/40 bg-blue-500/10',
  'agent': 'border-purple-400/40 bg-purple-500/10',
  'tool': 'border-amber-400/40 bg-amber-500/10',
  'skill': 'border-cm-purple/40 bg-dark-success/100/10',
  'credential-manager': 'border-dark-border bg-dark-panel2',
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('installed_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  const skillTypes = [
    'all',
    'credential-manager',
    'agent',
    'skill',
    'integration',
    'tool',
  ];

  const statusTypes = ['all', 'active', 'inactive', 'error'];

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/skills/registry');
      if (!response.ok) throw new Error('Failed to load skills');

      const data = await response.json();
      setSkills(data.registry?.skills || data.skills || []);
    } catch (error) {
      console.error('Error loading skills:', error);
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...skills];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.description?.toLowerCase().includes(term) ||
          s.id.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'installed_date':
          comparison = (a.installed_date || '').localeCompare(b.installed_date || '');
          break;
        case 'type':
          comparison = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
          break;
        case 'status': {
          const statusOrder: Record<string, number> = { active: 0, inactive: 1, error: 2 };
          comparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredSkills(filtered);
  }, [skills, searchTerm, typeFilter, statusFilter, sortBy, sortDirection]);

  const handleToggle = async (skillId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/skills/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: skillId, enabled }),
      });

      if (!response.ok) throw new Error('Toggle failed');

      // Update local state
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId ? { ...s, status: enabled ? 'active' : 'inactive' } : s
        )
      );
    } catch (error) {
      console.error('Error toggling skill:', error);
      throw error;
    }
  };

  const handleUninstall = async (skillId: string) => {
    try {
      const response = await fetch('/api/skills/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: skillId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Uninstall failed');
      }

      // Remove from local state (optimistic)
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (error) {
      console.error('Error uninstalling skill:', error);
      throw error;
    }
  };

  const handleAuthUpdate = (_skillId: string) => {
    // Refresh skills to get updated auth status
    loadSkills();
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection(field === 'name' || field === 'type' ? 'asc' : 'desc');
    }
  };

  // Group skills by type for grouped view
  const groupedSkills = (): { type: string; label: string; color: string; skills: Skill[] }[] => {
    const groups: Record<string, Skill[]> = {};
    for (const skill of filteredSkills) {
      const t = skill.type;
      if (!groups[t]) groups[t] = [];
      groups[t].push(skill);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99))
      .map(([type, skills]) => ({
        type,
        label: TYPE_LABELS[type] || type,
        color: TYPE_COLORS[type] || 'border-dark-border bg-dark-panel2',
        skills,
      }));
  };

  const stats = {
    total: skills.length,
    active: skills.filter((s) => s.status === 'active').length,
    inactive: skills.filter((s) => s.status === 'inactive').length,
    authenticated: skills.filter((s) => s.authStatus === 'authenticated').length,
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-dark-muted" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3 text-cm-purple" />
      : <ChevronDown className="w-3 h-3 text-cm-purple" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dark-text">Skills Registry</h1>
          <p className="text-dark-muted mt-1">
            Manage installed skills, agents, and integrations
          </p>
        </div>
        <button
          onClick={loadSkills}
          disabled={isLoading}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:bg-dark-panel2 flex items-center gap-2 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
          <div className="text-sm text-dark-muted">Total Skills</div>
          <div className="text-2xl font-bold text-dark-text">{stats.total}</div>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
          <div className="text-sm text-dark-muted">Active</div>
          <div className="text-2xl font-bold text-dark-success">{stats.active}</div>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
          <div className="text-sm text-dark-muted">Inactive</div>
          <div className="text-2xl font-bold text-dark-muted">{stats.inactive}</div>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
          <div className="text-sm text-dark-muted">Authenticated</div>
          <div className="text-2xl font-bold text-cm-purple">{stats.authenticated}</div>
        </div>
      </div>

      {/* Filters & Sort Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
            <input
              placeholder="Search skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple"
            />
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:border-cm-purple text-sm"
        >
          {skillTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : TYPE_LABELS[type] || type}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:border-cm-purple text-sm"
        >
          {statusTypes.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        {/* Separator */}
        <div className="h-8 w-px bg-dark-border" />

        {/* Sort Controls */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-dark-muted mr-1">Sort:</span>
          {([
            ['name', 'Name'],
            ['installed_date', 'Date'],
            ['type', 'Type'],
            ['status', 'Status'],
          ] as [SortField, string][]).map(([field, label]) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1 transition-colors ${
                sortBy === field
                  ? 'bg-cm-purple/20 text-cm-purple font-medium'
                  : 'bg-dark-panel2 text-dark-muted hover:bg-dark-panel2'
              }`}
            >
              {label}
              <SortIcon field={field} />
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-dark-border" />

        {/* View Mode Toggle */}
        <div className="flex items-center border border-dark-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-cm-purple/20 text-cm-purple' : 'bg-dark-panel text-dark-muted hover:bg-dark-panel2'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`p-2 ${viewMode === 'grouped' ? 'bg-cm-purple/20 text-cm-purple' : 'bg-dark-panel text-dark-muted hover:bg-dark-panel2'}`}
            title="Grouped by type"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Skills Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-dark-muted" />
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-dark-muted">No skills found matching your filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Flat Grid View */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={handleToggle}
              onAuthUpdate={handleAuthUpdate}
              onUninstall={handleUninstall}
            />
          ))}
        </div>
      ) : (
        /* Grouped View — separated by type */
        <div className="space-y-8">
          {groupedSkills().map((group) => (
            <div key={group.type}>
              <div className={`flex items-center gap-3 mb-4 pb-2 border-b-2 ${group.color.split(' ')[0]}`}>
                <h2 className="text-lg font-semibold tracking-tight text-dark-text">
                  {group.label}
                </h2>
                <span className="text-sm text-dark-muted bg-dark-panel2 px-2 py-0.5 rounded-full">
                  {group.skills.length}
                </span>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {group.skills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onToggle={handleToggle}
                    onAuthUpdate={handleAuthUpdate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
