// Confirmed national delivery calendar. Revalidate sources before extending years.
export const OFFICIAL_CALENDAR_SOURCES = {
  verifiedOn: '2026-11-18',
  years: [2026, 2027],
  lft: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf',
  elections: 'https://www.ine.mx/voto-y-elecciones/elecciones-2027/',
} as const;
export const OFFICIAL_HOLIDAYS = [
  { date: '2026-01-01', name: 'Año Nuevo · LFT art. 74' },
  {
    date: '2026-02-02',
    name: 'Conmemoración de la Constitución · LFT art. 74',
  },
  {
    date: '2026-03-16',
    name: 'Conmemoración del natalicio de Benito Juárez · LFT art. 74',
  },
  { date: '2026-05-01', name: 'Día del Trabajo · LFT art. 74' },
  { date: '2026-09-16', name: 'Independencia de México · LFT art. 74' },
  { date: '2026-11-16', name: 'Conmemoración de la Revolución · LFT art. 74' },
  { date: '2026-12-25', name: 'Navidad · LFT art. 74' },
  { date: '2027-01-01', name: 'Año Nuevo · LFT art. 74' },
  {
    date: '2027-02-01',
    name: 'Conmemoración de la Constitución · LFT art. 74',
  },
  {
    date: '2027-03-15',
    name: 'Conmemoración del natalicio de Benito Juárez · LFT art. 74',
  },
  { date: '2027-05-01', name: 'Día del Trabajo · LFT art. 74' },
  {
    date: '2027-06-06',
    name: 'Jornada electoral federal ordinaria · INE / LFT art. 74',
  },
  { date: '2027-09-16', name: 'Independencia de México · LFT art. 74' },
  { date: '2027-11-15', name: 'Conmemoración de la Revolución · LFT art. 74' },
  { date: '2027-12-25', name: 'Navidad · LFT art. 74' },
] as const;
