/* ═══════════════════════════════════════════
   PLAN — study plan generation + dashboard chat
═══════════════════════════════════════════ */
import { S, setState } from './state.js';
import { askClaudeJSON, askClaude } from './api.js';
import { saveSessions, storageSet } from './storage.js';
import { getMsfthubResources, getMsfthubUrl } from './data.js';

export async function handleStartPlan() {
  const cert = S.certInput.trim();
  if (!cert) return;
  if (!S.apiKey) { setState({ tempApiKey: '', showApiModal: true }); return; }

  setState({ genError: '', genStatus: `Researching ${cert}...`, view: 'generating' });
  const system = 'You are an expert certification coach. Return ONLY a single valid JSON object with no markdown, no code fences, no explanation.';
  const prompt = `Create a study plan for the certification: "${cert}"\n\nReturn ONLY this JSON, no markdown:\n{"cert":"${cert}","overview":"2-3 sentence description","examInfo":{"duration":"...","questions":"...","passingScore":"...","cost":"...","validity":"..."},"topics":[{"id":"topic-1","title":"...","weight":"20%","description":"1-2 sentences","subtopics":["...","..."],"resources":[{"type":"official","title":"...","url":"https://...","description":"..."},{"type":"free","title":"...","url":"https://...","description":"..."},{"type":"video","title":"...","url":"https://youtube.com","description":"..."}],"estimatedHours":5}],"studyPlan":{"totalWeeks":8,"weeklyHours":10,"phases":[{"phase":1,"name":"...","weeks":"1-2","focus":"...","topics":["topic-1"]}]},"tips":["...","...","..."]}\nInclude 4-6 realistic topics for "${cert}".`;

  try {
    setState({ genStatus: 'Building your personalized study plan...' });
    const plan = await askClaudeJSON([{ role: 'user', content: prompt }], system, S.apiKey);
    if (!plan?.topics) throw new Error('Unexpected response. Please try again.');

    const curated = getMsfthubResources(cert);
    if (curated) {
      plan.topics = plan.topics.map((topic, i) => ({
        ...topic,
        resources: i === 0
          ? [...curated.slice(0, 4), ...(topic.resources || [])]
          : [{ type: 'official', title: `MSFTHub ${cert.toUpperCase()} Resources`, url: getMsfthubUrl(cert), description: 'Community-curated study materials for this exam' }, ...(topic.resources || [])],
      }));
    }

    const session = { id: Date.now(), cert: plan.cert || cert, plan, progress: {}, createdAt: new Date().toISOString() };
    await saveSessions([session, ...S.sessions]);
    setState({ activeSession: session, certInput: '', view: 'dashboard' });
  } catch (err) {
    setState({ genError: err.message || 'Something went wrong. Please try again.' });
  }
}

export async function toggleTopicDone(topicId) {
  const prog = {
    ...S.activeSession.progress,
    [topicId]: { ...S.activeSession.progress[topicId], done: !S.activeSession.progress[topicId]?.done },
  };
  const updated = { ...S.activeSession, progress: prog };
  setState({ activeSession: updated });
  await saveSessions(S.sessions.map(s => s.id === updated.id ? updated : s));
}

export async function sendDashChat() {
  const input = S.dashChatInput.trim();
  if (!input || S.dashChatLoading) return;
  if (!S.apiKey) { setState({ tempApiKey: '', showApiModal: true }); return; }

  const userMsg = { role: 'user', content: input };
  const history = [...S.dashChat, userMsg];
  setState({ dashChat: history, dashChatInput: '', dashChatLoading: true });

  const plan = S.activeSession.plan;
  const cert = S.activeSession.cert;
  const system = `You are a study plan editor for the "${cert}" certification exam. The user can ask you to:
- Add missing topics to the study plan
- Add missing subtopics to existing topics
- Add resources to topics
- Add exam tips
- Fix incorrect information
- Answer questions about the cert

When the user asks you to modify the plan, you MUST respond with a JSON action block followed by a friendly confirmation message.

Format for modifications:
<action>
{"type":"update_plan","plan":{...full updated plan JSON...}}
</action>

The current plan JSON is:
${JSON.stringify(plan)}

If just answering a question (not modifying), respond normally with no action block.`;

  try {
    const msgs = history.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
    const reply = await askClaude(msgs, system, S.apiKey);

    const actionMatch = reply.match(/<action>([\s\S]*?)<\/action>/);
    let displayReply = reply.replace(/<action>[\s\S]*?<\/action>/, '').trim();

    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1].trim());
        if (action.type === 'update_plan' && action.plan) {
          const updated = { ...S.activeSession, plan: action.plan };
          setState({ activeSession: updated }, true);
          await storageSet('cert-sessions-v2', S.sessions.map(s => s.id === updated.id ? updated : s));
          if (!displayReply) displayReply = '✓ Study plan updated — scroll up to see changes.';
        }
      } catch (e) { displayReply = reply; }
    }

    const assistantMsg = { role: 'assistant', content: displayReply };
    setState({ dashChat: [...history, assistantMsg], dashChatLoading: false }, true);
    if (window._dashChatRenderMessages) window._dashChatRenderMessages();
    else setState({}, false);
  } catch (e) {
    setState({ dashChat: [...history, { role: 'assistant', content: 'Sorry, something went wrong: ' + e.message }], dashChatLoading: false }, true);
    if (window._dashChatRenderMessages) window._dashChatRenderMessages();
    else setState({}, false);
  }
}
