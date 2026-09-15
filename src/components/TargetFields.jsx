import { useI18n } from '../i18n/I18nProvider.jsx';
import './TargetFields.css';

/**
 * Invoer voor een target: sets plus reps van-tot, of seconden van-tot.
 * De bovengrens is optioneel; leeg betekent een vast aantal.
 */
export default function TargetFields({ measure, value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  const timed = measure === 'tijd';
  const { t } = useI18n();

  return (
    <div className="target">
      <label className="target__field">
        <span>{t('target.sets')}</span>
        <input type="text" inputMode="numeric" value={value.sets ?? ''} onChange={set('sets')} />
      </label>
      <label className="target__field">
        <span>{t(timed ? 'target.seconds' : 'target.reps')}</span>
        <input type="text" inputMode="numeric"
          value={(timed ? value.secondsMin : value.repsMin) ?? ''}
          onChange={set(timed ? 'secondsMin' : 'repsMin')} />
      </label>
      <span className="target__dash" aria-hidden="true">{t('target.to')}</span>
      <label className="target__field">
        <span>{t('target.max')}</span>
        <input type="text" inputMode="numeric"
          value={(timed ? value.secondsMax : value.repsMax) ?? ''}
          onChange={set(timed ? 'secondsMax' : 'repsMax')} />
      </label>
    </div>
  );
}
