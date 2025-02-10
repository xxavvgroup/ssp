import { Auth } from './js/auth.js';
import { CourseManager } from './js/courses.js';
import { UI } from './js/ui.js';
import { auth } from './js/firebase-config.js';
import { AdminManager } from './js/admin.js';
import { Profile } from './js/profile.js';

class App {
    constructor() {
        this.auth = new Auth();
        this.courseManager = new CourseManager();
        this.ui = new UI();
        this.admin = new AdminManager();
        this.profile = new Profile();
        
        // Initialize buttons reference
        this.buttons = {
            login: document.getElementById('loginBtn'),
            logout: document.getElementById('logoutBtn'),
            admin: document.getElementById('adminBtn'),
            profile: document.getElementById('profileBtn')
        };
        
        this.initialize();
        this.handleRouting();
    }

    async initialize() {
        // Set up auth state observer
        auth.onAuthStateChanged(async (user) => {
            this.ui.updateAuthState(!!user);
            if (user) {
                const isAdmin = await this.admin.checkAdminStatus(user.uid);
                this.buttons.admin.style.display = isAdmin ? 'inline' : 'none';
                
                // Initialize profile when user is logged in
                await this.profile.initialize();
                
                await this.loadUserData();
            } else {
                this.buttons.admin.style.display = 'none';
            }
        });

        // ...rest of existing code...
    }

    setupEventListeners() {
        // ...existing event listeners...

        // Profile button
        document.getElementById('profileBtn').addEventListener('click', () => {
            this.profile.render();
            this.ui.showSection('profile');
        });

        // ...rest of existing code...
    }
}

// Initialize app
const app = new App();
