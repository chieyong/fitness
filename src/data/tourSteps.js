/**
 * De stappen van de rondleiding. Een stap met een doel dat niet op het scherm
 * staat, wordt overgeslagen. `t` vertaalt de teksten.
 */
export function tourSteps({ demo, t }) {
  return [
    { id: 'welkom', target: null, title: t('tour.welcome.title'), body: t(demo ? 'tour.welcome.demo' : 'tour.welcome.owner') },
    { id: 'spieren', target: '.todaybody', title: t('tour.muscles.title'), body: t('tour.muscles.body') },
    { id: 'oefening', target: '.blocks .block', title: t('tour.exercise.title'), body: t('tour.exercise.body') },
    { id: 'video', target: '.vbtn', title: t('tour.video.title'), body: t('tour.video.body') },
    { id: 'voortgang', target: '.tabbar .tab:nth-child(2)', title: t('tour.progress.title'), body: t('tour.progress.body') },
    { id: 'schema', target: '.tabbar .tab:nth-child(3)', title: t('tour.schema.title'), body: t('tour.schema.body') },
  ];
}
