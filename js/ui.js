export class UI {
    constructor() {
        this.sections = {
            home: document.getElementById('homeSection'),
            courses: document.getElementById('coursesSection'),
            login: document.getElementById('loginSection'),
            profile: document.getElementById('profileSection'),
            courseDetail: document.getElementById('courseDetailSection'),
            admin: document.getElementById('adminSection')
        };

        this.buttons = {
            home: document.getElementById('homeBtn'),
            courses: document.getElementById('coursesBtn'),
            login: document.getElementById('loginBtn'),
            profile: document.getElementById('profileBtn'),
            admin: document.getElementById('adminBtn')
        };

        // Add search related elements
        this.searchInput = document.querySelector('.search-bar input');
        this.searchResults = document.createElement('div');
        this.searchResults.className = 'search-results';
        document.querySelector('.search-bar').appendChild(this.searchResults);
        
        this.setupSearch();

        // Add admin manager reference
        this.admin = null;
    }

    setupSearch() {
        let debounceTimeout;
        
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const query = e.target.value.toLowerCase();
                if (query.length < 2) {
                    this.searchResults.style.display = 'none';
                    return;
                }
                this.performSearch(query);
            }, 300);
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar')) {
                this.searchResults.style.display = 'none';
            }
        });

        // Handle keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            const results = this.searchResults.querySelectorAll('.search-result-item');
            if (!results.length) return;

            const current = this.searchResults.querySelector('.selected');
            let next;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (!current) {
                        next = results[0];
                    } else {
                        next = current.nextElementSibling || results[0];
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (!current) {
                        next = results[results.length - 1];
                    } else {
                        next = current.previousElementSibling || results[results.length - 1];
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (current) {
                        current.click();
                    }
                    break;
                case 'Escape':
                    this.searchResults.style.display = 'none';
                    this.searchInput.blur();
                    break;
            }

            if (next) {
                if (current) current.classList.remove('selected');
                next.classList.add('selected');
                next.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    performSearch(query) {
        // Get courses from the CourseManager instance
        const courses = this.courseManager.getAllCourses();
        
        const results = courses.filter(course => {
            return course.title.toLowerCase().includes(query) ||
                   course.description.toLowerCase().includes(query) ||
                   course.author.toLowerCase().includes(query) ||
                   course.category.toLowerCase().includes(query) ||
                   (course.learningObjectives || []).some(obj => obj.toLowerCase().includes(query));
        });

        this.displaySearchResults(results, query);
    }

    displaySearchResults(results, query) {
        if (!results.length) {
            this.searchResults.style.display = 'none';
            return;
        }

        this.searchResults.innerHTML = results.map(course => `
            <div class="search-result-item" data-course-id="${course.id}">
                <div class="search-result-image">
                    <img src="${course.thumbnail || 'https://via.placeholder.com/50x50'}" alt="${course.title}">
                </div>
                <div class="search-result-content">
                    <div class="search-result-title">${this.highlightMatch(course.title, query)}</div>
                    <div class="search-result-category">${course.category}</div>
                    <div class="search-result-author">by ${course.author}</div>
                </div>
            </div>
        `).join('');

        this.searchResults.style.display = 'block';

        // Add click handlers for results
        this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const courseId = item.dataset.courseId;
                const course = this.courseManager.getCourse(courseId);
                if (course) {
                    window.history.pushState({ courseId }, '', `/course/${courseId}`);
                    this.displayCourseDetail(course);
                    this.searchResults.style.display = 'none';
                    this.searchInput.value = '';
                }
            });
        });
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    showSection(sectionName) {
        Object.values(this.sections).forEach(section => section.style.display = 'none');
        this.sections[sectionName].style.display = 'block';
    }

    updateAuthState(isLoggedIn) {
        this.buttons.login.style.display = isLoggedIn ? 'none' : 'inline';
        this.buttons.profile.style.display = isLoggedIn ? 'inline' : 'none';
    }

    displayCourseDetail(course) {
        if (!course) {
            window.location.href = '/404.html';
            return;
        }

        const defaultValues = {
            author: 'xxavvGroup',
            authorTitle: 'xxavvGroup Course Instructor',
            authorBio: 'Professional instructor from xxavvGroup with expertise in creative education.',
            language: 'English',
            videoHours: '4',
            resources: '10',
            price: 'Free',
            requirements: [
                'No prior experience needed',
                'Basic computer skills',
                'Willingness to learn'
            ],
            authorAvatar: 'https://via.placeholder.com/120?text=xG'
        };

        // Merge defaults with course data
        course = { ...defaultValues, ...course };

        const detailSection = this.sections.courseDetail;
        detailSection.innerHTML = `
            <div class="course-header">
                <img src="${course.thumbnail || 'https://via.placeholder.com/1200x400'}" alt="${course.title}">
                <div class="course-header-content">
                    <div class="course-category">${course.category}</div>
                    <h1>${course.title}</h1>
                    <p class="course-subtitle">${course.description}</p>
                    <div class="course-meta">
                        <span class="meta-item">
                            <i class="fas fa-user"></i>
                            By ${course.author}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-clock"></i>
                            ${course.duration}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-signal"></i>
                            ${course.level}
                        </span>
                    </div>
                </div>
            </div>
            <div class="course-content-wrapper">
                <div class="course-main">
                    <section class="course-about">
                        <div class="section-header">
                            <h2>About this course</h2>
                            <div class="section-divider"></div>
                        </div>
                        <div class="rich-text">
                            ${course.longDescription || course.description}
                        </div>
                    </section>

                    <section class="course-curriculum">
                        <div class="section-header">
                            <h2>What you'll learn</h2>
                            <div class="section-divider"></div>
                        </div>
                        <ul class="learning-objectives">
                            ${(course.learningObjectives || []).map(obj => `
                                <li>
                                    <span class="objective-check">✓</span>
                                    ${obj}
                                </li>
                            `).join('')}
                        </ul>
                    </section>

                    <section class="course-requirements">
                        <div class="section-header">
                            <h2>Requirements</h2>
                            <div class="section-divider"></div>
                        </div>
                        <ul class="requirements-list">
                            <li>No prior experience needed</li>
                            <li>Basic computer skills</li>
                            ${course.requirements ? course.requirements.map(req => `<li>${req}</li>`).join('') : ''}
                        </ul>
                    </section>

                    <section class="course-instructor">
                        <div class="section-header">
                            <h2>Your Instructor</h2>
                            <div class="section-divider"></div>
                        </div>
                        <div class="instructor-card">
                            <div class="instructor-avatar">
                                ${course.authorAvatar ? 
                                    `<img src="${course.authorAvatar}" alt="${course.author}">` :
                                    `<div class="avatar-placeholder">${course.author.charAt(0)}</div>`
                                }
                            </div>
                            <div class="instructor-info">
                                <h3>${course.author}</h3>
                                <p class="instructor-title">${course.authorTitle || 'Course Instructor'}</p>
                                <p class="instructor-bio">${course.authorBio || 'Professional instructor with expertise in the subject matter.'}</p>
                            </div>
                        </div>
                    </section>
                </div>

                <aside class="course-sidebar">
                    <div class="enrollment-card">
                        <div class="price-section">
                            ${course.price ? 
                                `<div class="course-price">$${course.price}</div>` :
                                '<div class="course-price free">Free</div>'
                            }
                        </div>
                        <div class="course-stats">
                            <div class="stat-item">
                                <i class="fas fa-book"></i>
                                <span>${course.duration}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-signal"></i>
                                <span>${course.level}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-globe"></i>
                                <span>${course.language || 'English'}</span>
                            </div>
                        </div>
                        <button class="enroll-btn primary-button" data-course-id="${course.id}">
                            Enroll Now
                        </button>
                        <div class="includes-section">
                            <h4>This course includes:</h4>
                            <ul>
                                <li>
                                    <i class="fas fa-video"></i>
                                    ${course.videoHours || '0'} hours on-demand video
                                </li>
                                <li>
                                    <i class="fas fa-file"></i>
                                    ${course.resources || '0'} downloadable resources
                                </li>
                                <li>
                                    <i class="fas fa-infinity"></i>
                                    Full lifetime access
                                </li>
                                <li>
                                    <i class="fas fa-mobile-alt"></i>
                                    Access on mobile and TV
                                </li>
                                <li>
                                    <i class="fas fa-certificate"></i>
                                    Certificate of completion
                                </li>
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>
        `;

        // Add Font Awesome for icons
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesome = document.createElement('link');
            fontAwesome.rel = 'stylesheet';
            fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
            document.head.appendChild(fontAwesome);
        }

        this.showSection('courseDetail');
        
        // Add enroll button listener
        detailSection.querySelector('.enroll-btn').addEventListener('click', (e) => {
            const courseId = e.target.dataset.courseId;
            this.onEnrollCallback(courseId);
        });
    }

    displayCourses(courses, onEnroll) {
        const courseGrid = document.querySelector('.course-grid');
        courseGrid.innerHTML = '';
        this.onEnrollCallback = onEnroll;
        
        courses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.className = 'course-card';
            courseElement.innerHTML = `
                <img src="${course.thumbnail || 'https://via.placeholder.com/300x160'}" alt="${course.title}">
                <div class="course-content">
                    <h3>${course.title}</h3>
                    <p>${course.description}</p>
                    <p class="author">By: ${course.author}</p>
                    <p>${course.duration} • ${course.level}</p>
                    <div class="course-actions">
                        <button class="view-course" data-course-id="${course.id}">View Course</button>
                        <button class="enroll-btn" data-course-id="${course.id}">Enroll Now</button>
                    </div>
                </div>
            `;
            courseGrid.appendChild(courseElement);
        });

        // Add event listeners
        courseGrid.querySelectorAll('.view-course').forEach(button => {
            button.addEventListener('click', () => {
                const courseId = button.dataset.courseId;
                window.history.pushState({ courseId }, '', `/course/${courseId}`);
                const course = courses.find(c => c.id === courseId);
                this.displayCourseDetail(course);
            });
        });

        // Add event listeners to enroll buttons
        document.querySelectorAll('.enroll-btn').forEach(button => {
            button.addEventListener('click', () => {
                onEnroll(parseInt(button.dataset.courseId));
            });
        });
    }

    async displayAdminPanel(courses, callbacks) {
        try {
            // Initialize admin first
            await this.admin.initialize();
            
            const stats = await this.admin.getStatistics();
            const adminSection = this.sections.admin;
            adminSection.innerHTML = `
                <div class="admin-layout">
                    <div class="admin-sidebar">
                        <div class="admin-logo">
                            <span class="highlight">xG</span> Admin
                        </div>
                        <ul class="admin-nav">
                            <li class="admin-nav-item">
                                <a href="#dashboard" class="admin-nav-link active">
                                    <i class="fas fa-home"></i>
                                    Dashboard
                                </a>
                            </li>
                            <li class="admin-nav-item">
                                <a href="#courses" class="admin-nav-link">
                                    <i class="fas fa-book"></i>
                                    Courses
                                </a>
                            </li>
                            <li class="admin-nav-item">
                                <a href="#users" class="admin-nav-link">
                                    <i class="fas fa-users"></i>
                                    Users
                                </a>
                            </li>
                            <li class="admin-nav-item">
                                <a href="#settings" class="admin-nav-link">
                                    <i class="fas fa-cog"></i>
                                    Settings
                                </a>
                            </li>
                            <li class="admin-nav-item">
                                <a href="#notifications" class="admin-nav-link">
                                    <i class="fas fa-bell"></i>
                                    Notifications
                                    <span class="notification-badge">3</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div class="admin-main">
                        <!-- Content will be loaded here -->
                    </div>
                </div>

                <div class="notifications-center"></div>

                <div id="courseFormModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3>Course Details</h3>
                        <form id="courseForm" class="course-form-grid">
                            <div class="form-group">
                                <label for="title">Course Title</label>
                                <input type="text" name="title" id="title" required>
                            </div>

                            <div class="form-group">
                                <label for="category">Category</label>
                                <input type="text" name="category" id="category" required>
                            </div>

                            <div class="form-group">
                                <label for="description">Short Description</label>
                                <textarea name="description" id="description" required></textarea>
                            </div>

                            <div class="form-group">
                                <label for="thumbnail">Thumbnail URL</label>
                                <input type="url" name="thumbnail" id="thumbnail">
                            </div>

                            <div class="form-group">
                                <label for="duration">Duration</label>
                                <input type="text" name="duration" id="duration" required>
                            </div>

                            <div class="form-group">
                                <label for="level">Level</label>
                                <select name="level" id="level" required>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="price">Price</label>
                                <input type="text" name="price" id="price" placeholder="Leave empty for free">
                            </div>

                            <div class="form-group">
                                <label for="language">Language</label>
                                <input type="text" name="language" id="language" value="English">
                            </div>

                            <div class="form-group">
                                <label for="videoHours">Video Hours</label>
                                <input type="number" name="videoHours" id="videoHours" min="0" step="0.5">
                            </div>

                            <div class="form-group">
                                <label for="resources">Resources Count</label>
                                <input type="number" name="resources" id="resources" min="0">
                            </div>

                            <div class="form-group course-form-full">
                                <label for="longDescription">Detailed Description</label>
                                <textarea name="longDescription" id="longDescription" rows="4" required></textarea>
                            </div>

                            <div class="form-group">
                                <label for="author">Author Name</label>
                                <input type="text" name="author" id="author" required>
                            </div>

                            <div class="form-group">
                                <label for="authorTitle">Author Title</label>
                                <input type="text" name="authorTitle" id="authorTitle">
                            </div>

                            <div class="form-group">
                                <label for="authorAvatar">Author Avatar URL</label>
                                <input type="url" name="authorAvatar" id="authorAvatar">
                            </div>

                            <div class="form-group course-form-full">
                                <label for="authorBio">Author Bio</label>
                                <textarea name="authorBio" id="authorBio" rows="2"></textarea>
                            </div>

                            <div class="form-group course-form-full">
                                <label>Learning Objectives</label>
                                <div id="objectivesList" class="array-field"></div>
                                <button type="button" class="add-item-btn" id="addObjective">
                                    <i class="fas fa-plus"></i> Add Learning Objective
                                </button>
                            </div>

                            <div class="form-group course-form-full">
                                <label>Requirements</label>
                                <div id="requirementsList" class="array-field"></div>
                                <button type="button" class="add-item-btn" id="addRequirement">
                                    <i class="fas fa-plus"></i> Add Requirement
                                </button>
                            </div>

                            <div class="form-actions course-form-full">
                                <button type="submit" class="primary-button">Save Course</button>
                                <button type="button" id="cancelForm">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            // Initially load dashboard
            await this.displayAdminDashboard(stats);

            // Setup event listeners
            this.setupAdminEventListeners(callbacks); // Move this line here

            // Add event listener for cancel button
            document.getElementById('cancelForm')?.addEventListener('click', () => {
                document.getElementById('courseFormModal').style.display = 'none';
            });
        } catch (error) {
            this.showNotification('Error loading admin panel: ' + error.message, 'error');
        }
    }

    async displayNotificationsPanel() {
        const adminSection = document.querySelector('.admin-main');
        const notifications = await this.admin.getNotifications();
        
        adminSection.innerHTML = `
            <div class="admin-header">
                <h2>System Notifications</h2>
                <button class="primary-button" id="markAllRead">
                    <i class="fas fa-check-double"></i> Mark All Read
                </button>
            </div>

            <div class="notifications-list">
                ${notifications.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications yet</p>
                    </div>
                ` : notifications.map(notification => `
                    <div class="notification-item ${!notification.read ? 'unread' : ''}" data-id="${notification.id}">
                        <div class="notification-icon ${notification.type}">
                            <i class="fas fa-${
                                notification.type === 'success' ? 'check-circle' :
                                notification.type === 'warning' ? 'exclamation-triangle' :
                                'info-circle'
                            }"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">
                                ${new Date(notification.timestamp).toLocaleString()}
                            </div>
                        </div>
                        ${!notification.read ? `
                            <button class="notification-action">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;

        // Add event listeners for notification actions
        document.querySelectorAll('.notification-action').forEach(button => {
            button.addEventListener('click', async (e) => {
                const item = e.currentTarget.closest('.notification-item');
                const notificationId = item.dataset.id;
                await this.admin.markNotificationRead(notificationId);
                item.classList.remove('unread');
                e.currentTarget.remove();
                this.updateNotificationBadge();
            });
        });

        document.getElementById('markAllRead')?.addEventListener('click', async () => {
            await this.admin.markAllNotificationsRead();
            document.querySelectorAll('.notification-item').forEach(item => {
                item.classList.remove('unread');
                item.querySelector('.notification-action')?.remove();
            });
            this.updateNotificationBadge();
        });
    }

    async updateNotificationBadge() {
        const notifications = await this.admin.getNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <div class="notification-content">${message}</div>
        `;

        const container = document.querySelector('.notifications-center');
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Update setupAdminEventListeners to use the new form fields and add array field handling
    async setupAdminEventListeners(callbacks) {
        const { onCreate, onUpdate, onDelete } = callbacks;
        const modal = document.getElementById('courseFormModal');
        const form = document.getElementById('courseForm');
        
        // Check if createCourseBtn exists before attaching event listener
        const createCourseBtn = document.getElementById('createCourseBtn');
        if (createCourseBtn) {
            createCourseBtn.addEventListener('click', () => {
                this.openCourseForm();
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const courseData = Object.fromEntries(formData.entries());
            courseData.learningObjectives = Array.from(
                document.querySelectorAll('.objective-input')
            ).map(input => input.value).filter(Boolean);

            try {
                if (form.dataset.courseId) {
                    await onUpdate(form.dataset.courseId, courseData);
                } else {
                    await onCreate(courseData);
                }
                modal.style.display = 'none';
                // Refresh the admin panel
                this.displayAdminPanel(await callbacks.onRefresh(), callbacks);
            } catch (error) {
                alert(error.message);
            }
        });

        document.querySelectorAll('.delete-course').forEach(button => {
            button.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this course?')) {
                    await onDelete(button.dataset.id);
                    // Refresh the admin panel
                    this.displayAdminPanel(await callbacks.onRefresh(), callbacks);
                }
            });
        });

        document.querySelectorAll('.edit-course').forEach(button => {
            button.addEventListener('click', async () => {
                const courseId = button.dataset.id;
                const course = await callbacks.onGetCourse(courseId);
                if (course) {
                    this.openCourseForm(course);
                }
            });
        });

        // Array field handlers
        ['objective', 'requirement'].forEach(type => {
            const addButton = document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}`);
            const list = document.getElementById(`${type}sList`);
            
            if (addButton && list) {
                addButton.addEventListener('click', () => {
                    const item = document.createElement('div');
                    item.className = 'array-field-item';
                    item.innerHTML = `
                        <input type="text" class="${type}-input">
                        <button type="button" class="remove-item">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    list.appendChild(item);

                    item.querySelector('.remove-item').addEventListener('click', () => {
                        item.remove();
                    });
                });
            }
        });

        // Admin navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const section = e.target.closest('.admin-nav-link').getAttribute('href').slice(1);
                
                // Update active state
                document.querySelectorAll('.admin-nav-link').forEach(l => 
                    l.classList.remove('active'));
                e.target.closest('.admin-nav-link').classList.add('active');

                try {
                    // Load appropriate section
                    switch (section) {
                        case 'dashboard':
                            const stats = await this.admin.getStatistics();
                            await this.displayAdminDashboard(stats);
                            break;
                        case 'courses':
                            const courses = this.courseManager.getAllCourses();
                            this.displayCoursesPanel(courses, callbacks);
                            break;
                        case 'users':
                            const users = await this.admin.getAllUsers();
                            this.displayUsersPanel(users);
                            break;
                        case 'settings':
                            const settings = await this.admin.getSettings();
                            this.displaySettingsPanel(settings);
                            break;
                        case 'notifications':
                            this.displayNotificationsPanel();
                            break;
                    }
                } catch (error) {
                    this.showNotification(error.message, 'error');
                }
            });
        });
    }

    // Update openCourseForm to handle all fields
    openCourseForm(course = null) {
        const modal = document.getElementById('courseFormModal');
        const form = document.getElementById('courseForm');
        
        modal.style.display = 'block';
        form.reset();

        if (course) {
            form.dataset.courseId = course.id;
            
            // Handle all standard fields
            const fields = [
                'title', 'category', 'description', 'thumbnail', 'duration',
                'level', 'price', 'language', 'videoHours', 'resources',
                'longDescription', 'author', 'authorTitle', 'authorAvatar', 'authorBio'
            ];

            fields.forEach(field => {
                const input = form.elements[field];
                if (input && course[field]) {
                    input.value = course[field];
                }
            });

            // Handle arrays
            this.setupArrayField('objectives', course.learningObjectives || []);
            this.setupArrayField('requirements', course.requirements || []);
        } else {
            // Set default values for new courses
            form.elements.language.value = 'English';
            form.elements.level.value = 'Beginner';
            form.elements.author.value = 'xxavvGroup';
            form.elements.authorTitle.value = 'xxavvGroup Course Instructor';
            form.elements.authorBio.value = 'Professional instructor from xxavvGroup with expertise in creative education.';
            
            // Clear arrays
            this.setupArrayField('objectives', []);
            this.setupArrayField('requirements', []);
        }

        // Add initial array items if empty
        if (!document.querySelector('.objective-input')) {
            document.getElementById('addObjective').click();
        }
        if (!document.querySelector('.requirement-input')) {
            document.getElementById('addRequirement').click();
        }
    }

    setupArrayField(type, items) {
        const list = document.getElementById(`${type}List`);
        list.innerHTML = '';
        
        if (items.length === 0) return;

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'array-field-item';
            div.innerHTML = `
                <input type="text" class="${type.slice(0, -1)}-input" value="${item}">
                <button type="button" class="remove-item">
                    <i class="fas fa-times"></i>
                </button>
            `;
            list.appendChild(div);

            div.querySelector('.remove-item').addEventListener('click', () => {
                div.remove();
            });
        });
    }

    displayUsersPanel(users) {
        const adminSection = document.querySelector('.admin-main');
        adminSection.innerHTML = `
            <div class="admin-header">
                <h2>User Management</h2>
            </div>
            <div class="admin-card">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Enrolled Courses</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.email}</td>
                                <td>${user.isAdmin ? 'Admin' : 'User'}</td>
                                <td>${user.enrolled?.length || 0} courses</td>
                                <td>
                                    <button class="toggle-role" data-id="${user.id}">
                                        Make ${user.isAdmin ? 'User' : 'Admin'}
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for role toggling
        adminSection.querySelectorAll('.toggle-role').forEach(button => {
            button.addEventListener('click', async () => {
                const userId = button.dataset.id;
                const user = users.find(u => u.id === userId);
                if (user) {
                    try {
                        await this.admin.updateUserRole(userId, !user.isAdmin);
                        this.showNotification('User role updated successfully', 'success');
                        // Refresh the users panel
                        this.displayUsersPanel(await this.admin.getAllUsers());
                    } catch (error) {
                        this.showNotification(error.message, 'error');
                    }
                }
            });
        });
    }

    displaySettingsPanel(settings) {
        const adminSection = document.querySelector('.admin-main');
        adminSection.innerHTML = `
            <div class="admin-header">
                <h2>System Settings</h2>
            </div>
            <div class="admin-card">
                <form id="settingsForm" class="settings-form">
                    <div class="form-group">
                        <label class="switch-label">
                            <span>Allow New Registrations</span>
                            <input type="checkbox" name="allowRegistration" 
                                ${settings.allowRegistration ? 'checked' : ''}>
                            <span class="switch"></span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="switch-label">
                            <span>Require Email Verification</span>
                            <input type="checkbox" name="requireEmailVerification"
                                ${settings.requireEmailVerification ? 'checked' : ''}>
                            <span class="switch"></span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="defaultLanguage">Default Language</label>
                        <select name="defaultLanguage" id="defaultLanguage">
                            <option value="English" ${settings.defaultLanguage === 'English' ? 'selected' : ''}>English</option>
                            <option value="Spanish" ${settings.defaultLanguage === 'Spanish' ? 'selected' : ''}>Spanish</option>
                            <option value="French" ${settings.defaultLanguage === 'French' ? 'selected' : ''}>French</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="switch-label">
                            <span>System Notifications</span>
                            <input type="checkbox" name="systemNotifications"
                                ${settings.systemNotifications ? 'checked' : ''}>
                            <span class="switch"></span>
                        </label>
                    </div>
                    <button type="submit" class="primary-button">Save Settings</button>
                </form>
            </div>
        `;

        // Add event listener for settings form
        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const settings = {
                allowRegistration: formData.get('allowRegistration') === 'on',
                requireEmailVerification: formData.get('requireEmailVerification') === 'on',
                defaultLanguage: formData.get('defaultLanguage'),
                systemNotifications: formData.get('systemNotifications') === 'on'
            };

            try {
                await this.admin.updateSettings(settings);
                this.showNotification('Settings updated successfully', 'success');
            } catch (error) {
                this.showNotification(error.message, 'error');
            }
        });
    }

    async displayAdminDashboard(stats) {
        const courses = this.courseManager.getAllCourses();
        const adminSection = document.querySelector('.admin-main');
        adminSection.innerHTML = `
            <div class="admin-header">
                <h2>Dashboard Overview</h2>
            </div>

            <div class="admin-stats">
                <div class="stat-card">
                    <h3>Total Courses</h3>
                    <div class="value">${stats.totalCourses || courses.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Active Students</h3>
                    <div class="value">${stats.activeUsers || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Total Enrollments</h3>
                    <div class="value">${stats.totalEnrollments || 0}</div>
                </div>
            </div>

            <div class="admin-card">
                <h3>Recent Activity</h3>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Course</th>
                            <th>Enrollments</th>
                            <th>Completion Rate</th>
                            <th>Average Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${courses.slice(0, 5).map(course => {
                            const courseStats = stats.courses?.[course.id] || {
                                enrollments: 0,
                                completions: 0,
                                averageRating: 0
                            };
                            const completionRate = courseStats.enrollments ? 
                                ((courseStats.completions / courseStats.enrollments) * 100).toFixed(0) : 0;
                            
                            return `
                                <tr>
                                    <td>${course.title}</td>
                                    <td>${courseStats.enrollments}</td>
                                    <td>${completionRate}%</td>
                                    <td>${courseStats.averageRating?.toFixed(1) || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    displayCoursesPanel(courses, callbacks) {
        const adminSection = document.querySelector('.admin-main');
        adminSection.innerHTML = `
            <div class="admin-header">
                <h2>Course Management</h2>
                <button id="createCourseBtn" class="primary-button">
                    <i class="fas fa-plus"></i> Create New Course
                </button>
            </div>
            <div class="admin-card">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Category</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${courses.map(course => `
                            <tr>
                                <td>${course.title}</td>
                                <td>${course.author}</td>
                                <td>${course.category}</td>
                                <td>
                                    <button class="edit-course" data-id="${course.id}">Edit</button>
                                    <button class="delete-course" data-id="${course.id}">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Reattach event listeners for course actions
        this.setupCourseActionListeners(callbacks);
    }

    setupCourseActionListeners(callbacks) {
        const { onCreate, onUpdate, onDelete } = callbacks;
        
        // Handle create button
        const createBtn = document.getElementById('createCourseBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.openCourseForm();
            });
        }

        // Handle edit buttons
        document.querySelectorAll('.edit-course').forEach(button => {
            button.addEventListener('click', async () => {
                const courseId = button.dataset.id;
                const course = await callbacks.onGetCourse(courseId);
                if (course) {
                    this.openCourseForm(course);
                }
            });
        });

        // Handle delete buttons
        document.querySelectorAll('.delete-course').forEach(button => {
            button.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this course?')) {
                    await onDelete(button.dataset.id);
                    this.showNotification('Course deleted successfully', 'success');
                    // Refresh the courses list
                    this.displayCoursesPanel(await callbacks.onRefresh(), callbacks);
                }
            });
        });
    }

    async displayCourseEditor(courseId) {
        const course = await this.courseManager.getCourse(courseId);
        const adminSection = document.querySelector('.admin-main');

        adminSection.innerHTML = `
            <div class="admin-header">
                <h2>Edit Course Content: ${course.title}</h2>
                <button class="primary-button" id="saveCourseContent">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>

            <div class="course-editor">
                <div class="editor-sidebar">
                    <div class="editor-sections">
                        <h3>Course Sections</h3>
                        <div id="sectionsList"></div>
                        <button class="add-item-btn" id="addSection">
                            <i class="fas fa-plus"></i> Add Section
                        </button>
                    </div>
                </div>

                <div class="editor-main">
                    <div id="contentEditor">
                        <div class="empty-state">
                            <i class="fas fa-edit"></i>
                            <p>Select a section or lesson to edit its content</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initializeCourseEditor(course);
    }

    async initializeCourseEditor(course) {
        const sections = course.content?.sections || [];
        const sectionsList = document.getElementById('sectionsList');

        const renderSections = () => {
            sectionsList.innerHTML = sections.map((section, sIndex) => `
                <div class="editor-section" data-section="${sIndex}">
                    <div class="section-header">
                        <input type="text" class="section-title" value="${section.title}">
                        <div class="section-actions">
                            <button class="delete-section"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    
                    <div class="lesson-list">
                        ${section.lessons.map((lesson, lIndex) => `
                            <div class="editor-lesson" data-lesson="${lIndex}">
                                <input type="text" class="lesson-title" value="${lesson.title}">
                                <div class="lesson-actions">
                                    <button class="edit-lesson"><i class="fas fa-edit"></i></button>
                                    <button class="delete-lesson"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="add-lesson-btn" data-section="${sIndex}">
                        <i class="fas fa-plus"></i> Add Lesson
                    </button>
                </div>
            `).join('');

            // Add event listeners
            this.setupEditorEventListeners(sections, course.id);
        };

        // Add Section button
        document.getElementById('addSection').addEventListener('click', () => {
            sections.push({
                title: 'New Section',
                lessons: []
            });
            renderSections();
        });

        // Initial render
        renderSections();
    }

    setupEditorEventListeners(sections, courseId) {
        // Section title changes
        document.querySelectorAll('.section-title').forEach(input => {
            input.addEventListener('change', (e) => {
                const sectionIndex = e.target.closest('.editor-section').dataset.section;
                sections[sectionIndex].title = e.target.value;
            });
        });

        // Delete section
        document.querySelectorAll('.delete-section').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!confirm('Delete this section and all its lessons?')) return;
                const sectionIndex = e.target.closest('.editor-section').dataset.section;
                sections.splice(sectionIndex, 1);
                this.initializeCourseEditor({ id: courseId, content: { sections } });
            });
        });

        // Add lesson
        document.querySelectorAll('.add-lesson-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const sectionIndex = e.target.dataset.section;
                sections[sectionIndex].lessons.push({
                    title: 'New Lesson',
                    content: '',
                    type: 'text',
                    duration: '0:00'
                });
                this.initializeCourseEditor({ id: courseId, content: { sections } });
            });
        });

        // Edit lesson
        document.querySelectorAll('.edit-lesson').forEach(button => {
            button.addEventListener('click', (e) => {
                const lessonEl = e.target.closest('.editor-lesson');
                const sectionEl = lessonEl.closest('.editor-section');
                const sectionIndex = sectionEl.dataset.section;
                const lessonIndex = lessonEl.dataset.lesson;
                const lesson = sections[sectionIndex].lessons[lessonIndex];

                this.displayLessonEditor(lesson, sections, sectionIndex, lessonIndex);
            });
        });

        // Save changes
        document.getElementById('saveCourseContent').addEventListener('click', async () => {
            try {
                await this.admin.updateCourseContent(courseId, { sections });
                this.showNotification('Course content saved successfully', 'success');
            } catch (error) {
                this.showNotification('Error saving course content', 'error');
            }
        });
    }

    displayLessonEditor(lesson, sections, sectionIndex, lessonIndex) {
        const editor = document.getElementById('contentEditor');
        
        editor.innerHTML = `
            <div class="lesson-editor">
                <div class="editor-toolbar">
                    <select id="lessonType">
                        <option value="text" ${lesson.type === 'text' ? 'selected' : ''}>Text</option>
                        <option value="video" ${lesson.type === 'video' ? 'selected' : ''}>Video</option>
                        <option value="quiz" ${lesson.type === 'quiz' ? 'selected' : ''}>Quiz</option>
                    </select>
                    <input type="text" id="lessonDuration" placeholder="Duration (e.g., 5:30)" 
                           value="${lesson.duration || '0:00'}">
                </div>

                <div class="editor-content">
                    ${this.getLessonEditorByType(lesson)}
                </div>

                <div class="editor-actions">
                    <button class="primary-button" id="saveLessonBtn">Save Lesson</button>
                </div>
            </div>
        `;

        // Handle lesson type changes
        document.getElementById('lessonType').addEventListener('change', (e) => {
            lesson.type = e.target.value;
            document.querySelector('.editor-content').innerHTML = this.getLessonEditorByType(lesson);
        });

        // Handle lesson save
        document.getElementById('saveLessonBtn').addEventListener('click', () => {
            lesson.type = document.getElementById('lessonType').value;
            lesson.duration = document.getElementById('lessonDuration').value;
            
            switch (lesson.type) {
                case 'text':
                    lesson.content = document.getElementById('textContent').value;
                    break;
                case 'video':
                    lesson.videoUrl = document.getElementById('videoUrl').value;
                    break;
                case 'quiz':
                    lesson.questions = this.getQuizQuestions();
                    break;
            }

            sections[sectionIndex].lessons[lessonIndex] = lesson;
            this.showNotification('Lesson saved', 'success');
        });
    }

    getLessonEditorByType(lesson) {
        switch (lesson.type) {
            case 'text':
                return `
                    <textarea id="textContent" class="lesson-text-editor" rows="20">${lesson.content || ''}</textarea>
                `;
            case 'video':
                return `
                    <div class="video-editor">
                        <input type="url" id="videoUrl" placeholder="Video URL" value="${lesson.videoUrl || ''}">
                        <div class="video-preview">
                            ${lesson.videoUrl ? `<iframe src="${lesson.videoUrl}" frameborder="0" allowfullscreen></iframe>` : ''}
                        </div>
                    </div>
                `;
            case 'quiz':
                return `
                    <div class="quiz-editor">
                        <div id="questionsList">
                            ${(lesson.questions || []).map((q, i) => this.renderQuizQuestion(q, i)).join('')}
                        </div>
                        <button class="add-item-btn" id="addQuestion">
                            <i class="fas fa-plus"></i> Add Question
                        </button>
                    </div>
                `;
            default:
                return '<p>Unsupported lesson type</p>';
        }
    }

    renderQuizQuestion(question = {}, index) {
        return `
            <div class="quiz-question" data-index="${index}">
                <input type="text" class="question-text" placeholder="Question" value="${question.text || ''}">
                <div class="options-list">
                    ${(question.options || ['', '', '', '']).map((opt, i) => `
                        <div class="option-item">
                            <input type="text" class="option-text" placeholder="Option ${i + 1}" value="${opt}">
                            <input type="radio" name="correct_${index}" value="${i}" ${question.correctAnswer === i ? 'checked' : ''}>
                        </div>
                    `).join('')}
                </div>
                <button class="delete-question"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }

    getQuizQuestions() {
        const questions = [];
        document.querySelectorAll('.quiz-question').forEach(questionEl => {
            const question = {
                text: questionEl.querySelector('.question-text').value,
                options: Array.from(questionEl.querySelectorAll('.option-text')).map(opt => opt.value),
                correctAnswer: parseInt(questionEl.querySelector('input[type="radio"]:checked')?.value || 0)
            };
            questions.push(question);
        });
        return questions;
    }
}
