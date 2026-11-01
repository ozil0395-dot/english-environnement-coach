import type { Exercise } from '../../types'
import { mcq, fill } from '../builders'

export interface GrammarTopic { id: string; title: string; explanation: string[]; examples: string[]; exercises: Exercise[] }

export const GRAMMAR: GrammarTopic[] = [
  {
    id: 'g1', title: 'Présent simple ou présent continu',
    explanation: ['Présent simple : habitudes, faits, règles (I inspect the site every week).', 'Présent continu : action en cours maintenant (I am inspecting the site now).', 'Au présent simple, 3e personne du singulier : he / she / it + s (she works).'],
    examples: ['I check the waste area every morning.', 'The welder is working on the joint now.'],
    exercises: [
      mcq('g1-1', 'He ___ the waste area every day.', ['check', 'checks', 'is check'], 1, '3e personne : checks.'),
      mcq('g1-2', 'Look! The truck ___ the drums.', ['loads', 'is loading', 'load'], 1, 'Action en cours : is loading.'),
      fill('g1-3', 'She ___ (not / work) on Fridays. Écris : « does not work »', ['does not work', "doesn't work"], 'Négation 3e pers. : does not + base.'),
      mcq('g1-4', 'We ___ PPE on site. (habitude)', ['wear', 'are wearing', 'wears'], 0, 'Règle générale : présent simple.'),
      fill('g1-5', 'Right now, I ___ (write) a report. Écris : « am writing »', ['am writing'], 'be + verbe-ing.'),
    ],
  },
  {
    id: 'g2', title: 'Passé simple',
    explanation: ['Action terminée dans le passé : verbe + -ed (inspected) ou forme irrégulière (found, took, went).', 'Négation et question : did + verbe de base (Did you see the leak? I did not see it).'],
    examples: ['We found oil on the ground yesterday.', 'Did you report the leak? No, I did not.'],
    exercises: [
      mcq('g2-1', 'Yesterday the team ___ the spill.', ['contain', 'contained', 'containing'], 1, 'Passé régulier : contained.'),
      mcq('g2-2', 'We ___ a leak last week. (find)', ['finded', 'found', 'founded'], 1, 'find → found (irrégulier).'),
      fill('g2-3', 'Did you ___ the supervisor? (informer) Écris le verbe : « inform »', ['inform'], 'Après did : verbe de base.'),
      mcq('g2-4', 'She ___ not attend the meeting.', ['did', 'does', 'was'], 0, 'Négation passée : did not.'),
      fill('g2-5', 'I ___ (go) to the site on Monday. Écris : « went »', ['went'], 'go → went.'),
    ],
  },
  {
    id: 'g3', title: 'Present perfect, for et since',
    explanation: ['Present perfect (have/has + participe passé) : lien entre passé et présent, expérience, résultat.', '« for » + durée (for three years) ; « since » + point de départ (since 2021).', 'Ne pas dire « I work here since 2020 » : on dit « I have worked here since 2020 ».'],
    examples: ['I have worked here for three years.', 'The waste has already been removed.'],
    exercises: [
      mcq('g3-1', 'I ___ in this company since 2021.', ['work', 'have worked', 'am working'], 1, 'since + present perfect.'),
      fill('g3-2', 'She has worked here ___ five years. (for / since)', ['for'], 'for + durée.'),
      fill('g3-3', 'We have been here ___ Monday. (for / since)', ['since'], 'since + point de départ.'),
      mcq('g3-4', '___ you finished the report yet?', ['Did', 'Have', 'Are'], 1, 'Have you finished … yet ?'),
      mcq('g3-5', 'The area ___ been cleaned already.', ['have', 'has', 'is'], 1, 'The area (singulier) → has.'),
    ],
  },
  {
    id: 'g4', title: 'Dénombrable et indénombrable (waste, information…)',
    explanation: ['Indénombrables (pas de -s, pas de « a ») : waste, information, equipment, advice, water, pollution.', 'On utilise « some / much / a lot of » avec les indénombrables et « many / a few » avec les dénombrables.', 'Pour compter : a piece of information, a drum of waste.'],
    examples: ['We have a lot of waste.', 'I need some information.'],
    exercises: [
      mcq('g4-1', 'Which is correct?', ['The informations are ready.', 'The information is ready.', 'The information are ready.'], 1, '« information » est indénombrable : is.'),
      mcq('g4-2', 'There is too ___ waste near the workshop.', ['many', 'much', 'a few'], 1, 'much + indénombrable.'),
      mcq('g4-3', 'We need new ___ for the workshop.', ['equipments', 'equipment', 'an equipment'], 1, '« equipment » est indénombrable.'),
      fill('g4-4', 'How ___ drums do you have? (combien — dénombrable)', ['many'], 'many + dénombrable pluriel.'),
      mcq('g4-5', 'Could you give me ___ advice?', ['an', 'some', 'many'], 1, '« advice » : some advice.'),
    ],
  },
  {
    id: 'g5', title: 'Modaux : must, should, can, could',
    explanation: ['must / have to : obligation (You must wear PPE).', 'must not : interdiction (You must not smoke here).', 'should : conseil (You should report it).', 'can / could : capacité, permission, demande polie (Could you help me?).'],
    examples: ['You must not store fuel here.', 'You should wear gloves.'],
    exercises: [
      mcq('g5-1', 'Smoking is forbidden. You ___ smoke here.', ['must not', 'do not must', 'should'], 0, 'Interdiction : must not.'),
      mcq('g5-2', '___ you open the door, please? (demande polie)', ['Could', 'Must', 'Do'], 0, 'Could you … ?'),
      fill('g5-3', 'Workers ___ to wear PPE. (obligation, avec have)', ['have'], 'have to = obligation (comme must).'),
      mcq('g5-4', 'You ___ report the leak. (conseil fort)', ['should', 'can not', 'might not'], 0, 'should = conseil.'),
      mcq('g5-5', 'Choose the correct form:', ['He musts wear a helmet.', 'He must wear a helmet.', 'He must to wear a helmet.'], 1, 'Après un modal : verbe de base, sans -s ni to.'),
    ],
  },
  {
    id: 'g6', title: 'Voix passive',
    explanation: ['Passive = be + participe passé. Utile quand l\'auteur n\'est pas important : The spill was contained.', 'Présent : The waste is collected every week. Passé : The area was cleaned. Parfait : The report has been sent.', 'Pour dire qui a fait l\'action : by + agent.'],
    examples: ['The waste is collected every Monday.', 'The soil was removed by the contractor.'],
    exercises: [
      mcq('g6-1', 'The contaminated soil ___ removed yesterday.', ['was', 'is', 'has'], 0, 'Passé passif : was removed.'),
      mcq('g6-2', 'Waste ___ collected every week.', ['is', 'are', 'does'], 0, '« waste » singulier : is collected.'),
      fill('g6-3', 'The report has ___ sent. (été)', ['been'], 'has been + participe passé.'),
      mcq('g6-4', 'The drums ___ labelled before storage.', ['must be', 'must to be', 'must is'], 0, 'must be + participe passé.'),
      fill('g6-5', 'The area was cleaned ___ the contractor. (par)', ['by'], 'by + agent.'),
    ],
  },
  {
    id: 'g7', title: 'Conditionnel : if',
    explanation: ['Type 1 (réel) : If + présent, will + base (If it rains, the trench will flood).', 'Type 2 (irréel présent) : If + passé, would + base (If we had more kits, we would respond faster).', 'Type 3 (irréel passé) : If + past perfect, would have + participe (If the drum had been sealed, the spill would not have happened).'],
    examples: ['If you see a leak, call me immediately.', 'If the drums had been sealed, the spill would not have happened.'],
    exercises: [
      mcq('g7-1', 'If you ___ a leak, call me.', ['see', 'will see', 'saw'], 0, 'Type 1 : if + présent.'),
      mcq('g7-2', 'If we had more spill kits, we ___ respond faster.', ['will', 'would', 'did'], 1, 'Type 2 : would + base.'),
      fill('g7-3', 'If the valve had been closed, the leak would not have ___ . (se produire) Écris : « happened »', ['happened'], 'would not have + participe passé.'),
      mcq('g7-4', 'If it rains, the road ___ closed.', ['will be', 'would be', 'was'], 0, 'Type 1 : will be.'),
      mcq('g7-5', 'If I ___ you, I would report it.', ['am', 'was', 'were'], 2, 'If I were you : forme standard du conseil.'),
    ],
  },
  {
    id: 'g8', title: 'Prépositions : at, in, on, for, by',
    explanation: ['at + lieu précis ou heure (at the gate, at 6 a.m.) ; in + lieu large ou mois (in Algeria, in March) ; on + jour (on Monday).', 'for + durée ; by + échéance (by Friday).', 'work at a company, responsible for, depend on, interested in.'],
    examples: ['The meeting is on Monday at 9 a.m.', 'Please send it by Friday.'],
    exercises: [
      fill('g8-1', 'The meeting is ___ Monday. (on / in / at)', ['on'], 'on + jour.'),
      fill('g8-2', 'We start work ___ 6 a.m. (on / in / at)', ['at'], 'at + heure.'),
      fill('g8-3', 'I am responsible ___ waste management.', ['for'], 'responsible for.'),
      mcq('g8-4', 'The project starts ___ March.', ['in', 'on', 'at'], 0, 'in + mois.'),
      mcq('g8-5', 'Please send me the report ___ Friday. (au plus tard)', ['by', 'since', 'for'], 0, 'by + échéance.'),
    ],
  },
]
