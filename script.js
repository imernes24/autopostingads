let variations = [];
let activeVar = 0;
let organicPostId = null;

function toggleVis(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function goToStep(n) {
  [1,2,3,4,5].forEach(i => {
    document.getElementById('step'+i).classList.add('section-hidden');
    const s = document.getElementById('s'+i);
    s.classList.remove('active','done');
    if (i < n) s.classList.add('done');
  });
  document.getElementById('step'+n).classList.remove('section-hidden');
  document.getElementById('s'+n).classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
}

function goToStep2() {
  const token = document.getElementById('fbToken').value.trim();
  const pageId = document.getElementById('pageId').value.trim();
  const apiKey = document.getElementById('anthropicKey').value.trim();
  if (!token || !pageId || !apiKey) { alert('Pakiusap punan ang Page Access Token, Page ID, at Anthropic API Key.'); return; }
  goToStep(2);
}

function toggleBoost() {
  const on = document.getElementById('boostToggle').checked;
  document.getElementById('boostFields').style.display = on ? 'block' : 'none';
  document.getElementById('postBtn').className = 'btn ' + (on ? 'btn-boost' : 'btn-fb');
  document.getElementById('postBtnText').textContent = on ? '⚡ I-Post + I-Boost' : '📤 I-Post Organically';
  updateBudgetEstimate();
}

function updateBudgetEstimate() {
  const budget = parseFloat(document.getElementById('dailyBudget').value) || 150;
  const days = parseInt(document.getElementById('numDays').value) || 7;
  document.getElementById('totalBudget').textContent = '₱' + (budget * days).toLocaleString();
  document.getElementById('durationText').textContent = days + ' araw';
}

document.addEventListener('input', e => {
  if (['dailyBudget','numDays'].includes(e.target.id)) updateBudgetEstimate();
});

async function generateCaption() {
  const name = document.getElementById('prodName').value.trim();
  if (!name) { alert('Ilagay ang pangalan ng produkto.'); return; }

  const btn = document.getElementById('genBtn');
  btn.innerHTML = '<span class="spinner"></span> Generating...';
  btn.disabled = true;

  const apiKey = document.getElementById('anthropicKey').value.trim();
  const price = document.getElementById('prodPrice').value;
  const promo = document.getElementById('prodPromo').value;
  const target = document.getElementById('prodTarget').value;
  const features = document.getElementById('prodFeatures').value;
  const pain = document.getElementById('prodPain').value;
  const cta = document.getElementById('prodCta').value;
  const tone = document.getElementById('prodTone').value;

  const prompt = `Ikaw ay expert Filipino Facebook ad copywriter para sa e-commerce.
Gumawa ng 3 Facebook ad captions sa natural Filipino/Tagalog para sa lead generation.

Produkto:
- Pangalan: ${name}
- Presyo: ${price || 'hindi ibinigay'}
- Promo: ${promo || 'wala'}
- Target: ${target || 'pangkalahatan'}
- Features: ${features || 'hindi ibinigay'}
- Pain point: ${pain || 'hindi ibinigay'}
- CTA: ${cta || 'Mag-DM'}
- Tone: ${tone}

Format (sundin nang eksakto):
---VARIATION 1---
[caption]
---VARIATION 2---
[caption]
---VARIATION 3---
[caption]

Rules:
- Natural Filipino/Tagalog, conversational
- Variation 1: Problem → Solution
- Variation 2: FOMO / Social proof
- Variation 3: Urgency / Direct offer
- May clear CTA at 5-7 hashtags bawat isa
- Gumamit ng emojis nang tama`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'API error');
    const text = data.content[0].text;
    variations = text.split(/---VARIATION \d+---/).filter(v => v.trim());
    renderVariations();
    goToStep(3);
  } catch(err) {
    alert('Error: ' + err.message);
  } finally {
    btn.innerHTML = '✨ Generate Caption';
    btn.disabled = false;
  }
}

function renderVariations() {
  const tabs = document.getElementById('varTabs');
  tabs.innerHTML = '';
  variations.forEach((v, i) => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (i === 0 ? ' active' : '');
    tab.textContent = 'Variation ' + (i+1);
    tab.onclick = () => selectVar(i);
    tabs.appendChild(tab);
  });
  selectVar(0);
}

function selectVar(i) {
  activeVar = i;
  document.querySelectorAll('.tab').forEach((t,j) => t.classList.toggle('active', j===i));
  const v = variations[i].trim();
  document.getElementById('captionBox').textContent = v;
  document.getElementById('captionEdit').value = v;
  document.getElementById('fbPreview').style.display = 'none';
}

function previewCaption() {
  const cap = document.getElementById('captionEdit').value || document.getElementById('captionBox').textContent;
  document.getElementById('previewBody').textContent = cap;
  document.getElementById('sponsoredBadge').style.display = document.getElementById('boostToggle')?.checked ? 'inline' : 'none';
  document.getElementById('fbPreview').style.display = 'block';
}

function getCaption() {
  return (document.getElementById('captionEdit').value || document.getElementById('captionBox').textContent).trim();
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.className = type; el.textContent = msg; el.style.display = 'block';
}

async function postOrganic() {
  const caption = getCaption();
  if (!caption || caption === 'Loading...') { alert('Walang caption.'); return; }

  const token = document.getElementById('fbToken').value.trim();
  const pageId = document.getElementById('pageId').value.trim();
  const willBoost = document.getElementById('boostToggle').checked;

  const btn = document.getElementById('postBtn');
  const btnText = document.getElementById('postBtnText');
  btn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span> Nag-po-post...';
  showStatus('⏳ Nag-po-post sa Facebook Page...', 'info');

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: caption, access_token: token })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || 'Hindi ma-post.');

    organicPostId = data.id;
    showStatus('✅ Na-post na organically! Post ID: ' + organicPostId, 'success');

    if (willBoost) {
      await boostPost(organicPostId);
    } else {
      finishSuccess(false);
    }
  } catch(err) {
    showStatus('❌ Error sa pag-post: ' + err.message, 'error');
    btn.disabled = false;
    btnText.textContent = willBoost ? '⚡ I-Post + I-Boost' : '📤 I-Post Organically';
  }
}

async function boostPost(postId) {
  const token = document.getElementById('fbToken').value.trim();
  const adAccountId = document.getElementById('adAccountId').value.trim();

  if (!adAccountId) {
    showStatus('✅ Na-post na! (Walang Ad Account ID kaya hindi na-boost.)', 'success');
    finishSuccess(false); return;
  }

  showStatus('⏳ Nag-se-setup ng paid boost campaign...', 'info');

  const dailyBudget = Math.round((parseFloat(document.getElementById('dailyBudget').value) || 150) * 100); // centavos
  const days = parseInt(document.getElementById('numDays').value) || 7;
  const ageMin = document.getElementById('ageMin').value;
  const ageMax = document.getElementById('ageMax').value;
  const gender = document.getElementById('targetGender').value;
  const objective = document.getElementById('adObjective').value;
  const location = document.getElementById('targetLocation').value || 'Philippines';
  const pageId = document.getElementById('pageId').value.trim();
  const prodName = document.getElementById('prodName').value.trim();

  const endTime = Math.floor(Date.now()/1000) + (days * 86400);

  try {
    // 1. Create Campaign
    showStatus('⏳ Gumagawa ng campaign...', 'info');
    const campRes = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `[Auto] ${prodName} — ${new Date().toLocaleDateString('tl-PH')}`,
        objective: objective,
        status: 'PAUSED',
        special_ad_categories: [],
        access_token: token
      })
    });
    const campData = await campRes.json();
    if (campData.error) throw new Error('Campaign error: ' + campData.error.message);
    const campaignId = campData.id;

    // 2. Create Ad Set
    showStatus('⏳ Gumagawa ng ad set at targeting...', 'info');
    const targeting = {
      age_min: parseInt(ageMin),
      age_max: parseInt(ageMax),
      geo_locations: { countries: ['PH'] },
    };
    if (gender !== '0') targeting.genders = [parseInt(gender)];

    const adSetRes = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `AdSet — ${prodName}`,
        campaign_id: campaignId,
        daily_budget: dailyBudget,
        billing_event: 'IMPRESSIONS',
        optimization_goal: objective === 'OUTCOME_LEADS' ? 'LEAD_GENERATION' : objective === 'OUTCOME_TRAFFIC' ? 'LINK_CLICKS' : 'REACH',
        targeting: targeting,
        end_time: endTime,
        status: 'PAUSED',
        access_token: token
      })
    });
    const adSetData = await adSetRes.json();
    if (adSetData.error) throw new Error('Ad Set error: ' + adSetData.error.message);
    const adSetId = adSetData.id;

    // 3. Create Ad Creative using the organic post
    showStatus('⏳ Gumagawa ng ad creative...', 'info');
    const creativeRes = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/adcreatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Creative — ${prodName}`,
        object_story_id: postId,
        access_token: token
      })
    });
    const creativeData = await creativeRes.json();
    if (creativeData.error) throw new Error('Creative error: ' + creativeData.error.message);
    const creativeId = creativeData.id;

    // 4. Create Ad
    showStatus('⏳ Nag-fi-finalize ng ad...', 'info');
    const adRes = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Ad — ${prodName}`,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: 'PAUSED',
        access_token: token
      })
    });
    const adData = await adRes.json();
    if (adData.error) throw new Error('Ad error: ' + adData.error.message);

    showStatus(`✅ Na-setup na ang boost campaign! Campaign ID: ${campaignId} (PAUSED — i-activate sa Ads Manager)`, 'success');
    finishSuccess(true, campaignId);

  } catch(err) {
    showStatus('⚠️ Na-post organically pero may error sa boost: ' + err.message + '\n\nMaaari mong i-boost manually sa Ads Manager.', 'error');
    finishSuccess(false);
  }
}

function finishSuccess(boosted, campaignId) {
  const postUrl = organicPostId ? `https://www.facebook.com/${organicPostId.replace('_','/')}` : '#';
  document.getElementById('postLink').href = postUrl;

  if (boosted) {
    document.getElementById('successIcon').textContent = '⚡';
    document.getElementById('successTitle').textContent = 'Na-post at Na-boost!';
    document.getElementById('successSub').textContent = `Organic post ✅ + Paid campaign setup ✅ (PAUSED)\nI-activate sa Ads Manager para magsimulang mag-run ang ad.`;
  } else {
    document.getElementById('successIcon').textContent = '🎉';
    document.getElementById('successTitle').textContent = 'Na-post na!';
    document.getElementById('successSub').textContent = 'Matagumpay na nai-post ang iyong ad sa Facebook Page.';
  }
  setTimeout(() => goToStep(5), 1200);
}

function resetAll() {
  variations = []; activeVar = 0; organicPostId = null;
  document.getElementById('prodName').value = '';
  document.getElementById('captionBox').textContent = 'Loading...';
  document.getElementById('captionEdit').value = '';
  document.getElementById('varTabs').innerHTML = '';
  document.getElementById('fbPreview').style.display = 'none';
  document.getElementById('status').style.display = 'none';
  document.getElementById('boostToggle').checked = false;
  document.getElementById('boostFields').style.display = 'none';
  document.getElementById('postBtn').className = 'btn btn-fb';
  document.getElementById('postBtnText').textContent = '📤 I-Post Organically';
  saveToStorage();
  goToStep(2);
}

// ─── LOCAL STORAGE SAVE / LOAD ───────────────────────────────
const SAVE_FIELDS = [
  'fbToken','pageId','adAccountId','anthropicKey',
  'prodName','prodPrice','prodPromo','prodTarget',
  'prodFeatures','prodPain','prodCta','prodTone',
  'dailyBudget','numDays','ageMin','ageMax','targetLocation','targetGender','adObjective'
];

function saveToStorage() {
  const data = {};
  SAVE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  localStorage.setItem('fbAutoPoster', JSON.stringify(data));
  showSavedBadge();
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('fbAutoPoster');
    if (!raw) return;
    const data = JSON.parse(raw);
    SAVE_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined) el.value = data[id];
    });
  } catch(e) {}
}

function showSavedBadge() {
  let badge = document.getElementById('savedBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'savedBadge';
    badge.style.cssText = 'position:fixed;bottom:1.2rem;right:1.2rem;background:#22c55e;color:white;font-size:0.75rem;padding:0.4rem 0.9rem;border-radius:999px;z-index:9999;opacity:0;transition:opacity 0.4s;font-family:"DM Sans",sans-serif;pointer-events:none;';
    badge.textContent = '✅ Na-save ang data';
    document.body.appendChild(badge);
  }
  badge.style.opacity = '1';
  clearTimeout(badge._t);
  badge._t = setTimeout(() => badge.style.opacity = '0', 2000);
}

function clearStorage() {
  if (confirm('Burahin ang lahat ng saved na data?')) {
    localStorage.removeItem('fbAutoPoster');
    SAVE_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }
}

// Auto-save on every input/change
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  SAVE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveToStorage);
      el.addEventListener('change', saveToStorage);
    }
  });
});