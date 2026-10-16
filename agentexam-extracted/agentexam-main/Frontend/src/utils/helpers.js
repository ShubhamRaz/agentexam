// ============================================
// AGENTEXAM — Utility Helpers
// ============================================

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function getScoreColor(score) {
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

export function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 50) return 'Below Average';
  return 'Needs Improvement';
}

export function getImportanceColor(importance) {
  switch (importance) {
    case 'high': return 'danger';
    case 'medium': return 'warning';
    case 'low': return 'success';
    default: return 'neutral';
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'strong': return 'success';
    case 'moderate': return 'warning';
    case 'weak': return 'danger';
    case 'completed': return 'success';
    case 'in_progress': return 'warning';
    case 'not_started': return 'neutral';
    case 'on_track': return 'success';
    case 'needs_attention': return 'warning';
    case 'at_risk': return 'danger';
    default: return 'neutral';
  }
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getMaterialTypeIcon(type) {
  switch (type) {
    case 'syllabus': return '📋';
    case 'pyq': return '📄';
    case 'notes': return '📝';
    case 'lab_manual': return '🔬';
    default: return '📁';
  }
}

export function getMaterialTypeColor(type) {
  switch (type) {
    case 'syllabus': return { bg: '#EDE9FE', color: '#7C3AED' };
    case 'pyq': return { bg: '#FEF3C7', color: '#D97706' };
    case 'notes': return { bg: '#DBEAFE', color: '#2563EB' };
    case 'lab_manual': return { bg: '#D1FAE5', color: '#059669' };
    default: return { bg: '#F1F5F9', color: '#64748B' };
  }
}
