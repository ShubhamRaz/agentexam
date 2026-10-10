// ============================================
// AGENTEXAM — Reusable UI Components
// ============================================
import { useState, useEffect, createContext, useContext } from 'react';
import { Search, X, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Info, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { classNames } from '../../utils/helpers';

// ---- Button ----
export function Button({ children, variant = 'primary', size = 'md', icon: Icon, loading, disabled, className, ...props }) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : size === 'xl' ? 'btn-xl' : '';
  return (
    <button
      className={classNames('btn', `btn-${variant}`, sizeClass, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {!loading && Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
}

// ---- Input ----
export function Input({ label, error, hint, icon: Icon, required, className, ...props }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {Icon ? (
        <div className="input-with-icon">
          <Icon size={18} className="input-icon" />
          <input className={classNames('form-input', error && 'error', className)} {...props} />
        </div>
      ) : (
        <input className={classNames('form-input', error && 'error', className)} {...props} />
      )}
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
}

// ---- Textarea ----
export function Textarea({ label, error, required, rows = 4, className, ...props }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea className={classNames('form-textarea', error && 'error', className)} rows={rows} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ---- Select ----
export function Select({ label, options = [], error, required, placeholder, className, ...props }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select className={classNames('form-select', className)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ---- Card ----
export function Card({ children, hoverable, compact, className, ...props }) {
  return (
    <div className={classNames('card', hoverable && 'card-hoverable', compact && 'card-compact', className)} {...props}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className, ...props }) {
  return <div className={classNames('card-header', className)} {...props}>{children}</div>;
};

Card.Body = function CardBody({ children, className, ...props }) {
  return <div className={classNames('card-body', className)} {...props}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className, ...props }) {
  return <div className={classNames('card-footer', className)} {...props}>{children}</div>;
};

// ---- Badge ----
export function Badge({ children, variant = 'neutral', dot, size, className }) {
  return (
    <span className={classNames('badge', `badge-${variant}`, dot && 'badge-dot', size === 'lg' && 'badge-lg', className)}>
      {children}
    </span>
  );
}

// ---- AI Badge ----
export function AIBadge({ children = 'AI Generated' }) {
  return (
    <span className="ai-badge">
      <Sparkles className="sparkle" size={12} />
      {children}
    </span>
  );
}

// ---- Tabs ----
export function Tabs({ tabs, activeTab, onChange, variant = 'default', className }) {
  return (
    <div className={classNames('tabs', variant === 'pills' && 'tabs-pills', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={classNames('tab', activeTab === tab.id && 'active')}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <tab.icon size={16} />}
          {tab.label}
          {tab.count !== undefined && <Badge variant="neutral">{tab.count}</Badge>}
        </button>
      ))}
    </div>
  );
}

// ---- Progress Bar ----
export function ProgressBar({ value, max = 100, variant, size, label, showValue, className }) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClass = variant || (percentage >= 70 ? 'success' : percentage >= 40 ? 'warning' : 'danger');

  return (
    <div className={className}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          {label && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{label}</span>}
          {showValue && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={classNames('progress-bar-container', size === 'lg' && 'progress-bar-lg', size === 'sm' && 'progress-bar-sm')}>
        <div className={classNames('progress-bar-fill', colorClass)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// ---- Progress Circle ----
export function ProgressCircle({ value, max = 100, size = 120, strokeWidth = 8, label, className }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={classNames('progress-circle', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="progress-circle-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          className="progress-circle-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-circle-text">
        <span className="progress-circle-value">{Math.round(value)}</span>
        {label && <span className="progress-circle-label">{label}</span>}
      </div>
    </div>
  );
}

// ---- Modal ----
export function Modal({ isOpen, onClose, title, size, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-container" onClick={onClose}>
        <div className={classNames('modal', size === 'lg' && 'modal-lg')} onClick={e => e.stopPropagation()}>
          {title && (
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>
              <button className="modal-close" onClick={onClose}><X size={20} /></button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}

Modal.Body = function ModalBody({ children, className }) {
  return <div className={classNames('modal-body', className)}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children, className }) {
  return <div className={classNames('modal-footer', className)}>{children}</div>;
};

// ---- Empty State ----
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={classNames('empty-state', className)}>
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={28} />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action}
    </div>
  );
}

// ---- Loading Skeleton ----
export function Skeleton({ width, height, circle, className, count = 1 }) {
  const style = {
    width: width || '100%',
    height: height || '14px',
    borderRadius: circle ? '50%' : undefined,
  };

  if (count === 1) {
    return <div className={classNames('skeleton', className)} style={style} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={classNames('skeleton skeleton-text', className)} style={i === count - 1 ? { ...style, width: '70%' } : style} />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <Card.Body>
        <Skeleton height="20px" width="60%" className="skeleton-heading" />
        <Skeleton count={3} />
      </Card.Body>
    </Card>
  );
}

// ---- Search Input ----
export function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={classNames('search-container', className)}>
      <Search size={18} className="search-icon" />
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ---- Toast System ----
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 4000);
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={classNames('toast', `toast-${toast.type || 'info'}`)}>
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle2 size={20} color="var(--color-success)" />}
              {toast.type === 'error' && <AlertCircle size={20} color="var(--color-danger)" />}
              {toast.type === 'warning' && <AlertTriangle size={20} color="var(--color-warning)" />}
              {(!toast.type || toast.type === 'info') && <Info size={20} color="var(--color-info)" />}
            </div>
            <div className="toast-content">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button className="modal-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ---- Stat Card ----
export function StatCard({ icon: Icon, iconBg, iconColor, label, value, change, changeType, className }) {
  return (
    <div className={classNames('card stat-card', className)}>
      <div className="stat-card-icon" style={{ background: iconBg || 'var(--color-primary-100)', color: iconColor || 'var(--color-primary)' }}>
        <Icon size={22} />
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {change && (
        <div className={classNames('stat-card-change', changeType === 'positive' ? 'positive' : 'negative')}>
          {changeType === 'positive' ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  );
}

// ---- Loading Spinner ----
export function LoadingSpinner({ size = 24, className }) {
  return <Loader2 size={size} className={className} style={{ animation: 'spin 0.8s linear infinite' }} />;
}

// ---- Page Loading ----
export function PageLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <LoadingSpinner size={32} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' }}>Loading...</p>
    </div>
  );
}

// ---- Confirmation Dialog ----
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' }) {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="confirm-dialog">
        <div className="confirm-dialog-icon" style={{
          background: variant === 'danger' ? 'var(--color-danger-light)' : 'var(--color-primary-100)',
          color: variant === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)',
        }}>
          <AlertCircle size={28} />
        </div>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}
