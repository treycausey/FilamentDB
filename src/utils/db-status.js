// Database status indicator for FilamentDB

class DatabaseStatus {
    constructor() {
        this.indicator = null;
        this.init();
    }

    init() {
        // Create status indicator
        this.indicator = document.createElement('div');
        this.indicator.id = 'db-status';
        this.indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            z-index: 1000;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(this.indicator);
        this.updateStatus('checking');
        this.checkDatabase();

        // Click to configure
        this.indicator.addEventListener('click', () => {
            if (!window.FilamentDB.isReady()) {
                window.location.href = 'database-setup.html';
            }
        });
    }

    async checkDatabase() {
        try {
            if (window.FilamentDB) {
                await window.FilamentDB.init();
                if (window.FilamentDB.isReady()) {
                    const entries = await window.FilamentDB.getFilaments();
                    this.updateStatus('connected', entries.length);
                } else {
                    this.updateStatus('offline');
                }
            } else {
                this.updateStatus('offline');
            }
        } catch (error) {
            console.error('Database status check failed:', error);
            this.updateStatus('error');
        }
    }

    updateStatus(status, count = 0) {
        switch (status) {
            case 'checking':
                this.indicator.textContent = '⏳ Checking DB...';
                this.indicator.style.background = 'rgba(158, 158, 158, 0.9)';
                this.indicator.style.color = 'white';
                break;
            case 'connected':
                this.indicator.textContent = `🗄️ DB: ${count} entries`;
                this.indicator.style.background = 'rgba(46, 204, 113, 0.9)';
                this.indicator.style.color = 'white';
                this.indicator.title = 'Database connected and syncing';
                break;
            case 'offline':
                this.indicator.textContent = '💾 Local only';
                this.indicator.style.background = 'rgba(255, 107, 53, 0.9)';
                this.indicator.style.color = 'white';
                this.indicator.title = 'Click to set up database sync';
                break;
            case 'error':
                this.indicator.textContent = '❌ DB Error';
                this.indicator.style.background = 'rgba(255, 68, 68, 0.9)';
                this.indicator.style.color = 'white';
                this.indicator.title = 'Database connection error';
                break;
        }
    }

    refresh() {
        this.checkDatabase();
    }
}

// Auto-initialize on pages that need it
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => new DatabaseStatus(), 1000); // Reduced delay
    });
} else {
    setTimeout(() => new DatabaseStatus(), 1000); // Reduced delay
}