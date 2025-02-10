import { CourseManager } from './courses.js';
import { Auth } from './auth.js';
import { auth } from './firebase-config.js';

class CourseDetails {
    constructor() {
        this.courseManager = new CourseManager();
        this.auth = new Auth();
        this.courseId = new URLSearchParams(window.location.search).get('id');
        this.isMobile = window.innerWidth <= 768;

        // Define handleResize first
        this.handleResize = () => {
            this.isMobile = window.innerWidth <= 768;
            this.updateLayoutForMobile();
        };

        this.initialize();
    }

    async initialize() {
        await this.courseManager.loadCourses();
        const course = await this.courseManager.getCourse(this.courseId);
        
        if (!course) {
            window.location.href = '/404.html';
            return;
        }

        document.title = `${course.title} - xG SSP`;
        this.renderCourse(course);
        this.setupEventListeners(course);
        this.setupMobileOptimizations();
    }

    async renderCourse(course) {
        // Update breadcrumb
        document.getElementById('categoryBreadcrumb').textContent = course.category;

        // Render preview section
        document.querySelector('.course-preview').innerHTML = `
            <div class="preview-image">
                <img src="${course.thumbnail || 'https://via.placeholder.com/1200x600'}" alt="${course.title}">
            </div>
            ${course.videoPreview ? `
                <button class="preview-video-btn">
                    <i class="fas fa-play-circle"></i> Watch Preview
                </button>
            ` : ''}
        `;

        // Render course info
        document.querySelector('.course-info').innerHTML = `
            <h1 class="course-title">${course.title}</h1>
            <div class="course-stats">
                <div class="stat-item">
                    <i class="fas fa-users"></i>
                    <span>${course.enrollmentCount || 0} students</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
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
            <div class="course-description">
                ${course.description}
            </div>
        `;

        // Render enrollment card
        document.querySelector('.course-enrollment').innerHTML = this.renderEnrollmentCard(course);

        // Render tab contents
        document.getElementById('overviewTab').innerHTML = this.renderOverviewTab(course);
        document.getElementById('curriculumTab').innerHTML = this.renderCurriculum(course.content);
        document.getElementById('instructorTab').innerHTML = this.renderInstructorTab(course);
        
        // Handle reviews tab separately since it contains async content
        const reviewsHtml = await this.renderReviewsTab(course);
        document.getElementById('reviewsTab').innerHTML = reviewsHtml;

        // Setup tab functionality
        this.setupTabs();
        this.setupReviewSystem();
        this.setupReviewInteractions();
    }

    renderCourseDetails(course) {
        const defaultValues = {
            author: 'xxavvGroup',
            authorTitle: 'xxavvGroup Course Instructor',
            authorBio: 'Professional instructor from xxavvGroup with expertise in creative education.',
            videoHours: '0',
            resources: '0',
            learningObjectives: [],
            content: { sections: [] }
        };

        // Merge default values with course data
        course = { ...defaultValues, ...course };

        return `
            <div class="course-layout">
                <div class="course-main">
                    <section class="course-description">
                        <h2>About This Course</h2>
                        <div class="rich-text">
                            ${course.longDescription || course.description}
                        </div>
                    </section>

                    <section class="course-objectives">
                        <h2>What You'll Learn</h2>
                        <ul class="objectives-list">
                            ${course.learningObjectives.map(obj => `
                                <li><i class="fas fa-check"></i>${obj}</li>
                            `).join('')}
                        </ul>
                    </section>

                    <section class="course-curriculum">
                        <h2>Course Content</h2>
                        ${this.renderCurriculum(course.content)}
                    </section>

                    <section class="course-instructor">
                        <h2>Your Instructor</h2>
                        <div class="instructor-card">
                            <div class="instructor-avatar">
                                ${course.authorAvatar ? 
                                    `<img src="${course.authorAvatar}" alt="${course.author}">` :
                                    `<div class="avatar-placeholder">${course.author.charAt(0)}</div>`
                                }
                            </div>
                            <div class="instructor-info">
                                <h3>${course.author}</h3>
                                <p class="instructor-title">${course.authorTitle}</p>
                                <p class="instructor-bio">${course.authorBio}</p>
                            </div>
                        </div>
                    </section>
                </div>

                <aside class="course-sidebar">
                    <div class="enrollment-card">
                        <div class="price-tag">
                            ${course.price ? 
                                `<span class="price">$${course.price}</span>` :
                                '<span class="price free">Free</span>'
                            }
                        </div>
                        <button class="enroll-btn primary-button" id="enrollButton">
                            Enroll Now
                        </button>
                        <div class="course-includes">
                            <h3>This course includes:</h3>
                            <ul>
                                <li>
                                    <i class="fas fa-video"></i>
                                    <span>${course.videoHours} hours on-demand video</span>
                                </li>
                                <li>
                                    <i class="fas fa-file"></i>
                                    <span>${course.resources} downloadable resources</span>
                                </li>
                                <li>
                                    <i class="fas fa-infinity"></i>
                                    <span>Full lifetime access</span>
                                </li>
                                <li>
                                    <i class="fas fa-certificate"></i>
                                    <span>Certificate of completion</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>
        `;
    }

    renderCurriculum(content) {
        if (!content?.sections?.length) {
            return '<p>Course curriculum is being updated...</p>';
        }

        return `
            <div class="curriculum-sections">
                ${content.sections.map((section, index) => `
                    <div class="curriculum-section">
                        <div class="section-header">
                            <h3>${section.title}</h3>
                            <span class="section-meta">
                                ${section.lessons.length} lessons
                            </span>
                        </div>
                        <div class="section-lessons">
                            ${section.lessons.map((lesson, lessonIndex) => `
                                <div class="lesson-item">
                                    <div class="lesson-icon">
                                        <i class="fas fa-${
                                            lesson.type === 'video' ? 'play-circle' :
                                            lesson.type === 'quiz' ? 'question-circle' :
                                            'file-alt'
                                        }"></i>
                                    </div>
                                    <div class="lesson-info">
                                        <span class="lesson-title">${lesson.title}</span>
                                        ${lesson.duration ? 
                                            `<span class="lesson-duration">${lesson.duration}</span>` : 
                                            ''
                                        }
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupEventListeners(course) {
        // Handle enrollment and other interactions
        document.querySelectorAll('.enroll-btn').forEach(button => {
            button.addEventListener('click', () => this.handleEnroll(course.id));
        });
    }

    async handleEnroll(courseId) {
        if (!this.auth.isLoggedIn()) {
            window.location.href = '/login.html';
            return;
        }
        
        if (await this.auth.enrollCourse(courseId)) {
            alert('Successfully enrolled!');
        } else {
            alert('Already enrolled in this course');
        }
    }

    setupMobileOptimizations() {
        // Handle window resize
        window.addEventListener('resize', this.handleResize);

        // Handle section toggling on mobile
        document.addEventListener('click', (e) => {
            if (this.isMobile && e.target.closest('.section-header')) {
                const section = e.target.closest('.curriculum-section');
                const lessons = section.querySelector('.section-lessons');
                
                if (lessons.style.display === 'none') {
                    lessons.style.display = 'block';
                    section.classList.add('active');
                } else {
                    lessons.style.display = 'none';
                    section.classList.remove('active');
                }
            }
        });

        // Add smooth scrolling for mobile
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const element = document.querySelector(anchor.getAttribute('href'));
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Handle mobile landscape orientation
        if (this.isMobile) {
            this.handleOrientationChange();
            window.addEventListener('orientationchange', () => {
                this.handleOrientationChange();
            });
        }

        // Improve sticky enrollment card behavior
        if (this.isMobile) {
            const enrollCard = document.querySelector('.enrollment-card');
            const header = document.querySelector('.course-header');
            
            if (enrollCard && header) {
                let lastScroll = window.scrollY;
                const handleScroll = () => {
                    const currentScroll = window.scrollY;
                    const headerBottom = header.offsetTop + header.offsetHeight;
                    
                    if (currentScroll > headerBottom) {
                        enrollCard.classList.add('sticky-mobile');
                    } else {
                        enrollCard.classList.remove('sticky-mobile');
                    }
                    
                    lastScroll = currentScroll;
                };

                window.addEventListener('scroll', handleScroll, { passive: true });
                handleScroll(); // Check initial position
            }
        }
    }

    handleOrientationChange() {
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        document.documentElement.style.setProperty(
            '--vh', 
            `${window.innerHeight * 0.01}px`
        );
        
        // Adjust sticky behavior for landscape mode
        const enrollCard = document.querySelector('.enrollment-card');
        if (enrollCard) {
            enrollCard.classList.toggle('landscape', isLandscape);
        }
    }

    updateLayoutForMobile() {
        if (this.isMobile) {
            // Collapse all sections initially
            document.querySelectorAll('.section-lessons').forEach(section => {
                section.style.display = 'none';
            });

            // Show sticky enrollment card when scrolled past header
            const header = document.querySelector('.course-header');
            const enrollCard = document.querySelector('.enrollment-card');

            if (header && enrollCard) {
                const observer = new IntersectionObserver(
                    ([entry]) => {
                        enrollCard.classList.toggle('sticky', !entry.isIntersecting);
                    },
                    { threshold: 0 }
                );
                observer.observe(header);
            }
        }
    }

    renderEnrollmentCard(course) {
        return `
            <div class="enrollment-card">
                <div class="price-tag">
                    ${course.price ? 
                        `<span class="price">$${course.price}</span>` :
                        '<span class="price free">Free</span>'
                    }
                </div>
                <button class="enroll-btn primary-button" id="enrollButton">
                    Enroll Now
                </button>
                <div class="course-includes">
                    <h3>This course includes:</h3>
                    <ul>
                        <li>
                            <i class="fas fa-video"></i>
                            <span>${course.videoHours || '0'} hours on-demand video</span>
                        </li>
                        <li>
                            <i class="fas fa-file"></i>
                            <span>${course.resources || '0'} downloadable resources</span>
                        </li>
                        <li>
                            <i class="fas fa-infinity"></i>
                            <span>Full lifetime access</span>
                        </li>
                        <li>
                            <i class="fas fa-certificate"></i>
                            <span>Certificate of completion</span>
                        </li>
                    </ul>
                </div>
            </div>
        `;
    }

    renderOverviewTab(course) {
        return `
            <div class="course-overview-content">
                <section class="course-description">
                    <h3>About This Course</h3>
                    <div class="rich-text">
                        ${course.longDescription || course.description}
                    </div>
                </section>

                <section class="course-objectives">
                    <h3>What You'll Learn</h3>
                    <ul class="objectives-list">
                        ${(course.learningObjectives || []).map(obj => `
                            <li><i class="fas fa-check"></i>${obj}</li>
                        `).join('')}
                    </ul>
                </section>

                <section class="course-requirements">
                    <h3>Requirements</h3>
                    <ul class="requirements-list">
                        ${(course.requirements || ['No prior experience needed']).map(req => `
                            <li><i class="fas fa-circle"></i>${req}</li>
                        `).join('')}
                    </ul>
                </section>
            </div>
        `;
    }

    renderInstructorTab(course) {
        // Set defaults with fallbacks for all required fields
        const defaultInstructor = {
            author: 'Instructor',  // Changed from xxavvGroup to ensure we have a value
            authorInitial: 'I',    // Added explicit initial
            authorTitle: 'Course Instructor',
            authorAvatar: null,
            authorBio: 'Professional instructor with expertise in the subject matter.',
            instructorStudents: '0',
            instructorCourses: '1',
            instructorRating: '5.0'
        };

        // Merge defaults with course data and compute initial
        const instructor = {
            ...defaultInstructor,
            ...course,
            authorInitial: (course.author?.[0] || defaultInstructor.authorInitial)
        };

        return `
            <div class="instructor-profile">
                <div class="instructor-header">
                    <div class="instructor-avatar">
                        ${instructor.authorAvatar ? 
                            `<img src="${instructor.authorAvatar}" alt="${instructor.author}">` :
                            `<div class="avatar-placeholder">${instructor.authorInitial}</div>`
                        }
                    </div>
                    <div class="instructor-info">
                        <h3>${instructor.author}</h3>
                        <p class="instructor-title">${instructor.authorTitle}</p>
                    </div>
                </div>
                <div class="instructor-stats">
                    <div class="stat">
                        <i class="fas fa-users"></i>
                        <span>${instructor.instructorStudents} Students</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-book"></i>
                        <span>${instructor.instructorCourses} Course</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-star"></i>
                        <span>${instructor.instructorRating} Rating</span>
                    </div>
                </div>
                <div class="instructor-bio">
                    ${instructor.authorBio}
                </div>
            </div>
        `;
    }

    async renderReviewsTab(course) {
        const reviews = course.reviews || [];
        const averageRating = reviews.length ? 
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
        
        const ratingCounts = Array(5).fill(0);
        reviews.forEach(r => ratingCounts[r.rating - 1]++);

        const reviewForm = await this.renderReviewForm();
        const isInstructorOrAdmin = await this.isInstructorOrAdmin();

        return `
            <div class="course-reviews">
                <div class="review-guidelines">
                    <i class="fas fa-info-circle"></i>
                    Reviews are public and include your account name. Please follow our community guidelines and keep reviews focused on the course content.
                </div>

                <div class="reviews-header">
                    <div class="reviews-stats">
                        <div class="review-rating-large">${averageRating}</div>
                        <div class="rating-distribution">
                            ${ratingCounts.reverse().map((count, i) => {
                                const percent = reviews.length ? (count / reviews.length * 100) : 0;
                                return `
                                    <div class="rating-bar">
                                        <span>${5 - i} stars</span>
                                        <div class="rating-bar-fill">
                                            <div style="width: ${percent}%"></div>
                                        </div>
                                        <span>${count}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="reviews-count">
                        ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}
                    </div>
                </div>

                ${reviewForm}

                <div class="reviews-list">
                    ${reviews.length === 0 ? `
                        <div class="no-reviews">
                            <i class="fas fa-comment-alt"></i>
                            <p>No reviews yet. Be the first to review this course!</p>
                        </div>
                    ` : reviews.map(review => this.renderReviewItem(review, course, isInstructorOrAdmin)).join('')}
                </div>
            </div>
        `;
    }

    async renderReviewForm() {
        const user = this.auth.getUser();
        if (!user) {
            return `
                <div class="review-form">
                    <p>Please <a href="/login.html">log in</a> to leave a review.</p>
                </div>
            `;
        }

        const existingReview = await this.courseManager.getUserReview(this.courseId, user.uid);
        if (existingReview) {
            return ''; // User has already reviewed
        }

        return `
            <form class="review-form" id="reviewForm">
                <div class="star-rating" id="ratingStars">
                    ${Array(5).fill().map((_, i) => `
                        <i class="far fa-star" data-rating="${i + 1}"></i>
                    `).join('')}
                </div>
                <textarea 
                    placeholder="Share your experience with this course... (min. 20 characters)"
                    required
                    minlength="20"
                    maxlength="1000"
                ></textarea>
                <div class="review-form-footer">
                    <span class="review-guidelines-link">
                        <i class="fas fa-exclamation-circle"></i>
                        Community Guidelines
                    </span>
                    <button type="submit" class="primary-button" disabled>
                        Submit Review
                    </button>
                </div>
            </form>
        `;
    }

    renderReviewItem(review, course, isInstructorOrAdmin) {
        const replyBadge = review.replyAuthorType === 'admin' ? 
            '<span class="admin-badge">Admin</span>' : 
            '<span class="instructor-badge">Instructor</span>';

        const replyAvatar = review.replyAuthorAvatar || 
            (review.replyAuthorType === 'admin' ? '/images/admin-avatar.png' : '/images/instructor-avatar.png');

        return `
            <div class="review-item" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">
                            ${review.userAvatar ? 
                                `<img src="${review.userAvatar}" alt="${review.userName}">` :
                                `<div class="avatar-placeholder">${review.userName[0]}</div>`
                            }
                        </div>
                        <div class="reviewer-details">
                            <h4>${review.userName}
                                ${review.isInstructor ? '<span class="instructor-badge">Instructor</span>' : ''}
                            </h4>
                            <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="review-rating">
                        ${Array(5).fill().map((_, i) => `
                            <i class="fas fa-star ${i < review.rating ? 'filled' : ''}"></i>
                        `).join('')}
                    </div>
                </div>
                <div class="review-content">${review.content}</div>
                <div class="review-actions">
                    ${isInstructorOrAdmin ? `
                        <button class="reply-btn" data-review-id="${review.id}">
                            <i class="fas fa-reply"></i> Reply as ${this.auth.isAdmin() ? 'Admin' : 'Instructor'}
                        </button>
                    ` : ''}
                    <button class="helpful-btn ${review.helpfulUsers?.includes(this.auth.getUser()?.uid) ? 'disabled' : ''}">
                        <i class="fas fa-thumbs-up"></i> Helpful (${review.helpful || 0})
                    </button>
                </div>
                ${review.reply ? `
                    <div class="review-reply">
                        <div class="reviewer-info">
                            <div class="reviewer-avatar">
                                <img src="${replyAvatar}" alt="${review.replyAuthorName}">
                            </div>
                            <div class="reviewer-details">
                                <h4>${review.replyAuthorName} ${replyBadge}</h4>
                                <span class="review-date">${new Date(review.replyDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="review-content">${review.reply}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async addReviewReply(courseId, reviewId, content) {
        const user = this.auth.getUser();
        if (!user) throw new Error('Must be logged in to reply');

        const isAdmin = await this.auth.isAdmin();
        const isInstructor = this.courseManager.isInstructor(courseId);

        if (!isAdmin && !isInstructor) {
            throw new Error('Only instructors and admins can reply to reviews');
        }

        const replyData = {
            reply: content,
            replyDate: new Date().toISOString(),
            replyAuthorId: user.uid,
            replyAuthorName: user.displayName || (isAdmin ? 'Admin' : 'Instructor'),
            replyAuthorAvatar: user.photoURL,
            replyAuthorType: isAdmin ? 'admin' : 'instructor'
        };

        await this.courseManager.addReviewReply(courseId, reviewId, replyData);
    }

    setupReviewSystem() {
        // Star rating interaction
        const stars = document.querySelectorAll('#ratingStars i');
        let currentRating = 0;

        stars.forEach(star => {
            star.addEventListener('mouseover', function() {
                const rating = this.dataset.rating;
                stars.forEach((s, index) => {
                    s.className = index < rating ? 'fas fa-star filled' : 'far fa-star';
                });
            });

            star.addEventListener('click', function() {
                currentRating = this.dataset.rating;
                stars.forEach((s, index) => {
                    s.className = index < currentRating ? 'fas fa-star filled' : 'far fa-star';
                });
                document.querySelector('#reviewForm button[type="submit"]').disabled = false;
            });
        });

        // Review form submission
        const form = document.getElementById('reviewForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!currentRating) {
                    alert('Please select a rating');
                    return;
                }

                const content = form.querySelector('textarea').value;
                if (content.length < 20) {
                    alert('Review must be at least 20 characters long');
                    return;
                }

                await this.submitReview({
                    rating: currentRating,
                    content,
                    date: new Date().toISOString()
                });
            });
        }
    }

    async submitReview(reviewData) {
        try {
            await this.courseManager.addReview(this.courseId, {
                ...reviewData,
                id: crypto.randomUUID(),
                userId: this.auth.getUser().uid,
                userName: this.auth.getUser().displayName || 'Anonymous',
                userAvatar: this.auth.getUser().photoURL
            });

            // Refresh the reviews section
            const course = await this.courseManager.getCourse(this.courseId);
            document.getElementById('reviewsTab').innerHTML = await this.renderReviewsTab(course);
            this.setupReviewInteractions();
            this.setupReviewSystem();
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review. Please try again.');
        }
    }

    setupReviewInteractions() {
        // Handle helpful buttons
        document.querySelectorAll('.helpful-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                if (!this.auth.isLoggedIn()) {
                    alert('Please log in to mark reviews as helpful');
                    return;
                }

                if (button.classList.contains('disabled')) {
                    return;
                }

                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                try {
                    await this.courseManager.addReviewHelpful(this.courseId, reviewId, this.auth.getUser().uid);
                    // Get current helpful count and increment it
                    const currentCount = parseInt(button.textContent.match(/\d+/) || [0])[0];
                    button.innerHTML = `<i class="fas fa-thumbs-up"></i> Helpful (${currentCount + 1})`;
                    button.classList.add('disabled');
                } catch (error) {
                    console.error('Error marking review as helpful:', error);
                }
            });
        });

        // Setup reply buttons for instructors
        document.querySelectorAll('.reply-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const reviewItem = e.target.closest('.review-item');
                const reviewId = reviewItem.dataset.reviewId;

                // Create reply form if it doesn't exist
                if (!reviewItem.querySelector('.reply-form')) {
                    const replyForm = document.createElement('div');
                    replyForm.className = 'reply-form';
                    replyForm.innerHTML = `
                        <textarea placeholder="Write your reply..." rows="3"></textarea>
                        <div class="reply-form-actions">
                            <button type="button" class="cancel-reply">Cancel</button>
                            <button type="button" class="submit-reply primary-button">Submit Reply</button>
                        </div>
                    `;
                    reviewItem.appendChild(replyForm);

                    // Handle reply submission
                    replyForm.querySelector('.submit-reply').addEventListener('click', async () => {
                        const content = replyForm.querySelector('textarea').value;
                        if (content.trim().length < 10) {
                            alert('Reply must be at least 10 characters long');
                            return;
                        }

                        try {
                            await this.courseManager.addReviewReply(this.courseId, reviewId, content);
                            // Refresh reviews section
                            const course = await this.courseManager.getCourse(this.courseId);
                            document.getElementById('reviewsTab').innerHTML = await this.renderReviewsTab(course);
                            this.setupReviewInteractions();
                        } catch (error) {
                            console.error('Error submitting reply:', error);
                            alert('Failed to submit reply. Please try again.');
                        }
                    });

                    // Handle cancel
                    replyForm.querySelector('.cancel-reply').addEventListener('click', () => {
                        replyForm.remove();
                    });
                }
            });
        });

        // Setup report buttons
        document.querySelectorAll('.report-review').forEach(button => {
            button.addEventListener('click', async (e) => {
                if (!this.auth.isLoggedIn()) {
                    alert('Please log in to report reviews');
                    return;
                }

                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                const reason = prompt('Please provide a reason for reporting this review:');
                if (reason) {
                    try {
                        await this.courseManager.reportReview(this.courseId, reviewId, reason);
                        alert('Review has been reported. Our team will review it shortly.');
                    } catch (error) {
                        console.error('Error reporting review:', error);
                        alert('Failed to report review. Please try again.');
                    }
                }
            });
        });
    }

    async isInstructorOrAdmin() {
        return (await this.auth.isAdmin()) || this.courseManager.isInstructor(this.courseId);
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab-button');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');

                // Hide all tab contents
                contents.forEach(content => content.classList.add('hidden'));
                // Show selected tab content
                const targetId = tab.getAttribute('data-tab');
                document.getElementById(`${targetId}Tab`).classList.remove('hidden');
            });
        });
    }
}

// Initialize the course details page
const courseDetails = new CourseDetails();