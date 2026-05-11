// ==================== 数据模型 ====================

// 默认训练模板
const defaultTemplates = [
    {
        id: 'push',
        name: '推力日',
        exercises: [
            { name: '杠铃平板卧推', sets: 4, restSeconds: 90 },
            { name: '哑铃上斜卧推', sets: 4, restSeconds: 90 },
            { name: '器械下斜卧推', sets: 4, restSeconds: 90 },
            { name: '哑铃平板三头臂屈伸', sets: 4, restSeconds: 60 },
            { name: '哑铃飞鸟', sets: 4, restSeconds: 60 }
        ]
    },
    {
        id: 'pull',
        name: '拉力日',
        exercises: [
            { name: '引体向上', sets: 4, restSeconds: 90 },
            { name: '杠铃划船', sets: 4, restSeconds: 90 },
            { name: '哑铃单臂划船', sets: 4, restSeconds: 90 },
            { name: '高位下拉', sets: 4, restSeconds: 60 },
            { name: '哑铃弯举', sets: 4, restSeconds: 60 }
        ]
    },
    {
        id: 'legs',
        name: '腿部训练日',
        exercises: [
            { name: '杠铃深蹲', sets: 4, restSeconds: 90 },
            { name: '腿举', sets: 4, restSeconds: 90 },
            { name: '哑铃箭步蹲', sets: 4, restSeconds: 90 },
            { name: '腿弯举', sets: 4, restSeconds: 60 },
            { name: '小腿提踵', sets: 4, restSeconds: 60 }
        ]
    }
];

// ==================== 数据存储 ====================

const STORAGE_KEYS = {
    templates: 'gymtimer_templates',
    workouts: 'gymtimer_workouts',
    lastWeights: 'gymtimer_last_weights'
};

function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getTemplates() {
    return loadData(STORAGE_KEYS.templates) || defaultTemplates;
}

function saveTemplates(templates) {
    saveData(STORAGE_KEYS.templates, templates);
}

function getWorkouts() {
    return loadData(STORAGE_KEYS.workouts) || [];
}

function saveWorkouts(workouts) {
    saveData(STORAGE_KEYS.workouts, workouts);
}

function getLastWeight(exerciseName) {
    const weights = loadData(STORAGE_KEYS.lastWeights) || {};
    return weights[exerciseName] || 0;
}

function saveLastWeight(exerciseName, weight) {
    const weights = loadData(STORAGE_KEYS.lastWeights) || {};
    weights[exerciseName] = weight;
    saveData(STORAGE_KEYS.lastWeights, weights);
}

// ==================== 页面管理 ====================

const pages = {
    home: document.getElementById('page-home'),
    workout: document.getElementById('page-workout'),
    rest: document.getElementById('page-rest'),
    nextExercise: document.getElementById('page-next-exercise'),
    finish: document.getElementById('page-finish'),
    history: document.getElementById('page-history'),
    templates: document.getElementById('page-templates'),
    editTemplate: document.getElementById('page-edit-template')
};

function showPage(pageName) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    pages[pageName].classList.add('active');
}

// ==================== 训练状态 ====================

let currentWorkout = {
    templateId: null,
    templateName: '',
    exerciseIndex: 0,
    setIndex: 0,
    exercises: [],
    records: [],
    startTime: null
};

let timerInterval = null;
let restTimeRemaining = 0;

// ==================== 首页 ====================

function renderHome() {
    const templates = getTemplates();
    const listEl = document.getElementById('template-list');

    listEl.innerHTML = templates.map(t => `
        <div class="template-item" data-id="${t.id}">
            <h3>${t.name}</h3>
            <p>${t.exercises.length} 个动作</p>
        </div>
    `).join('');

    // 绑定点击事件
    listEl.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', () => {
            const templateId = item.dataset.id;
            startWorkout(templateId);
        });
    });
}

// 管理模板按钮
document.getElementById('btn-manage-templates').addEventListener('click', () => {
    renderTemplateManagement();
    showPage('templates');
});

// 历史记录按钮
document.getElementById('btn-history').addEventListener('click', () => {
    renderHistory();
    showPage('history');
});

// ==================== 训练流程 ====================

function startWorkout(templateId) {
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) return;

    currentWorkout = {
        templateId: templateId,
        templateName: template.name,
        exerciseIndex: 0,
        setIndex: 0,
        exercises: template.exercises,
        records: template.exercises.map(e => ({
            name: e.name,
            sets: e.sets,
            weights: []
        })),
        startTime: new Date().toISOString()
    };

    showExercise();
    showPage('workout');
}

function showExercise() {
    const exercise = currentWorkout.exercises[currentWorkout.exerciseIndex];
    const record = currentWorkout.records[currentWorkout.exerciseIndex];

    document.getElementById('workout-title').textContent = currentWorkout.templateName;
    document.getElementById('exercise-name').textContent = exercise.name;
    document.getElementById('total-sets').textContent = exercise.sets;
    document.getElementById('current-set').textContent = currentWorkout.setIndex + 1;

    // 显示上次重量
    const lastWeight = getLastWeight(exercise.name);
    document.getElementById('exercise-weight').textContent = lastWeight;
    document.getElementById('input-weight').value = lastWeight || '';

    // 显示默认计时器
    document.getElementById('timer').textContent = formatTime(exercise.restSeconds);
}

// 完成本组按钮
document.getElementById('btn-complete-set').addEventListener('click', () => {
    const exercise = currentWorkout.exercises[currentWorkout.exerciseIndex];
    const record = currentWorkout.records[currentWorkout.exerciseIndex];

    // 记录重量
    const weight = parseFloat(document.getElementById('input-weight').value) || 0;
    record.weights.push(weight);
    saveLastWeight(exercise.name, weight);

    // 更新显示
    currentWorkout.setIndex++;

    if (currentWorkout.setIndex >= exercise.sets) {
        // 本动作完成，检查是否还有下一个动作
        currentWorkout.exerciseIndex++;
        currentWorkout.setIndex = 0;

        if (currentWorkout.exerciseIndex >= currentWorkout.exercises.length) {
            // 所有动作完成
            showPage('finish');
        } else {
            // 显示下一个动作提示
            showNextExercise();
        }
    } else {
        // 开始休息计时
        startRestTimer(exercise.restSeconds);
    }
});

// 返回首页
document.getElementById('btn-back-home').addEventListener('click', () => {
    if (confirm('确定要结束当前训练吗？')) {
        showPage('home');
    }
});

// ==================== 休息计时 ====================

function startRestTimer(seconds) {
    restTimeRemaining = seconds;

    const exercise = currentWorkout.exercises[currentWorkout.exerciseIndex];
    document.getElementById('rest-exercise-name').textContent = exercise.name;
    document.getElementById('rest-next-set').textContent = currentWorkout.setIndex + 1;

    updateRestTimerDisplay();
    showPage('rest');

    timerInterval = setInterval(() => {
        restTimeRemaining--;

        // 提前10秒提醒
        if (restTimeRemaining === 10) {
            playSound('prepare');
        }

        if (restTimeRemaining <= 0) {
            clearInterval(timerInterval);
            playSound('complete');
            showPage('workout');
            document.getElementById('current-set').textContent = currentWorkout.setIndex + 1;
        } else {
            updateRestTimerDisplay();
        }
    }, 1000);
}

function updateRestTimerDisplay() {
    document.getElementById('rest-timer').textContent = formatTime(restTimeRemaining);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 跳过休息
document.getElementById('btn-skip-rest').addEventListener('click', () => {
    clearInterval(timerInterval);
    showPage('workout');
    document.getElementById('current-set').textContent = currentWorkout.setIndex + 1;
});

// ==================== 下一个动作 ====================

function showNextExercise() {
    const nextExercise = currentWorkout.exercises[currentWorkout.exerciseIndex];
    const lastWeight = getLastWeight(nextExercise.name);

    document.getElementById('next-exercise-name').textContent = nextExercise.name;
    document.getElementById('next-exercise-weight').textContent = lastWeight || '无记录';

    showPage('nextExercise');
}

// 开始下一个动作
document.getElementById('btn-start-next').addEventListener('click', () => {
    showExercise();
    showPage('workout');
});

// 结束训练
document.getElementById('btn-end-workout').addEventListener('click', () => {
    showPage('finish');
});

// ==================== 训练结束 ====================

document.getElementById('btn-save-workout').addEventListener('click', () => {
    const note = document.getElementById('workout-note').value;

    const workoutRecord = {
        date: currentWorkout.startTime,
        templateName: currentWorkout.templateName,
        exercises: currentWorkout.records,
        note: note
    };

    const workouts = getWorkouts();
    workouts.unshift(workoutRecord);
    saveWorkouts(workouts);

    document.getElementById('workout-note').value = '';
    showPage('home');
    showToast('训练已保存');
});

// ==================== 历史记录 ====================

function renderHistory() {
    const workouts = getWorkouts();
    const listEl = document.getElementById('history-list');

    if (workouts.length === 0) {
        listEl.innerHTML = '<p style="text-align:center;color:#888;">暂无训练记录</p>';
        return;
    }

    listEl.innerHTML = workouts.map((w, index) => {
        const date = new Date(w.date);
        const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
        const exerciseSummary = w.exercises.map(e => `${e.name}: ${e.weights.join('/')}kg`).join(' | ');

        return `
            <div class="history-item" data-index="${index}">
                <h3>${w.templateName}</h3>
                <p>${dateStr}</p>
                <div class="history-detail">
                    ${w.exercises.map(e => `
                        <p><strong>${e.name}</strong>: ${e.weights.length}组 - ${e.weights.join('/')}kg</p>
                    `).join('')}
                    ${w.note ? `<p style="margin-top:10px;color:#4cc9f0;">笔记: ${w.note}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // 点击展开详情
    listEl.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('expanded');
        });
    });
}

document.getElementById('btn-back-from-history').addEventListener('click', () => {
    showPage('home');
});

// ==================== 模板管理 ====================

function renderTemplateManagement() {
    const templates = getTemplates();
    const listEl = document.getElementById('manage-template-list');

    listEl.innerHTML = templates.map(t => `
        <div class="template-item" data-id="${t.id}">
            <h3>${t.name}</h3>
            <p>${t.exercises.length} 个动作</p>
        </div>
    `).join('');

    // 点击编辑
    listEl.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', () => {
            editTemplate(item.dataset.id);
        });
    });
}

document.getElementById('btn-back-from-templates').addEventListener('click', () => {
    showPage('home');
});

document.getElementById('btn-add-template').addEventListener('click', () => {
    editTemplate(null);
});

// ==================== 编辑模板 ====================

let editingTemplateId = null;

function editTemplate(templateId) {
    editingTemplateId = templateId;
    const templates = getTemplates();
    const template = templateId ? templates.find(t => t.id === templateId) : null;

    document.getElementById('edit-template-name').value = template ? template.name : '';

    renderExercisesEditor(template ? template.exercises : []);

    showPage('editTemplate');
}

function renderExercisesEditor(exercises) {
    const listEl = document.getElementById('exercises-list');

    listEl.innerHTML = exercises.map((e, index) => `
        <div class="exercise-item" data-index="${index}">
            <div class="row">
                <input type="text" class="exercise-name" value="${e.name}" placeholder="动作名称">
                <input type="number" class="small-input exercise-sets" value="${e.sets}" placeholder="组数">
                <input type="number" class="small-input exercise-rest" value="${e.restSeconds}" placeholder="休息秒数">
                <button class="btn-remove-exercise">删除</button>
            </div>
        </div>
    `).join('');

    // 绑定删除按钮
    listEl.querySelectorAll('.btn-remove-exercise').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.exercise-item').remove();
        });
    });
}

// 添加动作
document.getElementById('btn-add-exercise').addEventListener('click', () => {
    const listEl = document.getElementById('exercises-list');
    const index = listEl.children.length;

    const newItem = document.createElement('div');
    newItem.className = 'exercise-item';
    newItem.dataset.index = index;
    newItem.innerHTML = `
        <div class="row">
            <input type="text" class="exercise-name" placeholder="动作名称">
            <input type="number" class="small-input exercise-sets" value="4" placeholder="组数">
            <input type="number" class="small-input exercise-rest" value="90" placeholder="休息秒数">
            <button class="btn-remove-exercise">删除</button>
        </div>
    `;

    newItem.querySelector('.btn-remove-exercise').addEventListener('click', () => {
        newItem.remove();
    });

    listEl.appendChild(newItem);
});

// 保存模板
document.getElementById('btn-save-template').addEventListener('click', () => {
    const name = document.getElementById('edit-template-name').value.trim();
    if (!name) {
        showToast('请输入模板名称');
        return;
    }

    const exerciseItems = document.querySelectorAll('#exercises-list .exercise-item');
    const exercises = [];

    exerciseItems.forEach(item => {
        const exName = item.querySelector('.exercise-name').value.trim();
        const sets = parseInt(item.querySelector('.exercise-sets').value) || 4;
        const rest = parseInt(item.querySelector('.exercise-rest').value) || 90;

        if (exName) {
            exercises.push({ name: exName, sets, restSeconds: rest });
        }
    });

    if (exercises.length === 0) {
        showToast('请至少添加一个动作');
        return;
    }

    const templates = getTemplates();

    if (editingTemplateId) {
        // 更新现有模板
        const index = templates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templates[index] = { ...templates[index], name, exercises };
        }
    } else {
        // 新建模板
        const newTemplate = {
            id: 'custom_' + Date.now(),
            name,
            exercises
        };
        templates.push(newTemplate);
    }

    saveTemplates(templates);
    showToast('模板已保存');
    showPage('templates');
    renderTemplateManagement();
});

// 删除模板
document.getElementById('btn-delete-template').addEventListener('click', () => {
    if (!editingTemplateId) return;

    if (!confirm('确定要删除这个模板吗？')) return;

    const templates = getTemplates();
    const index = templates.findIndex(t => t.id === editingTemplateId);

    if (index !== -1) {
        templates.splice(index, 1);
        saveTemplates(templates);
        showToast('模板已删除');
        showPage('templates');
        renderTemplateManagement();
    }
});

document.getElementById('btn-back-from-edit').addEventListener('click', () => {
    showPage('templates');
});

// ==================== 音效 ====================

function playSound(type) {
    // 使用 Web Audio API 生成简单提示音
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'prepare') {
        // 准备提醒：短促的两声
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);

        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 880;
            osc2.type = 'sine';
            gain2.gain.value = 0.3;
            osc2.start();
            osc2.stop(audioContext.currentTime + 0.1);
        }, 150);
    } else if (type === 'complete') {
        // 完成提醒：长响
        oscillator.frequency.value = 660;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    }
}

// ==================== 工具函数 ====================

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// ==================== 初始化 ====================

function init() {
    // 初始化模板数据（如果不存在）
    if (!loadData(STORAGE_KEYS.templates)) {
        saveTemplates(defaultTemplates);
    }

    renderHome();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
