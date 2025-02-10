import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class Profile {
    constructor() {
        this.user = null;
        this.profileData = null;
    }

    async initialize() {
        this.user = auth.currentUser;
        if (this.user) {
            await this.loadProfileData();
            // Don't render here, wait for profile button click
        }
    }

    async loadProfileData() {
        try {
            const userDoc = await getDoc(doc(db, 'users', this.user.uid));
            this.profileData = userDoc.data();

            // Get enrolled courses with details
            const enrolledCourses = [];
            for (const courseId of this.profileData.enrolled || []) {
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists()) {
                    enrolledCourses.push({
                        id: courseDoc.id,
                        ...courseDoc.data(),
                        progress: this.profileData.progress?.[courseId] || { completed: 0, total: 0 }
                    });
                }
            }
            this.profileData.enrolledCourses = enrolledCourses;

            // Get user's reviews with course details
            const reviewsSnapshot = await getDocs(query(
                collection(db, 'courses'),
                where('reviews', 'array-contains', { userId: this.user.uid })
            ));
            
            this.profileData.reviews = [];
            reviewsSnapshot.forEach(doc => {
                const courseData = doc.data();
                const review = courseData.reviews.find(r => r.userId === this.user.uid);
                if (review) {
                    this.profileData.reviews.push({
                        ...review,
                        courseId: doc.id,
                        courseTitle: courseData.title
                    });
                }
            });
        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }

    render() {
        if (!this.user || !this.profileData) return;

        const profileSection = document.getElementById('profileSection');
        profileSection.innerHTML = `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${this.user.photoURL ? 
                            `<img src="${this.user.photoURL}" alt="Profile">` :
                            `<div class="avatar-placeholder">${this.user.email[0].toUpperCase()}</div>`
                        }
                    </div>
                    <div class="profile-info">
                        <h2>${this.user.displayName || 'User'}</h2>
                        <p>${this.user.email}</p>
                        <div class="profile-stats">
                            <div class="stat">
                                <span class="value">${this.profileData.enrolledCourses?.length || 0}</span>
                                <span class="label">Enrolled Courses</span>
                            </div>
                            <div class="stat">
                                <span class="value">${this.getCompletedCoursesCount()}</span>
                                <span class="label">Completed</span>
                            </div>
                            <div class="stat ${this.profileData.strikes > 0 ? 'warning' : ''}">
                                <span class="value">${this.profileData.strikes || 0}</span>
                                <span class="label">Strikes</span>
                            </div>
                        </div>
                    </div>
                    <button class="edit-profile-btn">Edit Profile</button>
                </div>

                <div class="profile-tabs">
                    <button class="tab-btn active" data-tab="courses">My Courses</button>
                    <button class="tab-btn" data-tab="reviews">My Reviews</button>
                    <button class="tab-btn" data-tab="settings">Settings</button>
                </div>

                <div class="profile-content">
                    <div class="tab-panel active" id="coursesPanel">
                        ${this.renderEnrolledCourses()}
                    </div>
                    <div class="tab-panel" id="reviewsPanel">
                        ${this.renderUserReviews()}
                    </div>
                    <div class="tab-panel" id="settingsPanel">
                        ${this.renderSettings()}
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    getCompletedCoursesCount() {
        return this.profileData.enrolledCourses?.filter(
            course => course.progress.completed === 100
        ).length || 0;
    }

    renderEnrolledCourses() {
        const courses = this.profileData.enrolledCourses || [];
        if (courses.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-graduation-cap"></i>
                    <p>You haven't enrolled in any courses yet</p>
                    <a href="/courses" class="browse-courses-btn">Browse Courses</a>
                </div>
            `;
        }

        return `
            <div class="courses-grid">
                ${courses.map(course => `
                    <div class="course-card">
                        <img src="${course.thumbnail}" alt="${course.title}">
                        <div class="course-progress">
                            <div class="progress-bar" style="width: ${course.progress.completed}%"></div>
                        </div>
                        <div class="course-info">
                            <h3>${course.title}</h3>
                            <div class="course-meta">
                                <span>${course.progress.completed}% complete</span>
                                <a href="/learn/${course.id}" class="continue-btn">
                                    ${course.progress.completed === 100 ? 'Review' : 'Continue'}
                                </a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderUserReviews() {
        const reviews = this.profileData.reviews || [];
        if (reviews.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <p>You haven't reviewed any courses yet</p>
                </div>
            `;
        }

        return reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <h3>${review.courseTitle}</h3>
                    <div class="rating">
                        ${Array(5).fill().map((_, i) => 
                            `<i class="fas fa-star ${i < review.rating ? 'filled' : ''}"></i>`
                        ).join('')}
                    </div>
                </div>
                <p class="review-content">${review.content}</p>
                ${review.reply ? `
                    <div class="review-reply">
                        <div class="reply-header">
                            <span>${review.reply.author}</span>
                            <span class="reply-date">
                                ${new Date(review.reply.date).toLocaleDateString()}
                            </span>
                        </div>
                        <p>${review.reply.content}</p>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderSettings() {
        return `
            <form class="settings-form">
                <div class="form-group">
                    <label>Display Name</label>
                    <input type="text" name="displayName" 
                        value="${this.user.displayName || ''}"
                        placeholder="Enter your display name">
                </div>

                <div class="form-group">
                    <label>Profile Picture</label>
                    <input type="file" name="avatar" accept="image/*">
                </div>

                <div class="form-group">
                    <label>Email Notifications</label>
                    <label class="switch">
                        <input type="checkbox" name="emailNotifications"
                            ${this.profileData.settings?.emailNotifications ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>

                <button type="submit" class="save-settings-btn">Save Changes</button>
            </form>

            <div class="danger-zone">
                <h3>Account Management</h3>
                <p>Danger Zone - These actions cannot be undone</p>
                <button class="delete-account-btn">Delete Account</button>
            </div>
        `;
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}Panel`).classList.add('active');
            });
        });

        // Settings form
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', this.handleSettingsSubmit.bind(this));
        }

        // Delete account
        const deleteBtn = document.querySelector('.delete-account-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', this.handleDeleteAccount.bind(this));
        }
    }

    async handleSettingsSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await updateDoc(doc(db, 'users', this.user.uid), {
                displayName: formData.get('displayName'),
                'settings.emailNotifications': formData.get('emailNotifications') === 'on'
            });

            // Handle avatar upload if file selected
            const avatarFile = formData.get('avatar');
            if (avatarFile.size > 0) {
                // Implement avatar upload logic
            }

            alert('Settings updated successfully');
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('Failed to update settings');
        }
    }

    async handleDeleteAccount() {
        if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
            try {
                await this.user.delete();
                window.location.href = '/';
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('Failed to delete account');
            }
        }
    }
}
