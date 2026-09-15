import { useI18n } from '../i18n/I18nProvider.jsx';
import './TabBar.css';

const TABS = [
  { id: 'vandaag', label: 'nav.today', icon: TodayIcon },
  { id: 'voortgang', label: 'nav.progress', icon: ProgressIcon },
  { id: 'schema', label: 'nav.schema', icon: SchemaIcon },
];

/** Tabbalk onderaan: bereikbaar met je duim, de actieve tab verhoogd in blauw. */
export default function TabBar({ active, onNavigate }) {
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label={t('nav.aria')}>
      <div className="tabbar__inner">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = id === active;
          return (
            <button key={id} type="button"
              className={`tab${on ? ' tab--on' : ''}`}
              aria-current={on ? 'page' : undefined}
              onClick={() => onNavigate(id)}>
              <span className="tab__icon"><Icon /></span>
              <span className="tab__label">{t(label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const svg = { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

/** Halter: de training van vandaag. */
function TodayIcon() {
  return (
    <svg {...svg}>
      <path d="M7 11h8" />
      <rect x="3.5" y="7" width="3.5" height="8" rx="1.2" />
      <rect x="15" y="7" width="3.5" height="8" rx="1.2" />
      <path d="M2 9.5v3M20 9.5v3" />
    </svg>
  );
}

/** Stijgende lijn: voortgang. */
function ProgressIcon() {
  return (
    <svg {...svg}>
      <path d="M3 17.5h16" />
      <path d="M4.5 14l4.2-4.2 3.3 3 5.5-6" />
      <path d="M13.8 6.8h3.7v3.7" />
    </svg>
  );
}

/** Lijst met vinkjes: het schema. */
function SchemaIcon() {
  return (
    <svg {...svg}>
      <path d="M9.5 6h9M9.5 11h9M9.5 16h9" />
      <path d="M3.5 6l1.2 1.2L7 5M3.5 11l1.2 1.2L7 10M3.5 16l1.2 1.2L7 15" />
    </svg>
  );
}
