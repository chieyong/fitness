import Model from 'react-body-highlighter';
import { muscleWeights, roleOf, ROLES } from '../lib/muscleWeights.js';
import { muscleLabel, KNOWN_MUSCLES } from '../lib/muscleLabels.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './ExerciseMuscles.css';

/**
 * Eén tint uit dezelfde schaal als Voortgang, sterker naarmate de rol zwaarder
 * weegt (per thema monotoon in lichtheid). Zo staat de volgorde primair >
 * secundair > tertiair in de kleur zelf, ook zonder de legenda te lezen.
 */
export const ROLE_COLORS = {
  primair: 'var(--ramp-5)',
  secundair: 'var(--ramp-3)',
  tertiair: 'var(--ramp-1)',
};

/**
 * Welke spieren één oefening raakt, als klein silhouet (voor- en achterkant).
 * react-body-highlighter kiest een kleur per `frequency`; elke spier krijgt
 * daarom zijn eigen plek in de kleurenlijst, met de kleur van zijn rol.
 *
 * De polygonen zijn alleen met de muis te bedienen en dragen geen tekst, dus
 * de legenda ernaast noemt de spieren gewoon bij naam: dat is tegelijk het
 * toegankelijke alternatief voor het plaatje.
 */
export default function ExerciseMuscles({ exercise }) {
  const { t, locale } = useI18n();

  const shown = [...muscleWeights(exercise)].filter(([m]) => KNOWN_MUSCLES.includes(m));
  if (shown.length === 0) return null;

  const colors = shown.map(([, w]) => ROLE_COLORS[roleOf(w)]);
  const data = shown.map(([m], i) => ({ name: muscleLabel(m, locale), muscles: [m], frequency: i + 1 }));

  const byRole = ROLES
    .map((role) => [role, shown.filter(([, w]) => roleOf(w) === role).map(([m]) => m)])
    .filter(([, ms]) => ms.length > 0);

  return (
    <section className="exmus" aria-label={t('block.muscles')}>
      <div className="exmus__figures" aria-hidden="true">
        {['anterior', 'posterior'].map((type) => (
          <Model key={type} type={type} data={data} bodyColor="var(--body-empty)" highlightedColors={colors}
            style={{ width: '100%' }} svgStyle={{ width: '100%', height: 'auto' }} />
        ))}
      </div>

      <dl className="exmus__roles">
        {byRole.map(([role, ms]) => (
          <div key={role} className="exmus__role">
            <dt>
              <i className="exmus__dot" style={{ background: ROLE_COLORS[role] }} aria-hidden="true" />
              {t(`roles.${role}`)}
            </dt>
            <dd>{ms.map((m) => muscleLabel(m, locale)).join(', ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
