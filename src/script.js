// focus xp - script.js

// --------------------------------------------------
// TRAY CLOCK
// --------------------------------------------------

function tickClock() {
    var d = new Date();
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    document.getElementById('tray-time').textContent = h + ':' + m;
}
tickClock();
setInterval(tickClock, 15000);


// --------------------------------------------------
// VIEW SWITCHER  (File / Tools / Help)
// --------------------------------------------------

var currentView = 'file';

function switchView(name) {
    // hide all panels
    document.getElementById('viewFile').classList.add('hidden');
    document.getElementById('viewTools').classList.add('hidden');
    document.getElementById('viewHelp').classList.add('hidden');

    // show the one we want
    document.getElementById('view' + name.charAt(0).toUpperCase() + name.slice(1)).classList.remove('hidden');
    currentView = name;

    // highlight the right menu item
    document.querySelectorAll('.menu-item').forEach(function(el) {
        el.classList.remove('active-menu-item');
    });

    closeDrop();

    if (name === 'file')  document.getElementById('menuFile').classList.add('active-menu-item');
    if (name === 'tools') document.getElementById('menuTools').classList.add('active-menu-item');
    if (name === 'help')  document.getElementById('menuHelp').classList.add('active-menu-item');
}


// --------------------------------------------------
// DROPDOWN MENUS (Edit, etc.)
// --------------------------------------------------

function toggleDropdown(id, e) {
    e.stopPropagation();
    var d = document.getElementById(id);
    var wasOpen = d.classList.contains('open');
    closeDrop();
    if (!wasOpen) {
        d.classList.add('open');
        document.getElementById('menuEdit').classList.add('open');
    }
}

function closeDrop() {
    document.querySelectorAll('.dropdown').forEach(function(d) {
        d.classList.remove('open');
    });
    document.querySelectorAll('.menu-item').forEach(function(m) {
        m.classList.remove('open');
    });
}

// click anywhere to close dropdowns
document.addEventListener('click', function() {
    closeDrop();
});


// --------------------------------------------------
// TIMER STATE
// --------------------------------------------------

// load saved custom durations, or fall back to defaults
var customFocusMins = parseInt(localStorage.getItem('ff_focus_mins') || '25', 10);
var customShortMins = parseInt(localStorage.getItem('ff_short_mins') || '5', 10);
var customLongMins  = parseInt(localStorage.getItem('ff_long_mins')  || '15', 10);

var mode      = 'FOCUS';
var totalSecs = customFocusMins * 60;
var timeLeft  = totalSecs;
var ticker    = null;
var running   = false;

var elTimer   = document.getElementById('timer');
var elStart   = document.getElementById('startBtn');
var elPause   = document.getElementById('pauseBtn');
var elReset   = document.getElementById('resetBtn');
var elProg    = document.getElementById('progFill');
var elProgPct = document.getElementById('progPct');
var elSvgProg = document.getElementById('svgProg');
var elLabel   = document.getElementById('timerModeLabel');
var elBadge   = document.getElementById('sessionBadge');
var elClockLbl = document.getElementById('timerClockLabel');
var elSubLbl   = document.getElementById('clockSublabel');
var elDurHint  = document.getElementById('tabDurHint');
var elDeco     = document.getElementById('asciiDeco');
var elFocusTab = document.getElementById('tabFocus');
var elShortTab = document.getElementById('tabShort');
var elLongTab  = document.getElementById('tabLong');

// update the focus tab label to match saved setting
elFocusTab.textContent = 'Focus (' + customFocusMins + 'm)';
elShortTab.textContent = 'Short Break (' + customShortMins + 'm)';
elLongTab.textContent  = 'Long Break (' + customLongMins + 'm)';
elDurHint.textContent  = customFocusMins + 'm';

// ring circumference for r=95
var CIRC = 2 * Math.PI * 95;   // ~597


// --------------------------------------------------
// MODE SWITCH
// --------------------------------------------------

var decos = {
    'FOCUS':       [
        '+------[ FOCUS MODE ]----------+',
        '|         Lock in.             |',
        '+------------------------------+'
    ],
    'SHORT BREAK': [
        '+------[ SHORT BREAK ]----------+',
        '|   Stretch. Drink some water.  |',
        '+--------------------------------+'
    ],
    'LONG BREAK':  [
        '+------[ LONG BREAK ]-----------+',
        '| Go outside. Touch some grass. |',
        '+--------------------------------+'
    ]
};

var subLabels = {
    'FOCUS':       'stay locked in',
    'SHORT BREAK': 'breathe. recharge.',
    'LONG BREAK':  'go outside a bit'
};

function setMode(mins, label, tabEl) {
    if (running) return;

    // deselect all tabs
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    tabEl.classList.add('active');

    // figure out how many minutes to use
    var m;
    if (label === 'FOCUS')       m = customFocusMins;
    else if (label === 'SHORT BREAK') m = mins !== null ? mins : customShortMins;
    else                               m = mins !== null ? mins : customLongMins;

    // if called from tabs that use custom durations
    if (label === 'SHORT BREAK') m = customShortMins;
    if (label === 'LONG BREAK')  m = customLongMins;

    mode      = label;
    totalSecs = m * 60;
    timeLeft  = totalSecs;

    elLabel.textContent    = '-- ' + label + ' --';
    elClockLbl.textContent = '[ ' + label.toLowerCase() + ' ]';
    elSubLbl.textContent   = subLabels[label] || '';
    elDurHint.textContent  = m + 'm';
    elDeco.textContent     = decos[label] ? decos[label].join('\n') : '';

    refreshDisplay();
}


// --------------------------------------------------
// DISPLAY UPDATE
// --------------------------------------------------

function refreshDisplay() {
    var mins = Math.floor(timeLeft / 60);
    var secs = (timeLeft % 60).toString().padStart(2, '0');
    elTimer.textContent = mins + ':' + secs;

    var pct = totalSecs > 0 ? (totalSecs - timeLeft) / totalSecs : 0;

    // svg ring drains as time passes
    elSvgProg.style.strokeDasharray  = CIRC;
    elSvgProg.style.strokeDashoffset = CIRC * pct;

    // xp progress bar
    var pctInt = Math.round(pct * 100);
    elProg.style.width    = pctInt + '%';
    elProgPct.textContent = pctInt + '%';
}


// --------------------------------------------------
// START
// --------------------------------------------------

function startTimer() {
    if (running) return;
    running = true;
    elStart.textContent = '[ > ] Running...';
    elStart.disabled    = true;

    ticker = setInterval(function() {
        if (timeLeft <= 0) {
            onDone();
            return;
        }
        timeLeft--;
        refreshDisplay();
    }, 1000);
}


// --------------------------------------------------
// PAUSE
// --------------------------------------------------

function pauseTimer() {
    if (!running) return;
    clearInterval(ticker);
    running = false;
    elStart.textContent = '[ > ] Start';
    elStart.disabled    = false;
}


// --------------------------------------------------
// RESET
// --------------------------------------------------

function resetTimer() {
    clearInterval(ticker);
    running  = false;
    timeLeft = totalSecs;
    elStart.textContent = '[ > ] Start';
    elStart.disabled    = false;
    refreshDisplay();
}


// --------------------------------------------------
// SESSION DONE
// --------------------------------------------------

var sessions    = parseInt(localStorage.getItem('ff_sessions') || '0', 10);
var focusMinsTotal = parseFloat(localStorage.getItem('ff_focus_mins_total') || '0');

var elSessionCount = document.getElementById('sessionCount');
var elHoursCount   = document.getElementById('hoursCount');

elSessionCount.textContent = sessions;
elHoursCount.textContent   = (focusMinsTotal / 60).toFixed(1);
elBadge.textContent        = 'session #' + (sessions + 1);

function onDone() {
    clearInterval(ticker);
    running = false;
    elStart.disabled = false;

    if (mode === 'FOCUS') {
        sessions++;
        focusMinsTotal += customFocusMins;
        localStorage.setItem('ff_sessions', sessions);
        localStorage.setItem('ff_focus_mins_total', focusMinsTotal);
        elSessionCount.textContent = sessions;
        elHoursCount.textContent   = (focusMinsTotal / 60).toFixed(1);
        elBadge.textContent        = 'session #' + (sessions + 1);
        bumpChart();
    }

    elTimer.textContent = 'DONE!';
    openDialog();

    setTimeout(resetTimer, 3500);
}


// --------------------------------------------------
// BUTTONS
// --------------------------------------------------

elStart.addEventListener('click', startTimer);
elPause.addEventListener('click', pauseTimer);
elReset.addEventListener('click', resetTimer);


// --------------------------------------------------
// KEYBOARD SHORTCUTS
// --------------------------------------------------

document.addEventListener('keydown', function(e) {
    // ignore if typing in an input
    if (e.target.tagName === 'INPUT') return;

    if (e.code === 'Space') {
        e.preventDefault();
        running ? pauseTimer() : startTimer();
    }
    if (e.key === 'r' || e.key === 'R') {
        resetTimer();
    }
    if (e.key === 'Escape') {
        closeDialog();
    }
});


// --------------------------------------------------
// DIALOG POPUP
// --------------------------------------------------

var overlay = document.getElementById('dialogOverlay');

var completeMsgs = [
    'Not bad. Drink some water.',
    'Session done. How many more you got?',
    'You actually did it. Respect.',
    'One more in the books.',
    'You survived. Good.'
];

function openDialog() {
    var idx = Math.floor(Math.random() * completeMsgs.length);
    document.getElementById('dialogMsg').textContent = completeMsgs[idx];
    document.getElementById('dialogSub').textContent =
        mode === 'FOCUS'
            ? sessions + ' sessions total -- ' + (focusMinsTotal / 60).toFixed(1) + ' hrs focused'
            : '';
    overlay.classList.add('open');

    // try a browser notification too
    if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
            new Notification('Focus XP', { body: completeMsgs[idx] });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
}

function closeDialog() {
    overlay.classList.remove('open');
}


// --------------------------------------------------
// TASKS
// --------------------------------------------------

var taskInput  = document.getElementById('taskInput');
var addTaskBtn = document.getElementById('addTaskBtn');
var taskList   = document.getElementById('taskList');

var tasks = [];
try {
    tasks = JSON.parse(localStorage.getItem('ff_tasks') || '[]');
} catch(e) {
    tasks = [];
}

function saveTasks() {
    localStorage.setItem('ff_tasks', JSON.stringify(tasks));
}

function renderTasks() {
    taskList.innerHTML = '';

    for (var i = 0; i < tasks.length; i++) {
        (function(idx) {
            var t = tasks[idx];

            var li   = document.createElement('li');
            li.className = 'task';

            var left = document.createElement('div');
            left.className = 'task-left';

            var cb = document.createElement('input');
            cb.type    = 'checkbox';
            cb.checked = t.done;
            cb.addEventListener('change', function() {
                tasks[idx].done = cb.checked;
                saveTasks();
                renderTasks();
            });

            var sp = document.createElement('span');
            sp.textContent = t.text;
            if (t.done) sp.classList.add('done');

            var del = document.createElement('button');
            del.textContent = 'x';
            del.className   = 'del-btn';
            del.addEventListener('click', function() {
                tasks.splice(idx, 1);
                saveTasks();
                renderTasks();
            });

            left.appendChild(cb);
            left.appendChild(sp);
            li.appendChild(left);
            li.appendChild(del);
            taskList.appendChild(li);
        })(i);
    }
}

function addTask() {
    var text = taskInput.value.trim();
    if (!text) return;
    tasks.unshift({ text: text, done: false });
    saveTasks();
    renderTasks();
    taskInput.value = '';
}

function focusTaskInput() {
    // called from Edit > Add New Task
    switchView('file');
    setTimeout(function() { taskInput.focus(); }, 80);
}

function clearDoneTasks() {
    tasks = tasks.filter(function(t) { return !t.done; });
    saveTasks();
    renderTasks();
}

function clearAllTasks() {
    if (!confirm('Clear all tasks? This cannot be undone.')) return;
    tasks = [];
    saveTasks();
    renderTasks();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addTask();
});


// --------------------------------------------------
// WEEKLY CHART
// --------------------------------------------------

var weekData = [0,0,0,0,0,0,0];
try {
    weekData = JSON.parse(localStorage.getItem('ff_week') || '[0,0,0,0,0,0,0]');
} catch(e) {
    weekData = [0,0,0,0,0,0,0];
}

var chartEl = document.getElementById('studyChart');
var chart = new Chart(chartEl, {
    type: 'bar',
    data: {
        labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        datasets: [{
            data: weekData,
            backgroundColor: '#316ac5',
            borderColor: '#0a246a',
            borderWidth: 1,
            borderRadius: 0,
            hoverBackgroundColor: '#5a8de0'
        }]
    },
    options: {
        animation: false,
        plugins: { legend: { display: false } },
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#555',
                    font: { family: 'Courier New, monospace', size: 9 },
                    stepSize: 1
                },
                grid: { color: '#d4d0c8' }
            },
            x: {
                ticks: {
                    color: '#555',
                    font: { family: 'Courier New, monospace', size: 9 }
                },
                grid: { display: false }
            }
        }
    }
});

function bumpChart() {
    var day = new Date().getDay();
    var idx = (day === 0) ? 6 : day - 1;
    weekData[idx]++;
    localStorage.setItem('ff_week', JSON.stringify(weekData));
    chart.data.datasets[0].data = weekData.slice();
    chart.update();
}


// --------------------------------------------------
// SPOTIFY EMBED
// --------------------------------------------------

function loadSpotify() {
    var raw = document.getElementById('spotifyUrl').value.trim();
    if (!raw) return;

    var match = raw.match(/spotify\.com\/(track|playlist|album|episode)\/([a-zA-Z0-9]+)/);
    if (!match) {
        alert('Paste a Spotify URL.\nexample: https://open.spotify.com/playlist/...');
        return;
    }

    var type = match[1];
    var id   = match[2];
    var src  = 'https://open.spotify.com/embed/' + type + '/' + id + '?utm_source=generator&theme=0';

    document.getElementById('spotifyArea').innerHTML =
        '<iframe src="' + src + '" width="100%" height="80" frameborder="0"' +
        ' allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"' +
        ' loading="lazy"></iframe>';
}


// --------------------------------------------------
// TOOLS: save / apply custom durations
// --------------------------------------------------

// pre-fill the tools inputs with saved values
document.getElementById('toolFocusMins').value = customFocusMins;
document.getElementById('toolShortMins').value = customShortMins;
document.getElementById('toolLongMins').value  = customLongMins;

function setPreset(inputId, val) {
    document.getElementById(inputId).value = val;
}

function applyToolSettings() {
    var f = parseInt(document.getElementById('toolFocusMins').value, 10);
    var s = parseInt(document.getElementById('toolShortMins').value, 10);
    var l = parseInt(document.getElementById('toolLongMins').value, 10);

    if (!f || f < 1 || f > 120) { alert('Focus: enter 1-120 minutes.'); return; }
    if (!s || s < 1 || s > 60)  { alert('Short break: enter 1-60 minutes.'); return; }
    if (!l || l < 1 || l > 120) { alert('Long break: enter 1-120 minutes.'); return; }

    customFocusMins = f;
    customShortMins = s;
    customLongMins  = l;

    localStorage.setItem('ff_focus_mins', f);
    localStorage.setItem('ff_short_mins', s);
    localStorage.setItem('ff_long_mins',  l);

    // update tab labels
    elFocusTab.textContent = 'Focus (' + f + 'm)';
    elShortTab.textContent = 'Short Break (' + s + 'm)';
    elLongTab.textContent  = 'Long Break (' + l + 'm)';

    // if not running, apply to current timer based on mode
    if (!running) {
        if (mode === 'FOCUS') {
            totalSecs = f * 60;
            timeLeft  = totalSecs;
            elDurHint.textContent = f + 'm';
        } else if (mode === 'SHORT BREAK') {
            totalSecs = s * 60;
            timeLeft  = totalSecs;
            elDurHint.textContent = s + 'm';
        } else {
            totalSecs = l * 60;
            timeLeft  = totalSecs;
            elDurHint.textContent = l + 'm';
        }
        refreshDisplay();
    }

    var status = document.getElementById('toolsStatus');
    status.textContent = '> saved. focus=' + f + 'm  short=' + s + 'm  long=' + l + 'm';
    setTimeout(function() { status.textContent = ''; }, 3000);
}

function resetToolDefaults() {
    document.getElementById('toolFocusMins').value = 25;
    document.getElementById('toolShortMins').value = 5;
    document.getElementById('toolLongMins').value  = 15;
}


// --------------------------------------------------
// INIT
// --------------------------------------------------

// set up initial state on load
renderTasks();
refreshDisplay();

// set focus tab label on load
elFocusTab.textContent = 'Focus (' + customFocusMins + 'm)';
elShortTab.textContent = 'Short Break (' + customShortMins + 'm)';
elLongTab.textContent  = 'Long Break (' + customLongMins + 'm)';