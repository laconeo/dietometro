// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDVamI9QtiQnQ5BxSPaqsR2FBW3lE5vldo",
    authDomain: "dietometro-3855f.firebaseapp.com",
    projectId: "dietometro-3855f",
    storageBucket: "dietometro-3855f.firebasestorage.app",
    messagingSenderId: "882906833301",
    appId: "1:882906833301:web:35e10057ff3d8b607e169c",
    measurementId: "G-1G3Q31HV4L"
};

class DietometroApp {
    constructor() {
        this.currentWeight = '';
        this.dailyRecords = {};
        this.startDate = this.getCurrentDate();
        this.firebaseStatus = 'connecting';
        this.app = null;
        this.db = null;
        
        this.init();
    }

    async init() {
        await this.initializeFirebase();
        this.render();
        this.attachEventListeners();
    }

    async initializeFirebase() {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js');
            const { getFirestore, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js');
            
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            this.firebaseStatus = 'connected';
            
            await this.loadDataFromFirebase();
            this.render();
            
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            this.firebaseStatus = 'error';
            this.render();
        }
    }

    async loadDataFromFirebase() {
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js');
            const docRef = doc(this.db, 'userProfiles', 'user1');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.dailyRecords = data.dailyRecords || {};
                this.startDate = data.startDate || this.getCurrentDate();
            }
        } catch (error) {
            console.error('Error loading data from Firebase:', error);
        }
    }

    async saveDataToFirebase() {
        if (!this.db) return;
        
        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js');
            await setDoc(doc(this.db, 'userProfiles', 'user1'), {
                startDate: this.startDate,
                dailyRecords: this.dailyRecords,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving data to Firebase:', error);
        }
    }

    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }

    getTodayRecord() {
        const today = this.getCurrentDate();
        return this.dailyRecords[today] || {
            breakfast: false,
            lunch: false,
            weight: null,
            date: today
        };
    }

    updateTodayRecord(field, value) {
        const today = this.getCurrentDate();
        const todayRecord = this.getTodayRecord();
        
        this.dailyRecords[today] = {
            ...todayRecord,
            [field]: value
        };

        this.saveDataToFirebase();
        this.render();
    }

    handleWeightSubmit() {
        if (this.currentWeight && !isNaN(this.currentWeight)) {
            this.updateTodayRecord('weight', parseInt(this.currentWeight));
            this.currentWeight = '';
        }
    }

    getStats() {
        const records = Object.values(this.dailyRecords);
        const totalDays = records.length;
        const completeDays = records.filter(r => r.breakfast && r.lunch).length;
        const weightsRecorded = records.filter(r => r.weight !== null);
        
        let weightChange = 0;
        if (weightsRecorded.length >= 2) {
            const weights = weightsRecorded
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(r => r.weight);
            weightChange = weights[weights.length - 1] - weights[0];
        }

        return {
            totalDays,
            completeDays,
            completionRate: totalDays > 0 ? (completeDays / totalDays * 100) : 0,
            weightChange,
            currentStreak: this.getCurrentStreak()
        };
    }

    getCurrentStreak() {
        const today = this.getCurrentDate();
        let streak = 0;
        let currentDate = new Date(today);
        
        while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const record = this.dailyRecords[dateStr];
            
            if (record && record.breakfast && record.lunch) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    getDaysRemaining() {
        const start = new Date(this.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 30);
        const today = new Date();
        const timeDiff = end.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return Math.max(0, daysRemaining);
    }

    getWeightData() {
        return Object.values(this.dailyRecords)
            .filter(record => record.weight !== null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);
    }

    render() {
        const todayRecord = this.getTodayRecord();
        const stats = this.getStats();
        const weightData = this.getWeightData();

        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container fade-in">
                <!-- Header -->
                <div class="header">
                    <h1><i class="fas fa-apple-alt"></i> Dietómetro</h1>
                    <p>Meta: 1 almuerzo + manzanas | 30 días</p>
                    
                    <div class="firebase-status status-${this.firebaseStatus}">
                        <i class="fas fa-${this.getStatusIcon()}"></i>
                        <span>${this.getStatusText()}</span>
                    </div>
                </div>

                <!-- Countdown -->
                <div class="card countdown-card">
                    <i class="fas fa-clock fa-2x"></i>
                    <div class="countdown-number">${this.getDaysRemaining()}</div>
                    <p>días restantes</p>
                </div>

                <!-- Daily Records -->
                <div class="grid grid-2">
                    <!-- Meal Tracking -->
                    <div class="card">
                        <h2 class="section-title">
                            <i class="fas fa-target"></i>
                            Registro del Día
                        </h2>
                        
                        <div class="meal-item">
                            <div class="meal-info">
                                <i class="fas fa-apple-alt" style="color: #ef4444;"></i>
                                <span>Desayuno (Manzanas)</span>
                            </div>
                            <button class="check-button ${todayRecord.breakfast ? 'completed' : 'incomplete'}"
                                    data-action="toggle-breakfast">
                                <i class="fas fa-${todayRecord.breakfast ? 'check-circle' : 'times-circle'}"></i>
                            </button>
                        </div>

                        <div class="meal-item">
                            <div class="meal-info">
                                <i class="fas fa-utensils" style="color: #f97316;"></i>
                                <span>Almuerzo Completo</span>
                            </div>
                            <button class="check-button ${todayRecord.lunch ? 'completed' : 'incomplete'}"
                                    data-action="toggle-lunch">
                                <i class="fas fa-${todayRecord.lunch ? 'check-circle' : 'times-circle'}"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Weight Tracking -->
                    <div class="card">
                        <h2 class="section-title">
                            <i class="fas fa-weight"></i>
                            Peso del Día
                        </h2>
                        
                        <div class="weight-input-group">
                            <input type="number" 
                                   class="weight-input" 
                                   placeholder="Peso en kg"
                                   id="weight-input"
                                   value="${this.currentWeight}">
                            <button class="btn-primary" data-action="submit-weight">
                                Registrar
                            </button>
                        </div>
                        
                        ${todayRecord.weight ? `
                            <div class="weight-display">
                                <i class="fas fa-weight-hanging"></i>
                                Hoy: ${todayRecord.weight} kg
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Statistics -->
                <div class="grid grid-4">
                    <div class="card stats-card">
                        <div class="stats-number stats-blue">${stats.totalDays}</div>
                        <div class="stats-label">Días registrados</div>
                    </div>
                    
                    <div class="card stats-card">
                        <div class="stats-number stats-green">${stats.completeDays}</div>
                        <div class="stats-label">Días completos</div>
                    </div>
                    
                    <div class="card stats-card">
                        <div class="stats-number stats-purple">${stats.currentStreak}</div>
                        <div class="stats-label">Racha actual</div>
                    </div>
                    
                    <div class="card stats-card">
                        <div class="stats-number ${stats.weightChange <= 0 ? 'stats-green' : 'stats-red'}">
                            ${stats.weightChange > 0 ? '+' : ''}${stats.weightChange}
                        </div>
                        <div class="stats-label">Cambio de peso (kg)</div>
                    </div>
                </div>

                <!-- Weight Chart -->
                ${weightData.length > 1 ? `
                    <div class="card">
                        <h2 class="section-title">
                            <i class="fas fa-chart-line"></i>
                            Evolución del Peso
                        </h2>
                        
                        <div class="chart-container">
                            ${this.renderWeightChart(weightData)}
                        </div>
                    </div>
                ` : ''}

                <!-- Error Display -->
                ${this.firebaseStatus === 'error' ? `
                    <div class="card error-card">
                        <strong><i class="fas fa-exclamation-triangle"></i> Modo offline</strong>
                        <p>Los datos se guardan localmente. Revisa tu conexión a internet.</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderWeightChart(weightData) {
        const maxWeight = Math.max(...weightData.map(r => r.weight));
        const minWeight = Math.min(...weightData.map(r => r.weight));
        const range = maxWeight - minWeight || 1;

        return weightData.map(record => {
            const height = ((record.weight - minWeight) / range) * 120 + 20;
            const date = new Date(record.date);
            
            return `
                <div class="chart-bar" style="height: ${height}px;">
                    <div class="chart-date">${date.getDate()}/${date.getMonth() + 1}</div>
                    <div class="chart-weight">${record.weight}</div>
                </div>
            `;
        }).join('');
    }

    getStatusIcon() {
        switch (this.firebaseStatus) {
            case 'connecting': return 'spinner fa-spin';
            case 'connected': return 'wifi';
            case 'error': return 'wifi-slash';
        }
    }

    getStatusText() {
        switch (this.firebaseStatus) {
            case 'connecting': return 'Conectando...';
            case 'connected': return 'Datos sincronizados';
            case 'error': return 'Error de conexión';
        }
    }

    attachEventListeners() {
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            
            switch (action) {
                case 'toggle-breakfast':
                    this.updateTodayRecord('breakfast', !this.getTodayRecord().breakfast);
                    break;
                case 'toggle-lunch':
                    this.updateTodayRecord('lunch', !this.getTodayRecord().lunch);
                    break;
                case 'submit-weight':
                    this.handleWeightSubmit();
                    break;
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.id === 'weight-input') {
                this.currentWeight = e.target.value;
            }
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.id === 'weight-input') {
                this.handleWeightSubmit();
            }
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DietometroApp();
});
