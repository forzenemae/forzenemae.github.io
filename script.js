// ========== ДАННЫЕ РОЛЕЙ ==========
const ROLES = {
    mafia: { name: 'Мафия', icon: '🔪', team: 'mafia', teamName: 'Мафия', desc: 'Убивает ночью', color: 'mafia' },
    citizen: { name: 'Мирный житель', icon: '👤', team: 'citizen', teamName: 'Мирные', desc: 'Голосует днём', color: 'citizen' },
    doctor: { name: 'Доктор', icon: '💉', team: 'citizen', teamName: 'Мирные', desc: 'Лечит игроков', color: 'doctor' },
    commissioner: { name: 'Комиссар', icon: '🔍', team: 'citizen', teamName: 'Мирные', desc: 'Проверяет игроков', color: 'commissioner' },
    harlot: { name: 'Путана', icon: '💃', team: 'citizen', teamName: 'Мирные', desc: 'Забирает игрока к себе', color: 'harlot' },
    werewolf: { name: 'Оборотень', icon: '🐺', team: 'werewolf', teamName: 'Оборотень', desc: 'Спит, пока мафия жива', color: 'werewolf' },
    lucky: { name: 'Везунчик', icon: '🍀', team: 'citizen', teamName: 'Мирные', desc: 'Забирает мафию с собой', color: 'lucky' },
    bodyguard: { name: 'Телохранитель', icon: '🛡️', team: 'citizen', teamName: 'Мирные', desc: 'Умирает вместо защищаемого', color: 'bodyguard' },
    maniac: { name: 'Маньяк', icon: '🔫', team: 'maniac', teamName: 'Маньяки', desc: 'Убивает всех', color: 'maniac' }
};

const AVAILABLE_ROLES = ['mafia', 'citizen', 'doctor', 'commissioner', 'harlot', 'werewolf', 'lucky', 'bodyguard', 'maniac'];

// ========== СОСТОЯНИЕ ==========
let game = {
    players: [],
    phase: 'night',
    round: 0,
    journal: [],
    werewolfAwakened: false,
    nightActions: { 
        mafiaKill: null, 
        doctorHeal: null, 
        commissionerCheck: null,
        harlotGuest: null, 
        maniacKill: null, 
        bodyguardProtect: null 
    },
    luckyKillInfo: null
};

// ========== DOM ==========
function $(id) { return document.getElementById(id); }

const el = {
    setup: $('setup-screen'),
    roles: $('roles-screen'),
    game: $('game-screen'),
    rolesConfig: $('roles-config'),
    rolesList: $('roles-list'),
    journalEntries: $('journal-entries'),
    actionsContainer: $('actions-container'),
    aliveCount: $('alive-count'),
    mafiaAlive: $('mafia-alive'),
    werewolfAlive: $('werewolf-alive'),
    phaseTitle: $('phase-title'),
    nightBtn: $('night-btn'),
    dayBtn: $('day-btn'),
    playerCount: $('player-count'),
    playerNames: $('player-names'),
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function shuffle(arr) { 
    for (let i = arr.length-1; i>0; i--) { 
        let j = Math.floor(Math.random()*(i+1)); 
        [arr[i], arr[j]] = [arr[j], arr[i]]; 
    } 
    return arr; 
}

function random(arr) { 
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)]; 
}

function time() { 
    return new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' }); 
}

// ========== ЖУРНАЛ ==========
function addLog(text) {
    console.log('📝 ДОБАВЛЯЮ:', text);
    game.journal.push({ text: text, time: time() });
    renderJournal();
}

function renderJournal() {
    console.log('🔄 РЕНДЕР ЖУРНАЛА, записей:', game.journal.length);
    
    const container = el.journalEntries;
    if (!container) {
        console.error('❌ Контейнер journal-entries не найден!');
        return;
    }
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    
    if (game.journal.length === 0) {
        container.innerHTML = '<div class="journal-empty">📭 Здесь будут записи ходов</div>';
        return;
    }
    
    let html = '';
    for (let i = 0; i < game.journal.length; i++) {
        const entry = game.journal[i];
        html += `<div class="journal-entry">
            <span class="timestamp">${entry.time}</span> 
            ${entry.text}
        </div>`;
    }
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

// ========== ИГРОКИ ==========
function getAlive() { 
    return game.players.filter(p => p.alive === true); 
}

function getByRole(role) { 
    return getAlive().filter(p => p.role === role); 
}

function getByTeam(team) { 
    return getAlive().filter(p => ROLES[p.role].team === team); 
}

// ========== НАСТРОЙКА РОЛЕЙ ==========
function renderRolesConfig() {
    const c = el.rolesConfig;
    c.innerHTML = '';
    AVAILABLE_ROLES.forEach(key => {
        const r = ROLES[key];
        const def = key === 'citizen' ? 3 : (key === 'mafia' ? 2 : 1);
        c.innerHTML += `
            <div class="role-config-item">
                <label><span>${r.icon}</span> ${r.name} <span style="color:#888;font-size:12px;">(${r.teamName})</span></label>
                <input type="number" id="rc-${key}" value="${def}" min="0" max="10">
            </div>
        `;
    });
}

function getConfig() {
    const cfg = {};
    AVAILABLE_ROLES.forEach(key => {
        const input = document.getElementById(`rc-${key}`);
        cfg[key] = parseInt(input.value) || 0;
    });
    return cfg;
}

// ========== РАЗДАЧА РОЛЕЙ ==========
function distributeRoles() {
    const names = el.playerNames.value.split(',').map(s => s.trim()).filter(s => s);
    const cfg = getConfig();
    const total = Object.values(cfg).reduce((a,b) => a+b, 0);
    
    if (names.length < 4) { 
        alert('Минимум 4 игрока!'); 
        return null; 
    }
    if (total !== names.length) { 
        alert(`Ролей (${total}) ≠ игроков (${names.length})!`); 
        return null; 
    }
    if (cfg.mafia >= names.length/2) { 
        alert('Мафии не может быть > половины!'); 
        return null; 
    }
    
    let roles = [];
    Object.keys(cfg).forEach(key => {
        for (let i=0; i<cfg[key]; i++) roles.push(key);
    });
    shuffle(roles);
    
    game.players = names.map((name, i) => ({
        name: name,
        role: roles[i] || 'citizen',
        alive: true,
        index: i,
        isWerewolf: false
    }));
    
    game.journal = [];
    game.round = 0;
    game.werewolfAwakened = false;
    game.luckyKillInfo = null;
    game.nightActions = { 
        mafiaKill: null, 
        doctorHeal: null, 
        commissionerCheck: null,
        harlotGuest: null, 
        maniacKill: null, 
        bodyguardProtect: null 
    };
    
    return game.players;
}

// ========== ПОКАЗ РОЛЕЙ ==========
function renderRolesList() {
    const list = el.rolesList;
    list.innerHTML = '';
    game.players.forEach(p => {
        const r = ROLES[p.role];
        list.innerHTML += `<div class="role-item"><span>${p.name}</span><span class="role-badge ${r.color}">${r.icon} ${r.name}</span></div>`;
    });
}

let modalIndex = 0;

function showRoleModal(i) {
    const p = game.players[i];
    if (!p) return;
    const r = ROLES[p.role];
    document.getElementById('role-player-number').textContent = `${i+1}/${game.players.length}`;
    document.getElementById('role-player-name').textContent = p.name;
    document.getElementById('modal-role-display').innerHTML = `
        <span class="role-icon">${r.icon}</span>
        <div class="role-name">${r.name}</div>
        <div class="role-team">${r.teamName}</div>
    `;
    document.getElementById('role-description').textContent = r.desc;
    document.getElementById('role-modal').classList.add('active');
    modalIndex = i;
}

function nextRole() {
    if (modalIndex + 1 >= game.players.length) {
        document.getElementById('role-modal').classList.remove('active');
        alert('✅ Все роли розданы!');
        return;
    }
    showRoleModal(modalIndex + 1);
}

function prevRole() {
    if (modalIndex <= 0) { 
        alert('Это первый игрок!'); 
        return; 
    }
    showRoleModal(modalIndex - 1);
}

// ========== ПРОВЕРКА ПРОБУЖДЕНИЯ ОБОРОТНЯ ==========
function checkWerewolfAwakening() {
    const mafiaCount = getByTeam('mafia').length;
    const werewolves = getAlive().filter(p => p.role === 'werewolf');
    
    console.log('🐺 Проверка оборотня:');
    console.log('  Мафия жива:', mafiaCount);
    console.log('  Оборотни живы:', werewolves.length);
    console.log('  Уже проснулся:', game.werewolfAwakened);
    
    if (mafiaCount === 0 && werewolves.length > 0 && !game.werewolfAwakened) {
        game.werewolfAwakened = true;
        
        werewolves.forEach(w => {
            w.isWerewolf = true;
        });
        
        ROLES.werewolf.team = 'mafia';
        ROLES.werewolf.teamName = 'Мафия';
        ROLES.werewolf.desc = 'ПРОСНУЛСЯ! Теперь он мафия и убивает каждую ночь';
        
        const names = werewolves.map(w => w.name).join(', ');
        addLog(`🐺 ОБОРОТЕНЬ ПРОСНУЛСЯ! ${names} становится мафией!`);
        addLog(`⚠️ Мафия уничтожена, оборотень занимает её место!`);
        
        console.log(`🐺 Оборотень ${names} проснулся!`);
        
        updateUI();
        renderActions();
        
        return true;
    }
    
    return false;
}

// ========== ИТОГ НОЧИ ==========
function showNightSummary() {
    const mafiaTarget = game.nightActions.mafiaKill;
    const doctorTarget = game.nightActions.doctorHeal;
    const harlotGuest = game.nightActions.harlotGuest;
    const commTarget = game.nightActions.commissionerCheck;
    const bodyguardTarget = game.nightActions.bodyguardProtect;
    
    let summary = [];
    let killed = [];
    let saved = [];
    
    // 1. Комиссар
    if (commTarget !== null) {
        const player = game.players[commTarget];
        if (player && player.alive) {
            const isMafia = player.role === 'mafia' || player.isWerewolf;
            summary.push(`🔍 Комиссар проверил ${player.name}: ${isMafia ? '🔴 ЭТО МАФИЯ!' : '🟢 МИРНЫЙ'}`);
        }
    }
    
    // 2. Доктор
    let healedPlayer = null;
    if (doctorTarget !== null) {
        healedPlayer = game.players[doctorTarget];
        if (healedPlayer && healedPlayer.alive) {
            saved.push(healedPlayer.name);
            summary.push(`💉 Доктор лечил ${healedPlayer.name}`);
        }
    }
    
    // 3. Путана
    let harlotGuestPlayer = null;
    if (harlotGuest !== null) {
        harlotGuestPlayer = game.players[harlotGuest];
        if (harlotGuestPlayer && harlotGuestPlayer.alive) {
            summary.push(`💃 Путана забрала к себе ${harlotGuestPlayer.name}`);
        }
    }
    
    // 4. Телохранитель
    let bodyguard = null;
    let bodyguardProtected = null;
    if (bodyguardTarget !== null) {
        bodyguard = getByRole('bodyguard')[0];
        const allBodyguards = game.players.filter(p => p.role === 'bodyguard');
        const deadBodyguard = allBodyguards.find(p => !p.alive);
        if (deadBodyguard) {
            bodyguardProtected = game.players[bodyguardTarget];
            if (bodyguardProtected) {
                summary.push(`🛡️ Телохранитель ${deadBodyguard.name} погиб, защищая ${bodyguardProtected.name}!`);
                killed.push(deadBodyguard.name);
                saved.push(bodyguardProtected.name);
            }
        } else if (bodyguard) {
            bodyguardProtected = game.players[bodyguardTarget];
            if (bodyguardProtected && bodyguardProtected.alive) {
                summary.push(`🛡️ Телохранитель защищает ${bodyguardProtected.name}`);
            }
        }
    }
    
    // 5. Везунчик
    if (game.luckyKillInfo) {
        const info = game.luckyKillInfo;
        if (!killed.includes(info.victimName)) {
            summary.push(`💀 ${info.victimName} (🍀 Везунчик) убит, но забрал с собой ${info.mafiaName} (🔪 Мафия)!`);
            killed.push(info.victimName);
            killed.push(info.mafiaName);
        }
    } 
    // 6. Обычное убийство
    else if (mafiaTarget !== null) {
        const target = game.players[mafiaTarget];
        if (target && !target.alive && !killed.includes(target.name)) {
            const role = ROLES[target.role];
            summary.push(`💀 ${target.name} (${role.icon} ${role.name}) УБИТ мафией!`);
            killed.push(target.name);
        }
    }
    
    // 7. Мафия спала
    if (mafiaTarget === null) {
        summary.push(`🌙 Мафия спала (никого не выбрала)`);
    }
    
    // 8. Путана умерла с гостем
    const harlot = getByRole('harlot')[0];
    if (harlot && !harlot.alive && harlotGuestPlayer) {
        if (harlotGuestPlayer.alive) {
            summary.push(`💀 ${harlotGuestPlayer.name} умер вместе с Путаной!`);
            killed.push(harlotGuestPlayer.name);
        }
    }
    
    // 9. Пробуждение оборотня
    if (game.werewolfAwakened) {
        const werewolves = game.players.filter(p => p.role === 'werewolf' && p.isWerewolf);
        const names = werewolves.map(w => w.name).join(', ');
        summary.push(`🐺 Оборотень ${names} проснулся и стал мафией!`);
    }
    
    // 10. Вывод
    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    addLog(`📊 ИТОГ НОЧИ ${game.round + 1}:`);
    
    if (summary.length === 0) {
        addLog(`  🌙 Тихая ночь... никто не пострадал`);
    } else {
        summary.forEach(line => addLog(`  ${line}`));
    }
    
    if (killed.length === 0 && saved.length > 0) {
        addLog(`  🎉 НИКТО НЕ УМЕР! Все спасены!`);
    }
    
    if (killed.length > 0) {
        const uniqueKilled = [...new Set(killed)];
        addLog(`  💀 УМЕРЛИ: ${uniqueKilled.join(', ')}`);
    }
    
    if (saved.length > 0) {
        const uniqueSaved = [...new Set(saved)];
        addLog(`  ❤️ СПАСЕНЫ: ${uniqueSaved.join(', ')}`);
    }
    
    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    game.luckyKillInfo = null;
}

// ========== ИГРОВОЙ ПРОЦЕСС ==========
function updateUI() {
    const alive = getAlive();
    const mafia = getByTeam('mafia');
    const werewolf = getAlive().filter(p => p.role === 'werewolf' && !p.isWerewolf);
    
    el.aliveCount.textContent = alive.length;
    el.mafiaAlive.textContent = mafia.length;
    el.werewolfAlive.textContent = game.werewolfAwakened ? '0' : werewolf.length;
}

function renderActions() {
    const container = el.actionsContainer;
    container.innerHTML = '';
    const alive = getAlive();
    
    checkWerewolfAwakening();
    
    if (game.phase === 'night') {
        // ===== МАФИЯ =====
        const mafia = getByTeam('mafia');
        if (mafia.length > 0) {
            const availableTargets = alive.filter(p => !mafia.some(m => m.index === p.index));
            
            const hasAwakenedWerewolf = mafia.some(p => p.role === 'werewolf' && p.isWerewolf);
            const label = hasAwakenedWerewolf ? '🐺 Оборотень (проснулся) выбирает жертву:' : '🔪 Мафия выбирает жертву:';
            
            const div = document.createElement('div');
            div.className = 'action-item';
            div.innerHTML = `
                <span>${label}</span>
                <div class="action-input">
                    <select id="mafia-target">
                        <option value="">Выберите...</option>
                        ${availableTargets.map(p => `<option value="${p.index}">${p.name}</option>`).join('')}
                    </select>
                    <button onclick="mafiaKill()" class="btn primary small">Убить</button>
                </div>
            `;
            container.appendChild(div);
        }
        
        // ===== ОБОРОТЕНЬ (спящий) =====
        const werewolves = getAlive().filter(p => p.role === 'werewolf' && !p.isWerewolf);
        if (werewolves.length > 0 && !game.werewolfAwakened) {
            const div = document.createElement('div');
            div.className = 'action-item';
            div.innerHTML = `
                <span>🐺 Оборотень спит... (ждет гибели мафии)</span>
                <div style="font-size:12px;color:#888;margin-top:4px;">
                    ${werewolves.map(w => w.name).join(', ')} - пока что мирные жители
                </div>
            `;
            container.appendChild(div);
        }
        
        // ===== ДОКТОР =====
        const doctor = getByRole('doctor');
        if (doctor.length > 0) {
            const availableTargets = alive.filter(p => p.index !== doctor[0].index);
            
            const div = document.createElement('div');
            div.className = 'action-item';
            div.innerHTML = `
                <span>💉 Доктор лечит:</span>
                <div class="action-input">
                    <select id="doctor-target">
                        <option value="">Выберите...</option>
                        ${availableTargets.map(p => `<option value="${p.index}">${p.name}</option>`).join('')}
                    </select>
                    <button onclick="doctorHeal()" class="btn secondary small">Лечить</button>
                </div>
            `;
            container.appendChild(div);
        }
        
        // ===== КОМИССАР =====
        const comm = getByRole('commissioner');
        if (comm.length > 0) {
            const availableTargets = alive.filter(p => p.index !== comm[0].index);
            
            const div = document.createElement('div');
            div.className = 'action-item';
            div.innerHTML = `
                <span>🔍 Комиссар проверяет:</span>
                <div class="action-input">
                    <select id="comm-target">
                        <option value="">Выберите...</option>
                        ${availableTargets.map(p => `<option value="${p.index}">${p.name}</option>`).join('')}
                    </select>
                    <button onclick="commCheck()" class="btn secondary small">Проверить</button>
                </div>
            `;
            container.appendChild(div);
        }
        
        // ===== ПУТАНА =====
        const harlot = getByRole('harlot');
        if (harlot.length > 0) {
            const availableTargets = alive.filter(p => p.index !== harlot[0].index);
            
            const div = document.createElement('div');
            div.className = 'action-item';
            div.innerHTML = `
                <span>💃 Путана забирает:</span>
                <div class="action-input">
                    <select id="harlot-target">
                        <option value="">Выберите...</option>
                        ${availableTargets.map(p => `<option value="${p.index}">${p.name}</option>`).join('')}
                    </select>
                    <button onclick="harlotGuest()" class="btn secondary small">Забрать</button>
                </div>
            `;
            container.appendChild(div);
        }
        
        // ===== ТЕЛОХРАНИТЕЛЬ =====
        const bodyguard = getByRole('bodyguard');
        if (bodyguard.length > 0) {
            const availableTargets = alive;
            
            const div = document.createElement('div');
            div.className = 'action-item';
            div.innerHTML = `
                <span>🛡️ Телохранитель защищает:</span>
                <div class="action-input">
                    <select id="bodyguard-target">
                        <option value="">Выберите...</option>
                        ${availableTargets.map(p => `<option value="${p.index}">${p.name}</option>`).join('')}
                    </select>
                    <button onclick="bodyguardProtect()" class="btn secondary small">Защитить</button>
                </div>
            `;
            container.appendChild(div);
        }
        
        // ===== МАНЬЯК =====
        const maniac = getByTeam('maniac');
        if (maniac.length > 0) {
            const availableTargets = alive.filter(p => !maniac.some(m => m.index === p.index));
            
            const div = document.createElement('div');
            div.className = 'action-item';
            div.innerHTML = `
                <span>🔫 Маньяк выбирает жертву:</span>
                <div class="action-input">
                    <select id="maniac-target">
                        <option value="">Выберите...</option>
                        ${availableTargets.map(p => `<option value="${p.index}">${p.name}</option>`).join('')}
                    </select>
                    <button onclick="maniacKill()" class="btn danger small">Убить</button>
                </div>
            `;
            container.appendChild(div);
        }
        
        const btn = document.createElement('button');
        btn.className = 'btn primary';
        btn.textContent = '🌅 Завершить ночь';
        btn.onclick = endNight;
        container.appendChild(btn);
        
    } else {
        const div = document.createElement('div');
        div.className = 'action-item';
        div.innerHTML = `
            <span>🗳️ Казнить игрока:</span>
            <div class="action-input">
                <select id="vote-target">
                    <option value="">Выберите...</option>
                    ${alive.map(p => `<option value="${p.index}">${p.name}</option>`).join('')}
                </select>
                <button onclick="executePlayer()" class="btn danger small">Казнить</button>
            </div>
        `;
        container.appendChild(div);
        
        const btn = document.createElement('button');
        btn.className = 'btn primary';
        btn.textContent = '🌙 Завершить день';
        btn.onclick = endDay;
        container.appendChild(btn);
    }
}

// ========== ДЕЙСТВИЯ ==========

window.mafiaKill = function() {
    const select = document.getElementById('mafia-target');
    const idx = parseInt(select.value);
    if (isNaN(idx) || idx === '') { alert('Выберите жертву!'); return; }
    const target = game.players[idx];
    if (!target || !target.alive) { alert('Игрок уже мёртв!'); return; }
    
    const mafiaPlayers = getByTeam('mafia');
    if (mafiaPlayers.some(m => m.index === idx)) {
        alert('❌ Мафия не может убить себя!');
        return;
    }
    
    game.nightActions.mafiaKill = idx;
    addLog(`🔪 Мафия выбрала жертву: ${target.name}`);
    select.value = '';
    renderActions();
};

window.doctorHeal = function() {
    const select = document.getElementById('doctor-target');
    const idx = parseInt(select.value);
    if (isNaN(idx) || idx === '') { alert('Выберите игрока!'); return; }
    const target = game.players[idx];
    if (!target || !target.alive) { alert('Игрок уже мёртв!'); return; }
    
    const doctor = getByRole('doctor')[0];
    if (doctor && idx === doctor.index) {
        alert('❌ Доктор не может лечить себя!');
        return;
    }
    
    game.nightActions.doctorHeal = idx;
    addLog(`💉 Доктор лечит: ${target.name}`);
    select.value = '';
    renderActions();
};

window.commCheck = function() {
    const select = document.getElementById('comm-target');
    const idx = parseInt(select.value);
    if (isNaN(idx) || idx === '') { alert('Выберите игрока!'); return; }
    const target = game.players[idx];
    if (!target || !target.alive) { alert('Игрок уже мёртв!'); return; }
    
    const comm = getByRole('commissioner')[0];
    if (comm && idx === comm.index) {
        alert('❌ Комиссар не может проверять себя!');
        return;
    }
    
    game.nightActions.commissionerCheck = idx;
    addLog(`🔍 Комиссар проверил ${target.name}`);
    select.value = '';
    renderActions();
};

window.harlotGuest = function() {
    const select = document.getElementById('harlot-target');
    const idx = parseInt(select.value);
    if (isNaN(idx) || idx === '') { alert('Выберите игрока!'); return; }
    const target = game.players[idx];
    if (!target || !target.alive) { alert('Игрок уже мёртв!'); return; }
    
    const harlot = getByRole('harlot')[0];
    if (!harlot) { alert('Путана мертва!'); return; }
    if (idx === harlot.index) {
        alert('❌ Путана не может забрать себя!');
        return;
    }
    
    game.nightActions.harlotGuest = idx;
    addLog(`💃 Путана забрала к себе: ${target.name}`);
    select.value = '';
    renderActions();
};

window.bodyguardProtect = function() {
    const select = document.getElementById('bodyguard-target');
    const idx = parseInt(select.value);
    if (isNaN(idx) || idx === '') { alert('Выберите игрока!'); return; }
    const target = game.players[idx];
    if (!target || !target.alive) { alert('Игрок уже мёртв!'); return; }
    
    game.nightActions.bodyguardProtect = idx;
    addLog(`🛡️ Телохранитель защищает: ${target.name}`);
    select.value = '';
    renderActions();
};

window.maniacKill = function() {
    const select = document.getElementById('maniac-target');
    const idx = parseInt(select.value);
    if (isNaN(idx) || idx === '') { alert('Выберите жертву!'); return; }
    const target = game.players[idx];
    if (!target || !target.alive) { alert('Игрок уже мёртв!'); return; }
    
    const maniac = getByTeam('maniac')[0];
    if (maniac && idx === maniac.index) {
        alert('❌ Маньяк не может убить себя!');
        return;
    }
    
    game.nightActions.maniacKill = idx;
    addLog(`🔫 Маньяк выбрал жертву: ${target.name}`);
    select.value = '';
    renderActions();
};

window.executePlayer = function() {
    const select = document.getElementById('vote-target');
    const idx = parseInt(select.value);
    if (isNaN(idx) || idx === '') { alert('Выберите игрока!'); return; }
    const target = game.players[idx];
    if (!target || !target.alive) { alert('Игрок уже мёртв!'); return; }
    
    target.alive = false;
    const r = ROLES[target.role];
    addLog(`⚡ Казнён ${target.name} (${r.icon} ${r.name})`);
    updateUI();
    renderActions();
    select.value = '';
    checkGameOver();
};

// ========== ЗАВЕРШЕНИЕ НОЧИ ==========
function endNight() {
    console.log('🌙 Завершение ночи...');
    
    const mafiaTarget = game.nightActions.mafiaKill;
    const doctorTarget = game.nightActions.doctorHeal;
    const harlotGuest = game.nightActions.harlotGuest;
    const bodyguardTarget = game.nightActions.bodyguardProtect;
    
    console.log('🔪 Мафия убила индекс:', mafiaTarget);
    console.log('🛡️ Телохранитель защитил индекс:', bodyguardTarget);
    
    let healed = [];
    if (doctorTarget !== null) healed.push(doctorTarget);
    
    let withHarlot = null;
    const harlot = getByRole('harlot')[0];
    if (harlot && harlotGuest !== null) {
        withHarlot = game.players[harlotGuest];
    }
    
    game.luckyKillInfo = null;
    let gameOver = false;
    
    // УБИЙСТВО МАФИЕЙ
    if (mafiaTarget !== null) {
        const target = game.players[mafiaTarget];
        if (target && target.alive) {
            
            // 1. Телохранитель
            if (bodyguardTarget !== null && bodyguardTarget === mafiaTarget) {
                const bodyguard = getByRole('bodyguard')[0];
                if (bodyguard && bodyguard.alive) {
                    bodyguard.alive = false;
                    console.log(`🛡️ Телохранитель ${bodyguard.name} погиб, защищая ${target.name}`);
                    addLog(`🛡️ Телохранитель ${bodyguard.name} погиб, защищая ${target.name}!`);
                    gameOver = checkGameOver();
                } else {
                    target.alive = false;
                    console.log(`💀 ${target.name} убит мафией (телохранитель мёртв)`);
                }
            } 
            // 2. Доктор
            else if (healed.includes(mafiaTarget)) {
                console.log(`💉 Доктор спас ${target.name}`);
                addLog(`💉 Доктор спас ${target.name}!`);
            } 
            // 3. Путана
            else if (withHarlot && withHarlot.index === mafiaTarget) {
                console.log(`💃 Путана спасла ${target.name}`);
                addLog(`💃 Путана спасла ${target.name}!`);
            } 
            // 4. Везунчик
            else if (target.role === 'lucky') {
                const mafia = getByTeam('mafia');
                if (mafia.length > 0) {
                    const randomMafia = random(mafia);
                    if (randomMafia) {
                        randomMafia.alive = false;
                        target.alive = false;
                        game.luckyKillInfo = {
                            victimName: target.name,
                            mafiaName: randomMafia.name
                        };
                        console.log(`🍀 Везунчик ${target.name} забрал мафию ${randomMafia.name}`);
                        gameOver = checkGameOver();
                    }
                } else {
                    target.alive = false;
                    console.log(`🍀 Везунчик ${target.name} убит мафией (мафии нет)`);
                }
            } 
            // 5. Обычное убийство
            else {
                target.alive = false;
                console.log(`💀 ${target.name} убит мафией`);
                gameOver = checkGameOver();
            }
        }
    }
    
    // Путана
    if (harlot && !harlot.alive && withHarlot) {
        if (withHarlot.alive) {
            withHarlot.alive = false;
            console.log(`💀 ${withHarlot.name} умер вместе с Путаной`);
            if (!gameOver) {
                gameOver = checkGameOver();
            }
        }
    }
    
    // Проверяем пробуждение оборотня
    if (!gameOver) {
        const awakened = checkWerewolfAwakening();
        if (awakened) {
            updateUI();
            renderActions();
        }
    }
    
    // Показываем итог ночи
    if (!gameOver) {
        showNightSummary();
    }
    
    // Очищаем действия
    game.nightActions = { 
        mafiaKill: null, 
        doctorHeal: null, 
        commissionerCheck: null,
        harlotGuest: null, 
        maniacKill: null, 
        bodyguardProtect: null 
    };
    
    if (!gameOver) {
        game.phase = 'day';
        game.round++;
        addLog(`🌅 Наступил день ${game.round}`);
        el.nightBtn.classList.remove('active');
        el.dayBtn.classList.add('active');
        el.phaseTitle.textContent = `☀️ День ${game.round}`;
        
        updateUI();
        renderActions();
    }
}

// ========== ЗАВЕРШЕНИЕ ДНЯ ==========
function endDay() {
    game.phase = 'night';
    addLog(`🌙 Наступила ночь ${game.round + 1}`);
    el.dayBtn.classList.remove('active');
    el.nightBtn.classList.add('active');
    el.phaseTitle.textContent = `🌙 Ночь ${game.round + 1}`;
    updateUI();
    renderActions();
}

// ========== ПРОВЕРКА ПОБЕДЫ ==========
function checkGameOver() {
    const alive = getAlive();
    const mafia = getByTeam('mafia');
    const werewolf = getAlive().filter(p => p.role === 'werewolf' && !p.isWerewolf);
    const maniac = getByTeam('maniac');
    
    console.log('🔍 Проверка победы:');
    console.log('  Живых:', alive.length);
    console.log('  Мафия:', mafia.length);
    console.log('  Оборотни:', werewolf.length);
    console.log('  Маньяки:', maniac.length);
    
    if (mafia.length === 0 && werewolf.length === 0 && maniac.length === 0) {
        addLog('🏆 ПОБЕДА МИРНЫХ ЖИТЕЛЕЙ!');
        addLog('🎉 Все злодеи уничтожены!');
        setTimeout(() => alert('🏆 Мирные жители победили! Все злодеи уничтожены!'), 500);
        return true;
    }
    
    if (mafia.length > 0 && mafia.length >= alive.length - mafia.length) {
        addLog('🏆 ПОБЕДА МАФИИ!');
        setTimeout(() => alert('🏆 Мафия победила!'), 500);
        return true;
    }
    
    if (maniac.length > 0 && maniac.length >= alive.length - maniac.length) {
        addLog('🏆 ПОБЕДА МАНЬЯКА!');
        setTimeout(() => alert('🏆 Маньяк победил!'), 500);
        return true;
    }
    
    return false;
}

// ========== ОБРАБОТЧИКИ ==========

renderRolesConfig();

document.getElementById('start-game-btn').addEventListener('click', function() {
    const players = distributeRoles();
    if (!players) return;
    renderRolesList();
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('roles-screen').classList.add('active');
    modalIndex = 0;
});

document.getElementById('show-roles-one-by-one-btn').addEventListener('click', function() {
    if (game.players.length === 0) { alert('Сначала начните игру!'); return; }
    showRoleModal(0);
});

document.getElementById('show-all-roles-btn').addEventListener('click', function() {
    if (game.players.length === 0) { alert('Сначала начните игру!'); return; }
    const list = document.getElementById('roles-list');
    list.scrollIntoView({ behavior: 'smooth' });
    alert('📋 Все роли показаны в списке выше!');
});

document.getElementById('next-role-btn').addEventListener('click', nextRole);
document.getElementById('prev-role-btn').addEventListener('click', prevRole);

document.getElementById('close-modal-btn').addEventListener('click', function() {
    document.getElementById('role-modal').classList.remove('active');
});

document.getElementById('role-modal').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('active');
});

document.getElementById('go-to-game-btn').addEventListener('click', function() {
    if (game.players.length === 0) { alert('Сначала начните игру!'); return; }
    game.phase = 'night';
    game.round = 1;
    game.werewolfAwakened = false;
    game.luckyKillInfo = null;
    game.nightActions = { 
        mafiaKill: null, 
        doctorHeal: null, 
        commissionerCheck: null,
        harlotGuest: null, 
        maniacKill: null, 
        bodyguardProtect: null 
    };
    addLog('🌙 Игра началась! Ночь 1');
    document.getElementById('roles-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    el.phaseTitle.textContent = '🌙 Ночь 1';
    el.nightBtn.classList.add('active');
    el.dayBtn.classList.remove('active');
    updateUI();
    renderActions();
});

el.nightBtn.addEventListener('click', function() {
    if (game.phase === 'day') endDay();
});

el.dayBtn.addEventListener('click', function() {
    if (game.phase === 'night') endNight();
});

document.getElementById('clear-journal-btn').addEventListener('click', function() {
    game.journal = [];
    renderJournal();
});

document.getElementById('reset-game-btn').addEventListener('click', function() {
    if (confirm('Завершить игру?')) {
        game.players = [];
        game.journal = [];
        game.werewolfAwakened = false;
        game.luckyKillInfo = null;
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('setup-screen').classList.add('active');
        renderJournal();
    }
});

el.playerCount.addEventListener('change', function() {
    const count = parseInt(this.value) || 4;
    const names = [];
    for (let i = 1; i <= count; i++) names.push(`Игрок ${i}`);
    el.playerNames.value = names.join(', ');
});

renderJournal();
console.log('🃏 Мафия загружена!');
console.log('📊 Доступно ролей:', AVAILABLE_ROLES.length);
console.log('🐺 Оборотень просыпается после смерти мафии!');
console.log('🛡️ Телохранитель умирает вместо защищаемого!');