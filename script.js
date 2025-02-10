import { Auth } from './js/auth.js';
import { CourseManager } from './js/courses.js';
import { UI } from './js/ui.js';
import { auth } from './js/firebase-config.js';
import { AdminManager } from './js/admin.js';

class App {
    constructor() {
        this.auth = new Auth();
        this.courseManager = new CourseManager();
        this.admin = new AdminManager();
        this.ui = new UI();
        
        // Pass instances to UI
        this.ui.courseManager = this.courseManager;
        this.ui.admin = this.admin;
        
        // Initialize buttons reference
        this.buttons = {
            home: document.getElementById('homeBtn'),
            courses: document.getElementById('coursesBtn'),
            login: document.getElementById('loginBtn'),
            profile: document.getElementById('profileBtn'),
            admin: document.getElementById('adminBtn')
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
                await this.loadUserData();
            } else {
                this.buttons.admin.style.display = 'none';
            }
        });

        // Load initial courses
        await this.courseManager.loadCourses();
        this.setupEventListeners();
        this.ui.displayCourses(
            this.courseManager.getAllCourses(),
            (courseId) => this.handleEnroll(courseId)
        );
    }

    handleRouting() {
        // Handle browser navigation
        window.addEventListener('popstate', (e) => {
            if (e.state?.courseId) {
                const course = this.courseManager.getCourse(e.state.courseId);
                if (course) {
                    this.ui.displayCourseDetail(course);
                } else {
                    window.location.href = '/404.html';
                }
            } else {
                this.ui.showSection('home');
            }
        });

        // Check initial URL for course
        const path = window.location.pathname;
        const courseMatch = path.match(/\/course\/(.+)/);
        if (courseMatch) {
            const courseId = courseMatch[1];
            const course = this.courseManager.getCourse(courseId);
            if (course) {
                this.ui.displayCourseDetail(course);
            } else {
                window.location.href = '/404.html';
            }
        }
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('homeBtn').addEventListener('click', () => this.ui.showSection('home'));
        document.getElementById('coursesBtn').addEventListener('click', () => this.ui.showSection('courses'));
        document.getElementById('loginBtn').addEventListener('click', () => this.ui.showSection('login'));
        document.getElementById('profileBtn').addEventListener('click', () => this.ui.showSection('profile'));

        // Auth form
        document.getElementById('authForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                await this.auth.login(email, password);
                this.ui.showSection('home');
            } catch (error) {
                alert(error.message);
            }
        });

        document.getElementById('registerBtn').addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                await this.auth.register(email, password);
                this.ui.showSection('home');
            } catch (error) {
                alert(error.message);
            }
        });

        // Admin panel button
        document.getElementById('adminBtn').addEventListener('click', () => {
            this.ui.displayAdminPanel(this.courseManager.getAllCourses(), {
                onCreate: async (data) => {
                    await this.admin.createCourse(data);
                    await this.courseManager.loadCourses();
                },
                onUpdate: async (id, data) => {
                    await this.admin.updateCourse(id, data);
                    await this.courseManager.loadCourses();
                },
                onDelete: async (id) => {
                    await this.admin.deleteCourse(id);
                    await this.courseManager.loadCourses();
                },
                onRefresh: async () => {
                    await this.courseManager.loadCourses();
                    return this.courseManager.getAllCourses();
                },
                onGetCourse: (id) => this.courseManager.getCourse(id)
            });
            this.ui.showSection('admin');
        });
    }

    async loadUserData() {
        // Add any additional user data loading here
    }

    handleEnroll(courseId) {
        if (!this.auth.isLoggedIn()) {
            alert('Please login first');
            this.ui.showSection('login');
            return;
        }
        
        if (this.auth.enrollCourse(courseId)) {
            alert('Successfully enrolled!');
        } else {
            alert('Already enrolled in this course');
        }
    }
}

// Initialize app
const app = new App();
