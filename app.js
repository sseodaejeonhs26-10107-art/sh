// 서버와 라이브러리 없이 동작하는 개인용 감정 기록장입니다.
const weathers = [
  { id: 'sun', icon: '☀️', name: '맑음', emotion: '기쁨·행복' },
  { id: 'cloud', icon: '☁️', name: '구름', emotion: '평온·잔잔함' },
  { id: 'rain', icon: '🌧️', name: '비', emotion: '슬픔·우울' },
  { id: 'lightning', icon: '⚡', name: '번개', emotion: '화남·짜증' },
  { id: 'snow', icon: '❄️', name: '눈', emotion: '차분함·고요' },
  { id: 'storm', icon: '🌪️', name: '태풍', emotion: '휘몰아치는 감정' },
  { id: 'fog', icon: '🌫️', name: '안개', emotion: '복잡함·헷갈림' },
  { id: 'rainbow', icon: '🌈', name: '무지개', emotion: '설렘·기대' }
];
const $ = (id) => document.getElementById(id);
const storageKey = 'emotion-weather-v1';
const pad = (value) => String(value).padStart(2, '0');
const localTime = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const validTime = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
let data = { records: [], mappings: {} };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved) {
    if (!Array.isArray(saved.records) || !saved.mappings || typeof saved.mappings !== 'object' || saved.records.some(r => !r || typeof r.id !== 'string' || !validTime(r.time) || !weathers.some(w => w.id === r.weather) || typeof r.name !== 'string' || typeof r.memo !== 'string')) throw new Error('Invalid data');
    data = saved;
  }
} catch {
  $('storage-warning').hidden = false;
  $('storage-warning').textContent = '저장된 기록을 불러오지 못했어요. 브라우저의 저장 공간 설정을 확인해주세요.';
}
let selectedWeather = 'sun', editingId = null, selectedDate = localTime().slice(0, 10);
let month = new Date(`${selectedDate}T12:00`);
month.setDate(1);

// 입력한 이름과 메모는 HTML 대신 텍스트로 표시합니다.
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function persist(next) {
  try { localStorage.setItem(storageKey, JSON.stringify(next)); data = next; return true; }
  catch { $('status').textContent = '저장하지 못했어요. 브라우저 저장 공간이나 설정을 확인해주세요.'; return false; }
}
function renderWeathers() {
  $('weather-options').replaceChildren(...weathers.map(w => {
    const button = element('button', undefined, 'weather');
    button.type = 'button'; button.dataset.weather = w.id;
    button.setAttribute('aria-pressed', String(w.id === selectedWeather));
    button.append(element('span', w.icon, 'weather-icon'), element('strong', w.name), element('span', data.mappings[w.id] || w.emotion, 'hint'));
    button.onclick = () => { selectedWeather = w.id; renderWeathers(); renderActivities(); };
    return button;
  }));
}
const activityMessages = {
  '🎵 음악 듣기': '좋아하는 노래 한 곡을 틀고 잠깐 쉬어보세요.',
  '🌿 가볍게 산책': '밖으로 나가 천천히 주변을 둘러보세요.',
  '🫖 따뜻한 차': '따뜻한 한 잔과 함께 나만의 시간을 가져보세요.',
  '🌬️ 천천히 호흡': '편안하게 앉아 천천히 숨을 들이쉬고 내쉬어보세요.'
};
function renderActivities() {
  $('activities').hidden = !['rain', 'lightning', 'storm'].includes(selectedWeather);
  $('activity-result').textContent = '';
  $('activity-options').replaceChildren(...Object.entries(activityMessages).map(([name, message]) => {
    const button = element('button', name); button.type = 'button'; button.setAttribute('aria-pressed', 'false');
    button.onclick = () => {
      for (const option of $('activity-options').children) option.setAttribute('aria-pressed', String(option === button));
      $('activity-result').textContent = message;
    };
    return button;
  }));
}
function resetForm() {
  editingId = null; selectedWeather = 'sun'; $('record-form').reset(); $('record-time').value = localTime();
  $('form-title').textContent = '지금의 마음 기록하기'; $('save-button').textContent = '마음 기록하기'; $('cancel-edit').hidden = true;
  renderWeathers(); renderActivities();
}
$('record-form').onsubmit = (event) => {
  event.preventDefault();
  const time = $('record-time').value;
  if (!validTime(time)) { $('status').textContent = '올바른 날짜와 시간을 입력해주세요.'; return; }
  const record = {
    id: editingId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    time, weather: selectedWeather,
    name: $('record-name').value.trim() || weathers.find(w => w.id === selectedWeather).name,
    memo: $('record-memo').value
  };
  const records = editingId ? data.records.map(r => r.id === editingId ? record : r) : [...data.records, record];
  if (!persist({ ...data, records })) return;
  const wasEditing = Boolean(editingId), savedWeather = selectedWeather;
  selectedDate = time.slice(0, 10); month = new Date(`${selectedDate}T12:00`); month.setDate(1);
  resetForm(); selectedWeather = savedWeather; renderWeathers(); renderActivities(); renderCalendar(); renderRecords(); renderSummary();
  $('status').textContent = wasEditing ? '기록을 수정했어요.' : '지금의 마음을 저장했어요.';
};
$('cancel-edit').onclick = () => { resetForm(); $('status').textContent = '수정을 취소했어요.'; };

function renderCalendar() {
  const year = month.getFullYear(), m = month.getMonth();
  $('month-label').textContent = `${year}년 ${m + 1}월`;
  const cells = Array.from({ length: new Date(year, m, 1).getDay() }, () => element('div'));
  for (let day = 1; day <= new Date(year, m + 1, 0).getDate(); day++) {
    const date = `${year}-${pad(m + 1)}-${pad(day)}`;
    const records = data.records.filter(r => r.time.startsWith(date)).sort((a, b) => a.time.localeCompare(b.time));
    const button = element('button', undefined, `day${date === localTime().slice(0, 10) ? ' today' : ''}`);
    button.type = 'button'; button.dataset.date = date;
    button.setAttribute('aria-pressed', String(date === selectedDate));
    button.setAttribute('aria-label', `${m + 1}월 ${day}일, 기록 ${records.length}개`);
    const icons = element('span', records.map(r => weathers.find(w => w.id === r.weather).icon).join(''), 'day-icons');
    icons.style.fontSize = `${records.length > 5 ? .65 : records.length > 2 ? .8 : 1.1}rem`;
    button.append(element('span', day), icons);
    button.onclick = () => { selectedDate = date; renderCalendar(); renderRecords(); };
    cells.push(button);
  }
  $('calendar').replaceChildren(...cells);
}
function renderRecords() {
  $('day-title').textContent = `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8))}일의 마음`;
  const records = data.records.filter(r => r.time.startsWith(selectedDate)).sort((a, b) => a.time.localeCompare(b.time));
  $('day-count').textContent = `${records.length}개의 기록`;
  $('records').replaceChildren(...records.map(r => {
    const weather = weathers.find(w => w.id === r.weather);
    const row = element('article', undefined, 'record'), body = element('div', undefined, 'record-body');
    body.append(element('strong', r.name, 'record-title'), element('span', `${r.time.slice(11)} · ${weather.name}`, 'hint'), element('p', r.memo || '말없이 남긴 마음이에요.', 'record-memo'));
    const actions = element('div', undefined, 'record-actions'), edit = element('button', '수정'), remove = element('button', '삭제');
    edit.type = remove.type = 'button';
    edit.setAttribute('aria-label', `${r.name} 기록 수정`); remove.setAttribute('aria-label', `${r.name} 기록 삭제`);
    edit.onclick = () => {
      editingId = r.id; selectedWeather = r.weather; $('record-time').value = r.time; $('record-name').value = r.name; $('record-memo').value = r.memo;
      $('form-title').textContent = '남겨둔 마음 수정하기'; $('save-button').textContent = '수정 저장'; $('cancel-edit').hidden = false; $('status').textContent = '';
      renderWeathers(); renderActivities(); $('form-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('record-name').focus({ preventScroll: true });
    };
    remove.onclick = () => {
      if (!confirm('이 감정 기록을 삭제할까요?')) return;
      if (!persist({ ...data, records: data.records.filter(item => item.id !== r.id) })) return;
      if (editingId === r.id) resetForm();
      renderCalendar(); renderRecords(); renderSummary(); $('status').textContent = '기록을 삭제했어요.';
    };
    actions.append(edit, remove); row.append(element('span', weather.icon, 'weather-icon'), body, actions); return row;
  }));
  if (!records.length) $('records').append(element('p', '아직 남긴 마음이 없어요. 첫 번째 날씨를 기록해보세요.', 'empty'));
}
function renderSummary() {
  const prefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
  const records = data.records.filter(r => r.time.startsWith(prefix));
  const summary = $('monthly-summary'); summary.replaceChildren();
  $('summary-title').textContent = `${month.getMonth() + 1}월의 마음 모아보기`;
  if (!records.length) { summary.append(element('p', '기록이 쌓이면 이달의 날씨를 함께 돌아볼 수 있어요.', 'hint')); return; }
  const counts = weathers.map(w => ({ ...w, count: records.filter(r => r.weather === w.id).length }));
  const max = Math.max(...counts.map(w => w.count)), leaders = counts.filter(w => w.count === max);
  const stats = element('div', undefined, 'summary-top');
  for (const [label, value] of [['남긴 기록', `${records.length}개`], ['기록한 날', `${new Set(records.map(r => r.time.slice(0, 10))).size}일`]]) {
    const stat = element('div', undefined, 'stat'); stat.append(element('span', label, 'hint'), element('strong', value)); stats.append(stat);
  }
  summary.append(stats, element('p', `가장 자주 남긴 날씨: ${leaders.map(w => `${w.icon} ${w.name}`).join(', ')} · 각각 ${Math.round(max / records.length * 100)}%`, 'summary-line'), element('p', `☀️ 기쁜 마음 ${counts[0].count}회 · ⚡ 짜증난 마음 ${counts[3].count}회`, 'hint'), element('p', `“${records.length}번의 기록, 내 마음에 귀 기울인 ${new Set(records.map(r => r.time.slice(0, 10))).size}일.”`, 'hint'));
}
function moveMonth(offset) {
  month.setMonth(month.getMonth() + offset); selectedDate = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-01`;
  renderCalendar(); renderRecords(); renderSummary();
}
$('prev-month').onclick = () => moveMonth(-1);
$('next-month').onclick = () => moveMonth(1);
$('today').onclick = () => { selectedDate = localTime().slice(0, 10); month = new Date(`${selectedDate}T12:00`); month.setDate(1); renderCalendar(); renderRecords(); renderSummary(); };
for (const w of weathers) {
  const wrapper = element('div'), label = element('label', `${w.icon} ${w.name}`), input = element('input');
  input.id = `mapping-${w.id}`; input.value = data.mappings[w.id] || w.emotion; label.htmlFor = input.id;
  wrapper.append(label, input); $('mapping-fields').append(wrapper);
}
$('mapping-form').onsubmit = (event) => {
  event.preventDefault(); const mappings = Object.fromEntries(weathers.map(w => [w.id, $(`mapping-${w.id}`).value.trim() || w.emotion]));
  if (persist({ ...data, mappings })) { renderWeathers(); $('status').textContent = '나만의 감정 연결을 저장했어요.'; }
};
resetForm(); renderCalendar(); renderRecords(); renderSummary();
