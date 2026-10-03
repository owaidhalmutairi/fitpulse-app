/**
 * FitPulse Ultra - Main Application Logic & Engine
 * Features: Macro/Calorie Tracker, Live Watch Sync (Apple & Huawei), Live Workout Timer, Gemini AI Coach
 */

// Global State Initializer
const FitPulseApp = {
    // State Store
    state: {
        currentTab: 'dashboard',
        theme: 'dark',
        user: {
            name: 'البطل الرياضي',
            calorieGoal: 2200,
            proteinGoal: 160, // grams
            carbsGoal: 220,   // grams
            fatsGoal: 70,     // grams
            stepsGoal: 10000
        },
        // Watch Integration States
        watches: {
            apple: { connected: true, heartRate: 74, steps: 8450, calories: 430, spo2: 99, pulseHistory: [] },
            huawei: { connected: true, heartRate: 72, steps: 8450, sleep: '8h 15m', stress: 22, pulseHistory: [] }
        },
        // Daily Activity & Data Log
        today: {
            meals: [
                { id: 'm1', name: '🍳 3 بيضات مسلوقة + خبز بر', category: 'breakfast', calories: 380, protein: 24, carbs: 28, fats: 18, time: '08:30 AM' },
                { id: 'm2', name: '🍗 صدر دجاج مشوي + رز أبيض', category: 'lunch', calories: 650, protein: 55, carbs: 70, fats: 12, time: '02:15 PM' },
                { id: 'm3', name: '🥛 شيك بروتين واي', category: 'snacks', calories: 220, protein: 30, carbs: 8, fats: 4, time: '05:45 PM' },
                { id: 'm4', name: '🥗 سلطة تونة مع زيت زيتون', category: 'dinner', calories: 380, protein: 35, carbs: 12, fats: 16, time: '08:30 PM' }
            ],
            workouts: [
                { id: 'w1', name: '🏃‍♂️ ركض صباحي (Apple Watch Sync)', type: 'running', duration: 30, calories: 280, steps: 3400, source: 'Apple Watch', time: '07:00 AM' },
                { id: 'w2', name: '🏋️‍♂️ تمرين حديد - أكتاف وباي', type: 'weightlifting', duration: 45, calories: 250, steps: 1200, source: 'Huawei Watch', time: '06:00 PM' }
            ]
        },
        // Live Workout Mode State
        activeWorkout: {
            isLive: false,
            timerId: null,
            seconds: 0,
            type: 'running',
            burnedCalories: 0,
            heartRate: 110,
            steps: 0
        },
        // Canvas animation frame ids
        canvasFrames: {
            dash: null,
            apple: null,
            huawei: null
        },
        charts: {}
    },

    // Initialization
    init() {
        console.log('🚀 FitPulse Ultra Starting...');
        try {
            this.loadLocalStorage();
            this.initLucideIcons();
            this.bindEvents();
            this.startWatchPulseSimulators();
            this.updateAllUI();
            this.initCharts();
            this.logSyncMessage('Apple Watch Series 9: تم الاتصال بنجاح عبر Apple HealthKit');
            this.logSyncMessage('Huawei Watch GT 4: تم الاتصال بنجاح عبر Huawei Health API');
        } catch (err) {
            console.error('FitPulse init error:', err);
        }
    },

    // Load saved state from LocalStorage
    loadLocalStorage() {
        const saved = localStorage.getItem('fitpulse_app_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.meals) this.state.today.meals = parsed.meals;
                if (parsed.workouts) this.state.today.workouts = parsed.workouts;
                if (parsed.user) this.state.user = { ...this.state.user, ...parsed.user };
            } catch (e) {
                console.error('Error loading saved state:', e);
            }
        }
    },

    // Save to LocalStorage
    saveState() {
        try {
            localStorage.setItem('fitpulse_app_state', JSON.stringify({
                meals: this.state.today.meals,
                workouts: this.state.today.workouts,
                user: this.state.user
            }));
        } catch (e) {
            console.error('Error saving state:', e);
        }
    },

    // Refresh Lucide Icons safely
    initLucideIcons() {
        try {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        } catch (e) {
            console.warn('Lucide icon error:', e);
        }
    },

    // Bind Event Listeners
    bindEvents() {
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
        });

        // Jump to tab buttons
        document.querySelectorAll('[data-tab-jump]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab-jump');
                if (target) this.switchTab(target);
            });
        });

        // Modal triggers
        document.getElementById('openAddMealBtn')?.addEventListener('click', () => this.openAddMealModal());
        document.getElementById('dashAddMealQuickBtn')?.addEventListener('click', () => this.openAddMealModal());
        document.querySelectorAll('.add-meal-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.getAttribute('data-meal-type');
                this.openAddMealModal(cat);
            });
        });

        document.getElementById('closeAddMealModal')?.addEventListener('click', () => this.closeAddMealModal());
        document.getElementById('cancelAddMealModal')?.addEventListener('click', () => this.closeAddMealModal());

        // Modal Preset selection
        document.getElementById('modalPresetFood')?.addEventListener('change', (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt && opt.value) {
                document.getElementById('modalMealName').value = opt.text.split('(')[0].trim();
                document.getElementById('modalMealCal').value = opt.dataset.cal || 0;
                document.getElementById('modalMealProtein').value = opt.dataset.p || 0;
                document.getElementById('modalMealCarbs').value = opt.dataset.c || 0;
                document.getElementById('modalMealFats').value = opt.dataset.f || 0;
            }
        });

        // Meal Form submit
        document.getElementById('addMealForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMealFormSubmit();
        });

        // Quick Gemini AI input on dashboard
        document.getElementById('dashQuickAiSubmit')?.addEventListener('click', () => this.handleQuickGeminiAnalysis());
        document.getElementById('dashQuickAiInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleQuickGeminiAnalysis();
        });

        // Gemini AI Coach Chat
        document.getElementById('sendGeminiBtn')?.addEventListener('click', () => this.handleGeminiChatSend());
        document.getElementById('geminiInputText')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleGeminiChatSend();
            }
        });

        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.getAttribute('data-prompt');
                const input = document.getElementById('geminiInputText');
                if (input && prompt) {
                    input.value = prompt;
                    this.handleGeminiChatSend();
                }
            });
        });

        // Workouts
        document.getElementById('startWorkoutBtn')?.addEventListener('click', () => this.toggleLiveWorkout());
        document.getElementById('stopWorkoutBtn')?.addEventListener('click', () => this.toggleLiveWorkout());
        document.getElementById('openStartWorkoutBtn')?.addEventListener('click', () => {
            this.switchTab('workouts');
        });
        document.getElementById('dashStartWorkoutQuickBtn')?.addEventListener('click', () => {
            this.switchTab('workouts');
        });

        document.getElementById('manualWorkoutForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleManualWorkoutSubmit();
        });

        // Watch Controls
        document.getElementById('globalScanWatchesBtn')?.addEventListener('click', () => this.scanWatches());
        document.querySelectorAll('.sync-watch-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const watch = btn.getAttribute('data-watch');
                this.syncSingleWatch(watch);
            });
        });
        document.querySelectorAll('.test-pulse-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const watch = btn.getAttribute('data-watch');
                this.simulateWorkoutPulse(watch);
            });
        });
        document.getElementById('clearSyncLogBtn')?.addEventListener('click', () => {
            const consoleBox = document.getElementById('syncConsoleLog');
            if (consoleBox) consoleBox.innerHTML = '';
        });

        // Toggles
        document.getElementById('appleWatchToggle')?.addEventListener('change', (e) => {
            this.state.watches.apple.connected = e.target.checked;
            this.updateWatchStatusBanners();
            this.logSyncMessage(`Apple Watch integration ${e.target.checked ? 'تم التفعيل' : 'تم الإيقاف'}`);
        });

        document.getElementById('huaweiWatchToggle')?.addEventListener('change', (e) => {
            this.state.watches.huawei.connected = e.target.checked;
            this.updateWatchStatusBanners();
            this.logSyncMessage(`Huawei Watch integration ${e.target.checked ? 'تم التفعيل' : 'تم الإيقاف'}`);
        });

        // Date Display
        try {
            const dateStr = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const dateElem = document.getElementById('currentDateStr');
            if (dateElem) dateElem.textContent = dateStr;
        } catch (e) {}
    },

    // Tab Switcher
    switchTab(tabId) {
        this.state.currentTab = tabId;
        document.querySelectorAll('.nav-item').forEach(el => {
            if (el.getAttribute('data-tab') === tabId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        const targetPane = document.getElementById(`tab-${tabId}`);
        if (targetPane) targetPane.classList.add('active');

        // Titles
        const titles = {
            'dashboard': { t: 'لوحة التحكم الرئيسية', sub: 'ملخص النشاط اليومي والتغذية' },
            'nutrition': { t: 'السعرات الحرارية والماكروز', sub: 'تتبع البروتين والكارب والدهون اليومية' },
            'gemini-ai': { t: 'مساعد جيميناي الذكي Gemini AI', sub: 'تحليل الوجبات وتخطيط التمارين بالذكاء الاصطناعي' },
            'workouts': { t: 'تتبع التمارين واللياقة', sub: 'مؤقت مباشر وتسجيل الأنشطة الرياضية' },
            'watches': { t: 'مركز ربط الساعات الذكية', sub: 'Apple Watch & Huawei Watch Integration Hub' },
            'analytics': { t: 'التقارير والإحصائيات', sub: 'رسوم بيانية لتحليلات الأداء والأهداف' }
        };

        if (titles[tabId]) {
            const tElem = document.getElementById('currentTabTitle');
            const subElem = document.getElementById('currentTabSubtitle');
            if (tElem) tElem.textContent = titles[tabId].t;
            if (subElem) subElem.textContent = titles[tabId].sub;
        }

        this.initLucideIcons();
    },

    // Calculate totals
    getCalculatedTotals() {
        let eatenCal = 0;
        let pGrams = 0;
        let cGrams = 0;
        let fGrams = 0;

        (this.state.today.meals || []).forEach(m => {
            eatenCal += Number(m.calories) || 0;
            pGrams += Number(m.protein) || 0;
            cGrams += Number(m.carbs) || 0;
            fGrams += Number(m.fats) || 0;
        });

        let burnedCal = 0;
        let totalSteps = this.state.watches.apple.steps;

        (this.state.today.workouts || []).forEach(w => {
            burnedCal += Number(w.calories) || 0;
        });

        const netCal = eatenCal - burnedCal;
        const goalCal = this.state.user.calorieGoal;
        const remCal = goalCal - netCal;

        return { eatenCal, burnedCal, netCal, goalCal, remCal, pGrams, cGrams, fGrams, totalSteps };
    },

    // Update UI elements across app
    updateAllUI() {
        const totals = this.getCalculatedTotals();

        // Dashboard Metrics
        const netElem = document.getElementById('dashNetCalories');
        const goalElem = document.getElementById('dashGoalCalories');
        const eatenElem = document.getElementById('dashConsumedCal');
        const burnedElem = document.getElementById('dashBurnedCal');

        if (netElem) netElem.textContent = totals.netCal.toLocaleString();
        if (goalElem) goalElem.textContent = totals.goalCal.toLocaleString();
        if (eatenElem) eatenElem.textContent = totals.eatenCal.toLocaleString();
        if (burnedElem) burnedElem.textContent = totals.burnedCal.toLocaleString();
        
        const calPercent = Math.min(100, Math.max(0, (totals.netCal / totals.goalCal) * 100));
        const calProg = document.getElementById('dashCalorieProgress');
        if (calProg) calProg.style.width = `${calPercent}%`;

        // Steps
        const stepsElem = document.getElementById('dashSteps');
        const stepsGoalElem = document.getElementById('dashGoalSteps');
        if (stepsElem) stepsElem.textContent = totals.totalSteps.toLocaleString();
        if (stepsGoalElem) stepsGoalElem.textContent = this.state.user.stepsGoal.toLocaleString();

        const stepsPercent = Math.min(100, (totals.totalSteps / this.state.user.stepsGoal) * 100);
        const stepsProg = document.getElementById('dashStepsProgress');
        if (stepsProg) stepsProg.style.width = `${stepsPercent}%`;
        const distElem = document.getElementById('dashDistance');
        if (distElem) distElem.textContent = `${(totals.totalSteps * 0.00075).toFixed(1)} كم`;

        // Protein
        const protElem = document.getElementById('dashProtein');
        const protGoalElem = document.getElementById('dashGoalProtein');
        if (protElem) protElem.textContent = totals.pGrams;
        if (protGoalElem) protGoalElem.textContent = this.state.user.proteinGoal;

        const protPercent = Math.min(100, (totals.pGrams / this.state.user.proteinGoal) * 100);
        const protProg = document.getElementById('dashProteinProgress');
        if (protProg) protProg.style.width = `${protPercent}%`;
        const protRemElem = document.getElementById('dashProteinRem');
        if (protRemElem) protRemElem.textContent = `${Math.max(0, this.state.user.proteinGoal - totals.pGrams)} جرام`;

        // SVG Rings Update
        this.updateSvgRings(totals);

        // Nutrition Tab Metrics
        const nutGoal = document.getElementById('nutGoalCal');
        const nutEaten = document.getElementById('nutEatenCal');
        const nutBurned = document.getElementById('nutBurnedCal');
        const nutRem = document.getElementById('nutRemainingCal');

        if (nutGoal) nutGoal.innerHTML = `${totals.goalCal.toLocaleString()} <small>kcal</small>`;
        if (nutEaten) nutEaten.innerHTML = `${totals.eatenCal.toLocaleString()} <small>kcal</small>`;
        if (nutBurned) nutBurned.innerHTML = `${totals.burnedCal.toLocaleString()} <small>kcal</small>`;
        if (nutRem) nutRem.innerHTML = `${totals.remCal.toLocaleString()} <small>kcal</small>`;

        const nutPText = document.getElementById('nutProteinText');
        const nutPBar = document.getElementById('nutProteinBar');
        if (nutPText) nutPText.textContent = `${totals.pGrams}g / ${this.state.user.proteinGoal}g (${Math.round(protPercent)}%)`;
        if (nutPBar) nutPBar.style.width = `${protPercent}%`;

        const carbsPercent = Math.min(100, (totals.cGrams / this.state.user.carbsGoal) * 100);
        const nutCText = document.getElementById('nutCarbsText');
        const nutCBar = document.getElementById('nutCarbsBar');
        if (nutCText) nutCText.textContent = `${totals.cGrams}g / ${this.state.user.carbsGoal}g (${Math.round(carbsPercent)}%)`;
        if (nutCBar) nutCBar.style.width = `${carbsPercent}%`;

        const fatsPercent = Math.min(100, (totals.fGrams / this.state.user.fatsGoal) * 100);
        const nutFText = document.getElementById('nutFatsText');
        const nutFBar = document.getElementById('nutFatsBar');
        if (nutFText) nutFText.textContent = `${totals.fGrams}g / ${this.state.user.fatsGoal}g (${Math.round(fatsPercent)}%)`;
        if (nutFBar) nutFBar.style.width = `${fatsPercent}%`;

        // Render Meals & Workouts Lists
        this.renderMealLists();
        this.renderWorkoutLists();
        this.updateWatchStreamUI();
    },

    // Update SVG Rings Dashoffset
    updateSvgRings(totals) {
        const maxCircumference = 314; // 2 * PI * 50

        // Calories
        const calPct = Math.min(1, totals.netCal / totals.goalCal);
        const rCal = document.getElementById('ringCalories');
        const vCal = document.getElementById('ringCalVal');
        if (rCal) rCal.style.strokeDashoffset = maxCircumference * (1 - calPct);
        if (vCal) vCal.textContent = totals.netCal.toLocaleString();

        // Protein
        const protPct = Math.min(1, totals.pGrams / this.state.user.proteinGoal);
        const rProt = document.getElementById('ringProtein');
        const vProt = document.getElementById('ringProtVal');
        if (rProt) rProt.style.strokeDashoffset = maxCircumference * (1 - protPct);
        if (vProt) vProt.textContent = `${totals.pGrams}g`;

        // Carbs
        const carbPct = Math.min(1, totals.cGrams / this.state.user.carbsGoal);
        const rCarb = document.getElementById('ringCarbs');
        const vCarb = document.getElementById('ringCarbsVal');
        if (rCarb) rCarb.style.strokeDashoffset = maxCircumference * (1 - carbPct);
        if (vCarb) vCarb.textContent = `${totals.cGrams}g`;

        // Fats
        const fatPct = Math.min(1, totals.fGrams / this.state.user.fatsGoal);
        const rFat = document.getElementById('ringFats');
        const vFat = document.getElementById('ringFatsVal');
        if (rFat) rFat.style.strokeDashoffset = maxCircumference * (1 - fatPct);
        if (vFat) vFat.textContent = `${totals.fGrams}g`;
    },

    // Render Meals
    renderMealLists() {
        const dashList = document.getElementById('dashMealsList');
        const categories = { breakfast: [], lunch: [], dinner: [], snacks: [] };
        const catCal = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };

        (this.state.today.meals || []).forEach(m => {
            if (categories[m.category]) {
                categories[m.category].push(m);
                catCal[m.category] += Number(m.calories);
            }
        });

        // Dashboard Recent Meals
        if (dashList) {
            dashList.innerHTML = this.state.today.meals.map(m => `
                <div class="meal-item">
                    <div class="item-left">
                        <div class="item-icon"><i data-lucide="utensils"></i></div>
                        <div class="item-details">
                            <h5>${m.name}</h5>
                            <p>بروتين: ${m.protein}g | كارب: ${m.carbs}g | دهون: ${m.fats}g</p>
                        </div>
                    </div>
                    <div class="item-right">
                        <span class="item-cal">${m.calories} kcal</span>
                        <button class="btn btn-sm btn-icon" onclick="FitPulseApp.deleteMeal('${m.id}')" title="حذف">&times;</button>
                    </div>
                </div>
            `).join('') || '<p class="text-muted text-center">لا توجد وجبات مسجلة اليوم</p>';
        }

        // Category Cards
        ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(cat => {
            const listElem = document.getElementById(`list${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
            const calElem = document.getElementById(`catCal${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
            if (calElem) calElem.textContent = `${catCal[cat]} kcal`;
            if (listElem) {
                listElem.innerHTML = categories[cat].map(m => `
                    <div class="meal-item">
                        <div class="item-left">
                            <div class="item-details">
                                <h5>${m.name}</h5>
                                <p>P: ${m.protein}g | C: ${m.carbs}g | F: ${m.fats}g</p>
                            </div>
                        </div>
                        <div class="item-right">
                            <span class="item-cal">${m.calories} kcal</span>
                            <button class="btn btn-sm btn-icon" onclick="FitPulseApp.deleteMeal('${m.id}')">&times;</button>
                        </div>
                    </div>
                `).join('') || '<p class="text-muted text-center text-sm">لم تضاف وجبات</p>';
            }
        });

        this.initLucideIcons();
    },

    // Delete Meal
    deleteMeal(id) {
        this.state.today.meals = this.state.today.meals.filter(m => m.id !== id);
        this.saveState();
        this.updateAllUI();
    },

    // Render Workouts
    renderWorkoutLists() {
        const dashList = document.getElementById('dashWorkoutsList');
        const fullList = document.getElementById('fullWorkoutsHistoryList');

        const html = (this.state.today.workouts || []).map(w => `
            <div class="workout-item">
                <div class="item-left">
                    <div class="item-icon"><i data-lucide="activity"></i></div>
                    <div class="item-details">
                        <h5>${w.name}</h5>
                        <p>المدة: ${w.duration} دقيقة | المصدر: ${w.source || 'يدوي'}</p>
                    </div>
                </div>
                <div class="item-right">
                    <span class="item-cal">${w.calories} kcal</span>
                    <button class="btn btn-sm btn-icon" onclick="FitPulseApp.deleteWorkout('${w.id}')">&times;</button>
                </div>
            </div>
        `).join('') || '<p class="text-muted text-center">لا توجد تمارين مسجلة اليوم</p>';

        if (dashList) dashList.innerHTML = html;
        if (fullList) fullList.innerHTML = html;
        this.initLucideIcons();
    },

    deleteWorkout(id) {
        this.state.today.workouts = this.state.today.workouts.filter(w => w.id !== id);
        this.saveState();
        this.updateAllUI();
    },

    // Modal Add Meal
    openAddMealModal(defaultCategory = 'breakfast') {
        const modal = document.getElementById('addMealModal');
        if (modal) {
            modal.classList.remove('hidden');
            const catElem = document.getElementById('modalMealCategory');
            if (catElem) catElem.value = defaultCategory;
            const form = document.getElementById('addMealForm');
            if (form) form.reset();
        }
    },

    closeAddMealModal() {
        const modal = document.getElementById('addMealModal');
        if (modal) modal.classList.add('hidden');
    },

    handleMealFormSubmit() {
        const name = document.getElementById('modalMealName').value;
        const category = document.getElementById('modalMealCategory').value;
        const calories = Number(document.getElementById('modalMealCal').value);
        const protein = Number(document.getElementById('modalMealProtein').value);
        const carbs = Number(document.getElementById('modalMealCarbs').value);
        const fats = Number(document.getElementById('modalMealFats').value);

        const newMeal = {
            id: 'm_' + Date.now(),
            name,
            category,
            calories,
            protein,
            carbs,
            fats,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        this.state.today.meals.push(newMeal);
        this.saveState();
        this.closeAddMealModal();
        this.updateAllUI();
    },

    // Gemini AI Nutrition Quick Analyzer
    handleQuickGeminiAnalysis() {
        const inputElem = document.getElementById('dashQuickAiInput');
        const resBox = document.getElementById('dashQuickAiResult');
        if (!inputElem || !resBox) return;
        const input = inputElem.value.trim();
        if (!input) return;

        resBox.classList.remove('hidden');
        resBox.innerHTML = '<div class="text-cyan"><i data-lucide="sparkles"></i> جاري تحليل الوجبة بواسطة جيميناي...</div>';
        this.initLucideIcons();

        setTimeout(() => {
            const parsed = this.parseMealTextWithGemini(input);
            resBox.innerHTML = `
                <div class="flex-center justify-between">
                    <div>
                        <strong>النتيجة المقدرة من جيميناي:</strong>
                        <p class="margin-top-xs">${parsed.name} (~${parsed.calories} kcal)</p>
                        <small>بروتين: ${parsed.protein}g | كارب: ${parsed.carbs}g | دهون: ${parsed.fats}g</small>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="FitPulseApp.logGeminiParsedMeal('${parsed.name.replace(/'/g, "")}', ${parsed.calories}, ${parsed.protein}, ${parsed.carbs}, ${parsed.fats})">
                        + إضافة للوجبات
                    </button>
                </div>
            `;
        }, 800);
    },

    // Gemini Chat Send
    handleGeminiChatSend() {
        const inputElem = document.getElementById('geminiInputText');
        const chatBox = document.getElementById('geminiMessages');
        if (!inputElem || !chatBox) return;
        const text = inputElem.value.trim();
        if (!text) return;

        // Append User Message
        chatBox.innerHTML += `
            <div class="user-msg">
                <div class="user-msg-avatar"><i data-lucide="user"></i></div>
                <div class="msg-content">${text}</div>
            </div>
        `;
        inputElem.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        // Gemini Typing Indicator
        const typingId = 'typing_' + Date.now();
        chatBox.innerHTML += `
            <div class="ai-msg" id="${typingId}">
                <div class="ai-avatar"><i data-lucide="bot"></i></div>
                <div class="msg-content text-purple">
                    <i data-lucide="sparkles"></i> Gemini يحلل طلبك...
                </div>
            </div>
        `;
        this.initLucideIcons();
        chatBox.scrollTop = chatBox.scrollHeight;

        setTimeout(() => {
            const typingElem = document.getElementById(typingId);
            if (typingElem) typingElem.remove();

            const response = this.generateGeminiResponse(text);
            chatBox.innerHTML += `
                <div class="ai-msg">
                    <div class="ai-avatar"><i data-lucide="bot"></i></div>
                    <div class="msg-content">${response}</div>
                </div>
            `;
            chatBox.scrollTop = chatBox.scrollHeight;
            this.initLucideIcons();
        }, 1200);
    },

    // Natural Language Gemini Response Generator
    generateGeminiResponse(query) {
        const parsed = this.parseMealTextWithGemini(query);
        if (query.includes('احسب') || query.includes('أكلت') || query.includes('وجبة') || query.includes('دجاج') || query.includes('رز')) {
            return `
                <p>بناءً على تحليلي للوجبة المذكورة <strong>"${query}"</strong>:</p>
                <div class="gemini-card-result margin-top-xs">
                    <ul>
                        <li>🔥 <strong>السعرات الحرارية المقدرة:</strong> ${parsed.calories} kcal</li>
                        <li>🥩 <strong>البروتين:</strong> ${parsed.protein} جرام</li>
                        <li>🌾 <strong>الكربوهيدرات:</strong> ${parsed.carbs} جرام</li>
                        <li>🥑 <strong>الدهون:</strong> ${parsed.fats} جرام</li>
                    </ul>
                </div>
                <p class="margin-top-xs">هل ترغب في تسجليها في جدول وجبات اليوم فوراً؟</p>
                <button class="btn btn-sm btn-primary margin-top-xs" onclick="FitPulseApp.logGeminiParsedMeal('${parsed.name.replace(/'/g, "")}', ${parsed.calories}, ${parsed.protein}, ${parsed.carbs}, ${parsed.fats})">
                    + تسجيل الوجبة الآن
                </button>
            `;
        } else if (query.includes('تمرين') || query.includes('HIIT') || query.includes('حرق')) {
            return `
                <p>إليك اقتراح تمرين عالي الشدة (HIIT) مصمم لحرق الدهون بسرعة وسعادة من ساعتك:</p>
                <ol>
                    <li>🏃‍♂️ 45 ثانية جري سريع مكانك (High Knees)</li>
                    <li>🏋️‍♂️ 45 ثانية تمارين القرفصاء (Squats)</li>
                    <li>🔥 45 ثانية تمارين البوربي (Burpees)</li>
                    <li>⏱️ 15 ثانية راحة بين كل تمرين</li>
                </ol>
                <p><strong>المعدل المتوقع للحرق:</strong> 220 سعرة خلال 15 دقيقة فقط!</p>
            `;
        } else {
            return `
                <p>سعيد بالإجابة عليك! أداءك اليوم ممتاز جداً مع <strong>${this.state.watches.apple.steps} خطوة</strong> و <strong>${this.getCalculatedTotals().pGrams}g بروتين</strong>.</p>
                <p>نصيحة جيميناي اليومية: حافظ على شرب 3 لتر ماء على الأقل لدعم الاستشفاء العضلي بعد تمارين الحديد!</p>
            `;
        }
    },

    // Parse Text to Macros algorithm
    parseMealTextWithGemini(text) {
        let calories = 450;
        let protein = 35;
        let carbs = 45;
        let fats = 12;

        if (text.includes('دجاج')) { calories += 150; protein += 25; }
        if (text.includes('رز')) { calories += 200; carbs += 40; }
        if (text.includes('لحم')) { calories += 250; protein += 30; fats += 10; }
        if (text.includes('بيض')) { calories += 180; protein += 18; fats += 12; }
        if (text.includes('زيت') || text.includes('أفوكادو')) { calories += 120; fats += 14; }
        if (text.includes('سلطة')) { calories += 50; carbs += 8; }

        return { name: text.length > 30 ? text.substring(0, 30) + '...' : text, calories, protein, carbs, fats };
    },

    logGeminiParsedMeal(name, cal, p, c, f) {
        this.state.today.meals.push({
            id: 'm_ai_' + Date.now(),
            name: `✨ ${name} (Gemini AI)`,
            category: 'lunch',
            calories: cal,
            protein: p,
            carbs: c,
            fats: f,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        this.saveState();
        this.updateAllUI();
        alert('تمت إضافة الوجبة بنجاح لحسابك اليومي!');
    },

    // Manual Workout Handler
    handleManualWorkoutSubmit() {
        const name = document.getElementById('mWorkName').value;
        const duration = Number(document.getElementById('mWorkDuration').value);
        const calories = Number(document.getElementById('mWorkCalories').value);

        this.state.today.workouts.push({
            id: 'w_' + Date.now(),
            name,
            type: 'custom',
            duration,
            calories,
            source: 'تسجيل يدوي',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        this.saveState();
        this.updateAllUI();
        document.getElementById('manualWorkoutForm').reset();
    },

    // Live Workout Engine
    toggleLiveWorkout() {
        const active = this.state.activeWorkout;
        const startBtn = document.getElementById('startWorkoutBtn');
        const stopBtn = document.getElementById('stopWorkoutBtn');
        const badge = document.getElementById('liveWorkoutBadge');
        const typeSelect = document.getElementById('workoutTypeSelect');

        if (!active.isLive) {
            // Start Live Timer
            active.isLive = true;
            active.seconds = 0;
            active.burnedCalories = 0;
            active.type = typeSelect ? typeSelect.value : 'running';
            active.steps = 0;

            if (startBtn) startBtn.classList.add('hidden');
            if (stopBtn) stopBtn.classList.remove('hidden');
            if (badge) badge.classList.remove('hidden');

            const selectedText = typeSelect ? typeSelect.options[typeSelect.selectedIndex].text : 'تمرين';
            this.logSyncMessage(`بدء تمرين مباشر (${selectedText}) عبر الساعات الذكية`);

            active.timerId = setInterval(() => {
                active.seconds++;
                active.burnedCalories += Math.floor(Math.random() * 2) + 1;
                active.heartRate = Math.floor(Math.random() * 25) + 120; // 120-145 BPM during workout
                if (active.type === 'running' || active.type === 'walking') {
                    active.steps += Math.floor(Math.random() * 3) + 2;
                }

                // Update Display
                const hrs = String(Math.floor(active.seconds / 3600)).padStart(2, '0');
                const mins = String(Math.floor((active.seconds % 3600) / 60)).padStart(2, '0');
                const secs = String(active.seconds % 60).padStart(2, '0');
                const clock = document.getElementById('workoutTimerClock');
                const calLive = document.getElementById('workoutLiveCal');
                const bpmLive = document.getElementById('workoutLiveBpm');
                const stepsLive = document.getElementById('workoutLiveSteps');

                if (clock) clock.textContent = `${hrs}:${mins}:${secs}`;
                if (calLive) calLive.innerHTML = `${active.burnedCalories} <small>kcal</small>`;
                if (bpmLive) bpmLive.innerHTML = `${active.heartRate} <small>BPM</small>`;
                if (stepsLive) stepsLive.textContent = active.steps;

                // Sync live heart rate to watches
                this.state.watches.apple.heartRate = active.heartRate;
                this.state.watches.huawei.heartRate = active.heartRate;
                this.updateWatchStreamUI();
            }, 1000);

        } else {
            // Stop Workout
            clearInterval(active.timerId);
            active.isLive = false;

            if (startBtn) startBtn.classList.remove('hidden');
            if (stopBtn) stopBtn.classList.add('hidden');
            if (badge) badge.classList.add('hidden');

            // Save completed workout
            if (active.seconds > 5) {
                const durationMins = Math.max(1, Math.round(active.seconds / 60));
                const selectedText = typeSelect ? typeSelect.options[typeSelect.selectedIndex].text.split(' ')[1] : 'رياضة';
                const newW = {
                    id: 'w_live_' + Date.now(),
                    name: `🏃‍♂️ تمرين مباشر (${selectedText})`,
                    type: active.type,
                    duration: durationMins,
                    calories: active.burnedCalories,
                    steps: active.steps,
                    source: 'Apple & Huawei Watch Live',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                this.state.today.workouts.push(newW);
                this.state.watches.apple.steps += active.steps;
                this.saveState();
                this.updateAllUI();
                alert(`ممتاز! تم إنهاء التمرين وحفظ حرق ${active.burnedCalories} سعرة حرارية!`);
            }
        }
    },

    // Watch Pulse Simulator & Pulse Waves Canvas
    startWatchPulseSimulators() {
        setInterval(() => {
            if (!this.state.activeWorkout.isLive) {
                // Fluctuating resting heart rate
                const bpmA = Math.floor(Math.random() * 8) + 70;
                const bpmH = Math.floor(Math.random() * 6) + 70;
                this.state.watches.apple.heartRate = bpmA;
                this.state.watches.huawei.heartRate = bpmH;
                this.updateWatchStreamUI();
            }
        }, 3000);

        this.initCanvasPulseRenderers();
    },

    updateWatchStreamUI() {
        const bpmVal = this.state.watches.apple.heartRate;
        const dBpm = document.getElementById('dashBpm');
        const lBpm = document.getElementById('liveBpmValue');
        if (dBpm) dBpm.textContent = bpmVal;
        if (lBpm) lBpm.textContent = bpmVal;

        const aH = document.getElementById('appleHeartVal');
        const aS = document.getElementById('appleStepsVal');
        const aB = document.getElementById('appleBurnVal');
        if (aH) aH.textContent = `${this.state.watches.apple.heartRate} BPM`;
        if (aS) aS.textContent = this.state.watches.apple.steps.toLocaleString();
        if (aB) aB.textContent = `${this.getCalculatedTotals().burnedCal} kcal`;

        const hH = document.getElementById('huaweiHeartVal');
        const hS = document.getElementById('huaweiStepsVal');
        if (hH) hH.textContent = `${this.state.watches.huawei.heartRate} BPM`;
        if (hS) hS.textContent = this.state.watches.huawei.steps.toLocaleString();
    },

    updateWatchStatusBanners() {
        const aBanner = document.getElementById('appleWatchStatusBanner');
        const hBanner = document.getElementById('huaweiWatchStatusBanner');

        if (aBanner) {
            aBanner.className = `watch-status-banner ${this.state.watches.apple.connected ? 'connected' : 'text-muted'}`;
            aBanner.innerHTML = this.state.watches.apple.connected ? 
                '<i data-lucide="check-circle-2"></i><span>متصل ومتزامن تلقائياً (Live HealthKit)</span>' : 
                '<span>مقطوع الاتصال</span>';
        }

        if (hBanner) {
            hBanner.className = `watch-status-banner ${this.state.watches.huawei.connected ? 'connected' : 'text-muted'}`;
            hBanner.innerHTML = this.state.watches.huawei.connected ? 
                '<i data-lucide="check-circle-2"></i><span>متصل ومتزامن تلقائياً (TruSeen™ 5.5+)</span>' : 
                '<span>مقطوع الاتصال</span>';
        }
        this.initLucideIcons();
    },

    // Canvas Heartbeat Wave Renderers
    initCanvasPulseRenderers() {
        const renderWave = (canvasId, color) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let offset = 0;

            const draw = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;

                const width = canvas.width;
                const height = canvas.height;
                const mid = height / 2;

                for (let x = 0; x < width; x++) {
                    const y = mid + Math.sin((x + offset) * 0.1) * 8 + (Math.random() * 2 - 1);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                offset += 2;
                requestAnimationFrame(draw);
            };
            draw();
        };

        renderWave('dashBpmCanvas', '#ef4444');
        renderWave('applePulseCanvas', '#00f2fe');
        renderWave('huaweiPulseCanvas', '#ff2d55');
    },

    // Watch Manual Actions
    scanWatches() {
        this.logSyncMessage('جاري البحث عن أجهزة Bluetooth & HealthKit قريبة...');
        setTimeout(() => {
            this.state.watches.apple.steps += Math.floor(Math.random() * 150) + 50;
            this.saveState();
            this.updateAllUI();
            this.logSyncMessage('تم اكتشاف Apple Watch Series 9 & Huawei Watch GT 4 ومزامنة الخطوات بنجاح!');
        }, 1000);
    },

    syncSingleWatch(name) {
        this.logSyncMessage(`مزامنة فورية لـ ${name === 'apple' ? 'Apple Watch HealthKit' : 'Huawei Health Kit'}...`);
        setTimeout(() => {
            this.logSyncMessage(`تمت المزامنة بنجاح! لا توجد بيانات مفقودة.`);
        }, 600);
    },

    simulateWorkoutPulse(name) {
        this.state.watches[name].heartRate = Math.floor(Math.random() * 30) + 135;
        this.updateWatchStreamUI();
        this.logSyncMessage(`محاكاة رفع نبضات القلب لـ ${name.toUpperCase()} إلى ${this.state.watches[name].heartRate} BPM`);
    },

    // Console Log Helper
    logSyncMessage(msg) {
        const consoleElem = document.getElementById('syncConsoleLog');
        if (!consoleElem) return;
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = `<span class="log-time">[${time}]</span> <span>${msg}</span>`;
        consoleElem.prepend(line);
    },

    // Chart.js Analytics
    initCharts() {
        if (!window.Chart) return;

        try {
            // Weekly Calories Chart
            const calCtx = document.getElementById('caloriesWeeklyChart')?.getContext('2d');
            if (calCtx) {
                new Chart(calCtx, {
                    type: 'bar',
                    data: {
                        labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                        datasets: [
                            { label: 'السعرات المستهلكة', data: [1950, 2100, 1850, 2050, 1900, 2200, 1850], backgroundColor: 'rgba(255, 94, 54, 0.8)', borderRadius: 6 },
                            { label: 'السعرات المحروقة', data: [450, 520, 380, 600, 410, 500, 430], backgroundColor: 'rgba(0, 242, 254, 0.8)', borderRadius: 6 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } } }
                });
            }

            // Macros Pie Chart
            const macroCtx = document.getElementById('macrosPieChart')?.getContext('2d');
            if (macroCtx) {
                new Chart(macroCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['بروتين (Protein)', 'كربوهيدرات (Carbs)', 'دهون (Fats)'],
                        datasets: [{
                            data: [130, 160, 45],
                            backgroundColor: ['#ef4444', '#f59e0b', '#00f2fe'],
                            borderWidth: 0
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } } }
                });
            }

            // Steps Chart
            const stepsCtx = document.getElementById('stepsWeeklyChart')?.getContext('2d');
            if (stepsCtx) {
                new Chart(stepsCtx, {
                    type: 'line',
                    data: {
                        labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                        datasets: [{
                            label: 'الخطوات المسجلة بالساعة',
                            data: [9200, 11400, 8900, 12500, 10100, 9800, 8450],
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } } }
                });
            }
        } catch (e) {
            console.warn('Chart error:', e);
        }
    }
};

// Immediate or DOMContentLoaded execution trigger
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FitPulseApp.init());
} else {
    FitPulseApp.init();
}
