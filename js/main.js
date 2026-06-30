/* ═══════════════════════════════════════════
<<<<<<< HEAD
   DATA — MSFTHub index and curated resources
═══════════════════════════════════════════ */
export const MSFTHUB_INDEX = {
  'az-900':'https://msfthub.com/azure/az-900/','az-104':'https://msfthub.com/azure/az-104/',
  'az-204':'https://msfthub.com/azure/az-204/','az-305':'https://msfthub.com/azure/az-305/',
  'az-400':'https://msfthub.com/azure/az-400/','az-500':'https://msfthub.com/azure/az-500/',
  'az-700':'https://msfthub.com/azure/az-700/','az-800':'https://msfthub.com/azure/az-800/',
  'az-801':'https://msfthub.com/azure/az-801/','az-120':'https://msfthub.com/azure/az-120/',
  'az-140':'https://msfthub.com/azure/az-140/','dp-100':'https://msfthub.com/azure/dp-100/',
  'dp-300':'https://msfthub.com/azure/dp-300/','dp-420':'https://msfthub.com/azure/dp-420/',
  'dp-600':'https://msfthub.com/azure/dp-600/','dp-700':'https://msfthub.com/azure/dp-700/',
  'dp-900':'https://msfthub.com/azure/dp-900/','sc-100':'https://msfthub.com/security/sc-100/',
  'sc-200':'https://msfthub.com/security/sc-200/','sc-300':'https://msfthub.com/security/sc-300/',
  'sc-401':'https://msfthub.com/security/sc-401/','sc-900':'https://msfthub.com/security/sc-900/',
  'ms-900':'https://msfthub.com/microsoft365/ms-900/','ms-102':'https://msfthub.com/microsoft365/ms-102/',
  'md-102':'https://msfthub.com/microsoft365/md-102/','ms-700':'https://msfthub.com/microsoft365/ms-700/',
  'ms-721':'https://msfthub.com/microsoft365/ms-721/','pl-900':'https://msfthub.com/power/pl-900/',
  'pl-200':'https://msfthub.com/power/pl-200/','pl-300':'https://msfthub.com/power/pl-300/',
  'pl-400':'https://msfthub.com/power/pl-400/','pl-500':'https://msfthub.com/power/pl-500/',
  'pl-600':'https://msfthub.com/power/pl-600/','mb-230':'https://msfthub.com/dynamics/mb-230/',
  'mb-240':'https://msfthub.com/dynamics/mb-240/','mb-280':'https://msfthub.com/dynamics/mb-280/',
  'mb-310':'https://msfthub.com/dynamics/mb-310/','mb-330':'https://msfthub.com/dynamics/mb-330/',
  'ai-900':'https://msfthub.com/aiab/ai-900/','ai-102':'https://msfthub.com/aiab/ai-102/',
  'ab-100':'https://msfthub.com/aiab/ab-100/','ab-730':'https://msfthub.com/aiab/ab-730/',
  'ab-731':'https://msfthub.com/aiab/ab-731/','ab-900':'https://msfthub.com/aiab/ab-900/',
  'gh-100':'https://msfthub.com/github/gh-100/','gh-200':'https://msfthub.com/github/gh-200/',
  'gh-300':'https://msfthub.com/github/gh-300/','gh-500':'https://msfthub.com/github/gh-500/',
  'gh-900':'https://msfthub.com/github/gh-900/',
};

export const MSFTHUB_RESOURCES = {
  'sc-300': [
    {type:'official',title:'Exam SC-300 Certification Page',url:'https://learn.microsoft.com/credentials/certifications/identity-and-access-administrator/?WT.mc_id=studentamb_165290',description:'Official Microsoft cert page with exam details and registration'},
    {type:'official',title:'SC-300 Study Guide',url:'https://learn.microsoft.com/credentials/certifications/resources/study-guides/sc-300?WT.mc_id=studentamb_165290',description:'Official study guide covering all exam topics and objectives'},
    {type:'official',title:'Microsoft Learn Learning Path',url:'https://learn.microsoft.com/training/courses/sc-300t00?WT.mc_id=studentamb_165290',description:'Official Microsoft Learn course and learning path for SC-300'},
    {type:'official',title:'Microsoft Learn Practice Assessment',url:'https://learn.microsoft.com/certifications/exams/sc-300/practice/assessment?assessment-type=practice&assessmentId=60&WT.mc_id=studentamb_165290',description:'Free official practice test to check your readiness'},
    {type:'official',title:'Exam Readiness Zone Videos',url:'https://learn.microsoft.com/shows/exam-readiness-zone/preparing-for-sc-300-implement-identities-in-azure-ad-1-of-4?WT.mc_id=studentamb_165290',description:'Video series explaining exactly what the exam tests you on'},
    {type:'official',title:'SC-300 Exam Labs',url:'https://msfthub.com/labs/security/sc-300',description:'All official lab exercises from Microsoft Learn, ILT, and Applied Skills'},
    {type:'video',title:"John Savill's SC-300 Full Course",url:'https://www.youtube.com/watch?v=LGpgqRVG65g&list=PLlVtbbG169nGj4rfaMUQiKiBZNDlxoo0y',description:'Comprehensive free YouTube course by Azure expert John Savill'},
    {type:'video',title:"John Savill's SC-300 Study Cram",url:'https://www.youtube.com/watch?v=LGpgqRVG65g&pp=ygUNc2MgMzAwIGNvdXJzZQ%3D%3D',description:'Condensed cram session — great for last-minute review'},
    {type:'video',title:'BurningIceTech SC-300 Course',url:'https://www.youtube.com/playlist?list=PLc6LqxQFwub_x6ETpGZ2nCmlq5kJ_F1eH',description:'Full YouTube playlist covering all SC-300 objectives'},
    {type:'video',title:'I am IT Geek SC-300 Course',url:'https://www.youtube.com/playlist?list=PLJBGLF8tZlXNw3nflOH_oswpaoHWnC93K',description:'Another popular free YouTube course for SC-300'},
    {type:'free',title:'Microsoft Entra Academy',url:'https://microsoft.github.io/PartnerResources/skilling/microsoft-security-academy/entra-academy',description:'Deep-dive resources on Microsoft Entra — core SC-300 topic'},
    {type:'free',title:'Defender for Identity Ninja Training',url:'https://techcommunity.microsoft.com/t5/security-compliance-and-identity/microsoft-defender-for-identity-ninja-training/ba-p/2117904?WT.mc_id=studentamb_165290',description:'Microsoft Ninja series covering Defender for Identity in depth'},
    {type:'free',title:'Microsoft 365 E5 Developer Tenant',url:'https://developer.microsoft.com/microsoft-365/dev-program?WT.mc_id=studentamb_165290',description:'Free sandbox tenant to practice Entra ID and M365 hands-on'},
    {type:'free',title:'MSFTHub SC-300 Full Resource Page',url:'https://msfthub.com/security/sc-300/',description:'Community-curated hub with all SC-300 resources in one place'},
  ],
};

function certCode(cert) {
  return cert.toLowerCase().replace(/\s+/g, '-').match(/[a-z]{2}-\d{3}/)?.[0] ?? null;
}

export function getMsfthubUrl(cert) {
  const code = certCode(cert);
  return code ? MSFTHUB_INDEX[code] || null : null;
}

export function getMsfthubResources(cert) {
  const code = certCode(cert);
  return code ? MSFTHUB_RESOURCES[code] || null : null;
}
=======
   MAIN — init and bootstrap
   Import render.js first so setRenderFn is called
   before any setState triggers a render.
═══════════════════════════════════════════ */
import './render.js';  // registers setRenderFn(render) as a side effect
import { S, setState } from './state.js';
import { storageGet } from './storage.js';

(async () => {
  const sessions = await storageGet('cert-sessions-v2');
  if (sessions) S.sessions = sessions;

  const bank = await storageGet('cert-quiz-bank');
  if (bank) S.questionBank = bank;

  const apiKey = await storageGet('cert-api-key');
  if (apiKey) S.apiKey = apiKey;

  const quizResults = await storageGet('cert-quiz-results');
  if (quizResults) S.quizResults = quizResults;

  const questionStats = await storageGet('cert-question-stats');
  if (questionStats) S.questionStats = questionStats;

  // Trigger first render
  setState({ view: 'home' });
})();
>>>>>>> c65b3994e6f089e1b65123f2c5038ed533891d86
