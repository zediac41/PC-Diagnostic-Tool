const state = {
  symptoms: [],
  rules: [],
  knownProducts: { motherboards: [] },
};

const els = {
  diagnosticForm: document.getElementById('diagnosticForm'),
  symptomChecklist: document.getElementById('symptomChecklist'),
  suggestBtn: document.getElementById('suggestBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  suggestionsEmpty: document.getElementById('suggestionsEmpty'),
  suggestionsResults: document.getElementById('suggestionsResults'),
  primaryCause: document.getElementById('primaryCause'),
  supportingSignal: document.getElementById('supportingSignal'),
  likelyCausesList: document.getElementById('likelyCausesList'),
  nextStepsList: document.getElementById('nextStepsList'),
  matchedRulesList: document.getElementById('matchedRulesList'),
  motherboardSelect: document.getElementById('motherboardSelect'),
  motherboardCustom: document.getElementById('motherboardCustom'),
  cpuTier: document.getElementById('cpuTier'),
  cooler: document.getElementById('cooler'),
  ramEachStickGb: document.getElementById('ramEachStickGb'),
  ramModules: document.getElementById('ramModules'),
  gpuInstalled: document.getElementById('gpuInstalled'),
  gpuTier: document.getElementById('gpuTier'),
  riserCable: document.getElementById('riserCable'),
  storage: document.getElementById('storage'),
  boardLogMotherboard: document.getElementById('boardLogMotherboard'),
  boardLogMotherboardCustom: document.getElementById('boardLogMotherboardCustom'),
  boardLogIssue: document.getElementById('boardLogIssue'),
  boardLogFix: document.getElementById('boardLogFix'),
  boardLogStatus: document.getElementById('boardLogStatus'),
  copyBoardLogBtn: document.getElementById('copyBoardLogBtn'),
  clearBoardLogBtn: document.getElementById('clearBoardLogBtn'),
};

function loadJson(path) {
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  });
}

function populateKnownProductSelect(selectEl, groups, placeholderText) {
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = placeholderText;
  selectEl.appendChild(placeholder);

  groups.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.group;
    (group.items || []).forEach((item) => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      optgroup.appendChild(option);
    });
    selectEl.appendChild(optgroup);
  });

  const customOption = document.createElement('option');
  customOption.value = '__custom__';
  customOption.textContent = 'Custom / Not Listed';
  selectEl.appendChild(customOption);
}

function toggleCustomField(selectEl, inputEl) {
  const isCustom = selectEl.value === '__custom__';
  inputEl.classList.toggle('hidden', !isCustom);
  inputEl.disabled = !isCustom;
  inputEl.required = isCustom;
  if (!isCustom) inputEl.value = '';
}

function getSelectedOrCustom(selectEl, inputEl) {
  if (selectEl.value === '__custom__') return inputEl.value.trim();
  return selectEl.value.trim();
}

function setSelectOrCustom(selectEl, inputEl, value) {
  const normalizedValue = (value || '').trim();
  const hasOption = [...selectEl.options].some((option) => option.value === normalizedValue);
  if (normalizedValue && hasOption) {
    selectEl.value = normalizedValue;
    inputEl.value = '';
  } else if (normalizedValue) {
    selectEl.value = '__custom__';
    inputEl.value = normalizedValue;
  } else {
    selectEl.value = '';
    inputEl.value = '';
  }
  toggleCustomField(selectEl, inputEl);
}

function createChecklistItems(container, items, name) {
  container.innerHTML = '';
  items.forEach((item) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'check-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = item;
    const span = document.createElement('span');
    span.textContent = item;
    wrapper.append(input, span);
    container.appendChild(wrapper);
  });
}

function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function clearChecks() {
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
}

function setDefaults() {
  els.diagnosticForm.reset();
  clearChecks();
  setSelectOrCustom(els.motherboardSelect, els.motherboardCustom, '');
  els.cpuTier.value = '';
  els.cooler.value = '';
  els.ramEachStickGb.value = '';
  els.ramModules.value = '';
  els.gpuInstalled.value = '';
  els.gpuTier.value = '';
  els.riserCable.value = '';
  els.storage.value = '';
  syncGpuFields();
  renderSuggestions();
}

function syncGpuFields() {
  const gpuInstalled = els.gpuInstalled.value === 'true';
  els.gpuTier.disabled = !gpuInstalled;
  els.riserCable.disabled = !gpuInstalled;
  if (!gpuInstalled) {
    els.gpuTier.value = '';
    els.riserCable.value = '';
  }
}

function loadSample() {
  setSelectOrCustom(els.motherboardSelect, els.motherboardCustom, 'MAG B650 TOMAHAWK WIFI');
  els.cpuTier.value = 'High';
  els.cooler.value = '360mm AIO';
  els.ramEachStickGb.value = '16';
  els.ramModules.value = '2';
  els.gpuInstalled.value = 'true';
  syncGpuFields();
  els.gpuTier.value = 'High';
  els.riserCable.value = 'true';
  els.storage.value = 'Gen 4';

  clearChecks();
  document.querySelectorAll('input[name="symptoms"]').forEach((input) => {
    if (['Freeze', 'No display', 'Game crash'].includes(input.value)) input.checked = true;
  });

  renderSuggestions();
}

function buildDiagnosticObject() {
  return {
    system: {
      motherboard: getSelectedOrCustom(els.motherboardSelect, els.motherboardCustom),
      cpu_tier: els.cpuTier.value,
      cooler: els.cooler.value,
      ram_each_stick_gb: Number(els.ramEachStickGb.value || 0),
      ram_modules: Number(els.ramModules.value || 0),
      gpu_installed: els.gpuInstalled.value === 'true',
      gpu_tier: els.gpuTier.value,
      riser_cable: els.riserCable.value === 'true',
      storage: els.storage.value,
    },
    symptoms: getCheckedValues('symptoms'),
  };
}

function caseMatchesRule(data, rule) {
  const conditions = rule.conditions || {};
  const symptoms = data.symptoms || [];
  const system = data.system || {};

  if (conditions.symptoms && !conditions.symptoms.every((symptom) => symptoms.includes(symptom))) return false;
  if (conditions.gpu_installed !== undefined && system.gpu_installed !== conditions.gpu_installed) return false;
  if (conditions.riser_cable !== undefined && system.riser_cable !== conditions.riser_cable) return false;
  if (conditions.cpu_tier && system.cpu_tier !== conditions.cpu_tier) return false;
  if (conditions.cpu_tier_in && !conditions.cpu_tier_in.includes(system.cpu_tier)) return false;
  if (conditions.gpu_tier && system.gpu_tier !== conditions.gpu_tier) return false;
  if (conditions.gpu_tier_in && !conditions.gpu_tier_in.includes(system.gpu_tier)) return false;
  if (conditions.cooler && system.cooler !== conditions.cooler) return false;
  if (conditions.cooler_in && !conditions.cooler_in.includes(system.cooler)) return false;
  if (conditions.storage && system.storage !== conditions.storage) return false;
  if (conditions.storage_in && !conditions.storage_in.includes(system.storage)) return false;
  if (conditions.ram_modules !== undefined && system.ram_modules !== conditions.ram_modules) return false;
  if (conditions.ram_each_stick_gb_gte !== undefined && system.ram_each_stick_gb < conditions.ram_each_stick_gb_gte) return false;
  if (conditions.motherboard_includes) {
    const board = (system.motherboard || '').toLowerCase();
    if (!conditions.motherboard_includes.some((item) => board.includes(String(item).toLowerCase()))) return false;
  }

  return true;
}

function humanizeRuleId(ruleId) {
  return ruleId.replace(/^rule_/, '').replace(/_/g, ' ');
}

function getSupportingSignal(data, topRule) {
  if (!topRule) return 'Select symptoms and hardware details to narrow the diagnosis.';
  const system = data.system || {};
  const conditions = topRule.conditions || {};

  if (conditions.riser_cable && system.riser_cable) {
    return 'A riser cable is selected and that strongly matches the top issue path.';
  }
  if (conditions.ram_modules === 4 && system.ram_modules === 4) {
    return 'This build uses 4 RAM sticks, which pushes memory sensitivity higher.';
  }
  if (conditions.storage === 'Gen 5' && system.storage === 'Gen 5') {
    return 'Gen 5 storage is selected, so storage-path issues rank higher here.';
  }
  if (conditions.cpu_tier === 'High' && system.cpu_tier === 'High') {
    return 'The high CPU tier increases the weight of cooling and board stress paths.';
  }
  if (conditions.gpu_tier === 'High' && system.gpu_tier === 'High') {
    return 'The high GPU tier increases the weight of GPU and riser-related paths.';
  }
  return `The selected symptoms most closely match ${humanizeRuleId(topRule.id)}.`;
}

function getSuggestions(data) {
  const matches = state.rules
    .filter((rule) => caseMatchesRule(data, rule))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const causeScores = new Map();
  const stepScores = new Map();

  matches.forEach((rule) => {
    const priority = rule.priority || 0;
    (rule.likely_causes || []).forEach((cause, index) => {
      const weight = Math.max(priority - index * 5, 1);
      causeScores.set(cause, (causeScores.get(cause) || 0) + weight);
    });
    (rule.suggestions || []).forEach((step, index) => {
      const weight = Math.max(priority - index * 3, 1);
      stepScores.set(step, (stepScores.get(step) || 0) + weight);
    });
  });

  return {
    matches,
    primaryCause: [...causeScores.entries()].sort((a, b) => b[1] - a[1]).map(([cause]) => cause)[0] || '',
    otherCauses: [...causeScores.entries()].sort((a, b) => b[1] - a[1]).map(([cause]) => cause).slice(1, 5),
    firstTests: [...stepScores.entries()].sort((a, b) => b[1] - a[1]).map(([step]) => step).slice(0, 4),
    nextSteps: [...stepScores.entries()].sort((a, b) => b[1] - a[1]).map(([step]) => step).slice(4, 8),
    supportingSignal: getSupportingSignal(data, matches[0] || null),
  };
}

function fillList(listEl, items, fallbackText) {
  listEl.innerHTML = '';
  const values = items.length ? items : [fallbackText];
  values.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    listEl.appendChild(li);
  });
}

function renderSuggestions() {
  const data = buildDiagnosticObject();
  const hasSymptoms = data.symptoms.length > 0;
  const result = getSuggestions(data);

  if (!hasSymptoms || !result.matches.length) {
    els.suggestionsEmpty.classList.remove('hidden');
    els.suggestionsResults.classList.add('hidden');
    return;
  }

  els.suggestionsEmpty.classList.add('hidden');
  els.suggestionsResults.classList.remove('hidden');
  els.primaryCause.textContent = result.primaryCause || 'No primary cause yet';
  els.supportingSignal.textContent = result.supportingSignal;
  fillList(els.likelyCausesList, result.otherCauses, 'No additional likely causes yet.');
  fillList(els.nextStepsList, result.firstTests, 'No first tests yet.');
  fillList(els.matchedRulesList, result.nextSteps, 'No additional next steps yet.');
}

function buildBoardLogNote() {
  const motherboard = getSelectedOrCustom(els.boardLogMotherboard, els.boardLogMotherboardCustom) || 'Unknown motherboard';
  const issue = els.boardLogIssue.value.trim() || 'No issue entered';
  const fix = els.boardLogFix.value.trim() || 'No fix entered';
  return `Motherboard: ${motherboard}\nIssue: ${issue}\nFix: ${fix}`;
}

async function copyBoardLogNote() {
  const note = buildBoardLogNote();
  try {
    await navigator.clipboard.writeText(note);
    els.boardLogStatus.textContent = 'Copied to clipboard. Paste this into your notes or repo later.';
  } catch (_error) {
    els.boardLogStatus.textContent = 'Copy failed in this browser. You can still manually copy the text from the fields.';
  }
}

function clearBoardLog() {
  els.boardLogMotherboard.value = '';
  els.boardLogIssue.value = '';
  els.boardLogFix.value = '';
  toggleCustomField(els.boardLogMotherboard, els.boardLogMotherboardCustom);
  els.boardLogStatus.textContent = 'Nothing copied yet.';
}

async function init() {
  const symptomConfig = await loadJson('./data/symptoms.json');
  state.symptoms = symptomConfig.symptoms || [];
  state.rules = await loadJson('./data/rules.json');
  state.knownProducts = await loadJson('./data/known-products.json');

  populateKnownProductSelect(els.motherboardSelect, state.knownProducts.motherboards || [], 'Select motherboard');
  populateKnownProductSelect(els.boardLogMotherboard, state.knownProducts.motherboards || [], 'Select motherboard');
  createChecklistItems(els.symptomChecklist, state.symptoms, 'symptoms');

  setDefaults();
  clearBoardLog();
  renderSuggestions();

  els.suggestBtn.addEventListener('click', (event) => { event.preventDefault(); renderSuggestions(); });
  els.loadSampleBtn.addEventListener('click', (event) => { event.preventDefault(); loadSample(); });
  els.resetBtn.addEventListener('click', (event) => { event.preventDefault(); setDefaults(); });
  els.copyBoardLogBtn.addEventListener('click', copyBoardLogNote);
  els.clearBoardLogBtn.addEventListener('click', clearBoardLog);
  els.motherboardSelect.addEventListener('change', () => toggleCustomField(els.motherboardSelect, els.motherboardCustom));
  els.boardLogMotherboard.addEventListener('change', () => toggleCustomField(els.boardLogMotherboard, els.boardLogMotherboardCustom));
  els.gpuInstalled.addEventListener('change', () => {
    syncGpuFields();
    renderSuggestions();
  });
  els.diagnosticForm.addEventListener('input', renderSuggestions);
  els.diagnosticForm.addEventListener('change', renderSuggestions);
}

init().catch((error) => {
  console.error(error);
  els.suggestionsEmpty.textContent = 'Failed to load app data. Check the browser console for details.';
});
