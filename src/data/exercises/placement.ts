import type { PlacementQuestion } from '../../types'

type Q = Omit<PlacementQuestion, 'id'>
const qs: Q[] = [
  // A1
  { level: 'A1', skill: 'grammaire', prompt: 'My name ___ Ahmed.', options: ['am', 'is', 'are'], answer: 1, explanation: '« My name » → is.' },
  { level: 'A1', skill: 'vocabulaire', prompt: 'A helmet protects your ___.', options: ['head', 'hand', 'foot'], answer: 0, explanation: 'helmet = casque : protège la tête (head).' },
  { level: 'A1', skill: 'grammaire', prompt: 'They ___ at the workshop.', options: ['is', 'are', 'am'], answer: 1, explanation: '« They » → are.' },
  { level: 'A1', skill: 'vocabulaire pro', prompt: 'A person who joins pipes with heat is a ___.', options: ['welder', 'driver', 'cook'], answer: 0, explanation: 'welder = soudeur.' },
  { level: 'A1', skill: 'lecture', passage: 'Ali works on a pipeline site. He wears a helmet and safety shoes. He starts work at 6 a.m.', prompt: 'What time does Ali start work?', options: ['6 a.m.', '8 a.m.', '6 p.m.'], answer: 0, explanation: 'Le texte dit : He starts work at 6 a.m.' },
  { level: 'A1', skill: 'ecoute', listen: true, passage: 'The waste area is on the left.', prompt: 'Where is the waste area?', options: ['On the left', 'On the right', 'Behind the office'], answer: 0, explanation: 'Phrase entendue : on the left.' },
  // A2
  { level: 'A2', skill: 'grammaire', prompt: 'Yesterday we ___ the site.', options: ['visit', 'visited', 'visiting'], answer: 1, explanation: 'Passé simple : visited.' },
  { level: 'A2', skill: 'grammaire', prompt: 'There ___ two drums near the tank.', options: ['is', 'are', 'be'], answer: 1, explanation: 'two drums (pluriel) → are.' },
  { level: 'A2', skill: 'vocabulaire', prompt: 'The opposite of "full" is ___.', options: ['empty', 'heavy', 'open'], answer: 0, explanation: 'full ≠ empty.' },
  { level: 'A2', skill: 'vocabulaire pro', prompt: 'A "spill" is ___.', options: ['a liquid leaking onto the ground', 'a type of tool', 'a safety rule'], answer: 0, explanation: 'spill = déversement.' },
  { level: 'A2', skill: 'lecture', passage: 'Please put used oil in the red drum. Paper goes in the blue bin. Do not mix waste.', prompt: 'Where does used oil go?', options: ['In the red drum', 'In the blue bin', 'Anywhere'], answer: 0, explanation: 'Used oil → red drum.' },
  { level: 'A2', skill: 'ecoute', listen: true, passage: 'Wear your helmet and gloves before you enter the workshop.', prompt: 'What must you wear?', options: ['Helmet and gloves', 'Only shoes', 'Nothing'], answer: 0, explanation: 'Phrase entendue : helmet and gloves.' },
  // B1
  { level: 'B1', skill: 'grammaire', prompt: 'I ___ in this company since 2020.', options: ['work', 'have worked', 'am working'], answer: 1, explanation: 'since + present perfect.' },
  { level: 'B1', skill: 'grammaire', prompt: 'If it rains, the trench ___ flooded.', options: ['will be', 'would be', 'was'], answer: 0, explanation: 'Conditionnel type 1 : will be.' },
  { level: 'B1', skill: 'vocabulaire', prompt: 'To "dispose of" waste means to ___.', options: ['get rid of it properly', 'buy it', 'count it'], answer: 0, explanation: 'dispose of = éliminer.' },
  { level: 'B1', skill: 'vocabulaire pro', prompt: '"Right-of-way" in pipeline work means ___.', options: ['the strip of land used for the pipeline', 'a traffic rule only', 'a type of valve'], answer: 0, explanation: 'right-of-way = emprise du pipeline.' },
  { level: 'B1', skill: 'lecture', passage: 'The inspection found oil stains on the ground near the generator. The supervisor agreed to place a drip tray and clean the soil by Friday.', prompt: 'What will the supervisor do?', options: ['Place a drip tray and clean the soil', 'Replace the generator', 'Stop the project'], answer: 0, explanation: 'Le superviseur a accepté de placer un bac et nettoyer le sol.' },
  { level: 'B1', skill: 'ecoute', listen: true, passage: 'The water sample was sent to the laboratory on Monday. The results will be ready in three days.', prompt: 'When will the results be ready?', options: ['In three days', 'On Monday', 'Tomorrow'], answer: 0, explanation: 'Phrase entendue : in three days.' },
  // B2
  { level: 'B2', skill: 'grammaire', prompt: 'The leak ___ if the valve had been closed.', options: ['would not have happened', 'will not happen', 'did not happen'], answer: 0, explanation: 'Conditionnel type 3.' },
  { level: 'B2', skill: 'grammaire', prompt: 'The report, ___ was sent yesterday, contains the findings.', options: ['which', 'who', 'what'], answer: 0, explanation: 'Relative non déterminative pour une chose : which.' },
  { level: 'B2', skill: 'vocabulaire', prompt: '"Corrective action" means ___.', options: ['an action to fix a problem', 'an action to check a payment', 'a type of audit'], answer: 0, explanation: 'corrective action = action corrective.' },
  { level: 'B2', skill: 'vocabulaire pro', prompt: 'In ISO 14001, an "environmental aspect" is ___.', options: ['an element of activities that can interact with the environment', 'a legal penalty', 'a laboratory method'], answer: 0, explanation: 'Aspect environnemental = élément des activités pouvant interagir avec l\'environnement.' },
  { level: 'B2', skill: 'lecture', passage: 'Although the contractor had been trained, several containers were left unlabelled. As a result, the inspector raised a non-conformity and requested a corrective action plan within seven days.', prompt: 'Why was a non-conformity raised?', options: ['Containers were left unlabelled', 'The inspector was late', 'Training was cancelled'], answer: 0, explanation: 'Le texte : several containers were left unlabelled.' },
  { level: 'B2', skill: 'ecoute', listen: true, passage: 'We will postpone the meeting until the laboratory confirms the results, which should be available by Thursday.', prompt: 'Why is the meeting postponed?', options: ['They are waiting for laboratory results', 'The supervisor is absent', 'The site is closed'], answer: 0, explanation: 'Phrase entendue : until the laboratory confirms the results.' },
  // C1
  { level: 'C1', skill: 'grammaire', prompt: 'Had the drums been properly sealed, the spill ___ occurred.', options: ['would not have', 'will not have', 'did not'], answer: 0, explanation: 'Inversion conditionnelle (type 3).' },
  { level: 'C1', skill: 'grammaire', prompt: 'Not only ___ the waste left on site, but it was also unlabelled.', options: ['was', 'the waste was', 'did'], answer: 0, explanation: 'Après « Not only » en tête : inversion (was the waste…).' },
  { level: 'C1', skill: 'vocabulaire', prompt: 'To "mitigate" a risk means to ___.', options: ['reduce its severity', 'ignore it', 'transfer it'], answer: 0, explanation: 'mitigate = atténuer.' },
  { level: 'C1', skill: 'vocabulaire pro', prompt: '"Containment" refers to ___.', options: ['keeping a spill from spreading', 'counting containers', 'paying a fine'], answer: 0, explanation: 'containment = confinement.' },
  { level: 'C1', skill: 'lecture', passage: 'The audit concluded that, while operational controls were largely effective, the lack of documented evidence undermined the organisation\'s ability to demonstrate compliance.', prompt: 'What was the main weakness?', options: ['Insufficient documented evidence', 'Ineffective controls', 'Lack of staff'], answer: 0, explanation: 'Le texte : the lack of documented evidence.' },
  { level: 'C1', skill: 'ecoute', listen: true, passage: 'Provided that the remediation is completed before the rainy season, the authority is unlikely to impose additional restrictions.', prompt: 'When are additional restrictions unlikely?', options: ['If remediation is completed before the rainy season', 'If the rainy season is long', 'If the authority changes'], answer: 0, explanation: 'Phrase entendue : provided that the remediation is completed before the rainy season.' },
]

export const PLACEMENT: PlacementQuestion[] = qs.map((q, i) => ({ ...q, id: `p${i + 1}` }))
