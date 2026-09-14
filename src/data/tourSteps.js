/** De stappen van de rondleiding. Een stap met een doel dat niet op het scherm staat, wordt overgeslagen. */
export function tourSteps({ demo }) {
  return [
    {
      id: 'welkom',
      target: null,
      title: 'Welkom bij Repz',
      body: demo
        ? 'Een korte rondleiding. Je bekijkt nu demo-gegevens; log in om je eigen trainingen op te slaan.'
        : 'Een korte rondleiding langs wat je hier kunt.',
    },
    {
      id: 'oefening',
      target: '.blocks .block',
      title: 'Je oefeningen van vandaag',
      body: 'Tik een oefening open om je sets te loggen en te zeggen hoe het ging. Het rondje vult zich als je klaar bent.',
    },
    {
      id: 'video',
      target: '.vbtn',
      title: 'Uitleg bij een oefening',
      body: 'Staat er een video bij een oefening, dan speel je hem hier af.',
    },
    {
      id: 'voortgang',
      target: '.tabbar .tab:nth-child(2)',
      title: 'Voortgang',
      body: 'Zie per spiergroep hoe je vooruitgaat, met een grafiek per oefening.',
    },
    {
      id: 'schema',
      target: '.tabbar .tab:nth-child(3)',
      title: 'Je schema',
      body: "Pas targets aan en zet YouTube-video's bij je oefeningen.",
    },
    {
      id: 'thema',
      target: '.appbar__theme',
      title: 'Licht of donker',
      body: 'Kies zelf, of laat Repz de instelling van je telefoon volgen.',
    },
  ];
}
