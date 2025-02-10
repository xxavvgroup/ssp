import { CourseManager } from './courses.js';
import { AdminManager } from './admin.js';
import { auth } from './firebase-config.js';

class CourseEditor {
    constructor() {
        this.courseManager = new CourseManager();
        this.admin = new AdminManager();
        this.courseId = new URLSearchParams(window.location.search).get('id');
        this.sections = [];
        
        this.initialize();
    }

    async initialize() {
        // Check authentication and admin status
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '/';
                return;
            }
            
            const isAdmin = await this.admin.checkAdminStatus(user.uid);
            if (!isAdmin) {
                window.location.href = '/';
                return;
            }

            await this.loadCourse();
            this.setupEventListeners();
        });
    }

    async loadCourse() {
        const course = await this.courseManager.getCourse(this.courseId);
        if (!course) {
            window.location.href = '/404.html';
            return;
        }

        document.getElementById('courseTitle').textContent = course.title;
        this.sections = course.content?.sections || [];
        this.renderSections();
    }

    renderSections() {
        const sectionsList = document.getElementById('sectionsList');
        sectionsList.innerHTML = this.sections.map((section, index) => `
            <div class="section-item" data-section="${index}">
                <div class="section-header">
                    <input type="text" class="section-title" value="${section.title}">
                    <button class="delete-section"><i class="fas fa-trash"></i></button>
                </div>
                <div class="lesson-list">
                    ${section.lessons.map((lesson, lessonIndex) => `
                        <div class="lesson-item" data-lesson="${lessonIndex}">
                            <span>${lesson.title}</span>
                            <div class="lesson-actions">
                                <button class="edit-lesson"><i class="fas fa-edit"></i></button>
                                <button class="delete-lesson"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                    <button class="add-lesson" data-section="${index}">
                        <i class="fas fa-plus"></i> Add Lesson
                    </button>
                </div>
            </div>
        `).join('');

        this.attachSectionListeners();
    }

    setupEventListeners() {
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = '/#admin';
        });

        document.getElementById('saveBtn').addEventListener('click', async () => {
            await this.saveCourse();
        });

        document.getElementById('addSectionBtn').addEventListener('click', () => {
            this.sections.push({
                title: 'New Section',
                lessons: []
            });
            this.renderSections();
        });
    }

    async saveCourse() {
        try {
            await this.admin.updateCourseContent(this.courseId, {
                sections: this.sections
            });
            this.showNotification('Course content saved successfully', 'success');
        } catch (error) {
            this.showNotification('Error saving course content', 'error');
        }
    }

    showNotification(message, type) {
        // Implement notification display logic
        alert(message);
    }

    attachSectionListeners() {
        // Section title changes
        document.querySelectorAll('.section-title').forEach(input => {
            input.addEventListener('change', (e) => {
                const sectionIndex = e.target.closest('.section-item').dataset.section;
                this.sections[sectionIndex].title = e.target.value;
            });
        });

        // Delete section buttons
        document.querySelectorAll('.delete-section').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!confirm('Delete this section and all its lessons?')) return;
                const sectionIndex = e.target.closest('.section-item').dataset.section;
                this.sections.splice(sectionIndex, 1);
                this.renderSections();
            });
        });

        // Add lesson buttons
        document.querySelectorAll('.add-lesson').forEach(button => {
            button.addEventListener('click', (e) => {
                const sectionIndex = e.target.dataset.section;
                this.sections[sectionIndex].lessons.push({
                    title: 'New Lesson',
                    type: 'text',
                    content: '',
                    duration: '0:00'
                });
                this.renderSections();
            });
        });

        // Edit lesson buttons
        document.querySelectorAll('.edit-lesson').forEach(button => {
            button.addEventListener('click', (e) => {
                const lessonEl = e.target.closest('.lesson-item');
                const sectionEl = lessonEl.closest('.section-item');
                const sectionIndex = sectionEl.dataset.section;
                const lessonIndex = lessonEl.dataset.lesson;
                
                // Remove active class from all lessons
                document.querySelectorAll('.lesson-item').forEach(item => 
                    item.classList.remove('active'));
                
                // Add active class to selected lesson
                lessonEl.classList.add('active');
                
                this.displayLessonEditor(
                    this.sections[sectionIndex].lessons[lessonIndex],
                    sectionIndex,
                    lessonIndex
                );
            });
        });

        // Delete lesson buttons
        document.querySelectorAll('.delete-lesson').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!confirm('Delete this lesson?')) return;
                const lessonEl = e.target.closest('.lesson-item');
                const sectionEl = lessonEl.closest('.section-item');
                const sectionIndex = sectionEl.dataset.section;
                const lessonIndex = lessonEl.dataset.lesson;
                
                this.sections[sectionIndex].lessons.splice(lessonIndex, 1);
                this.renderSections();
            });
        });
    }

    displayLessonEditor(lesson, sectionIndex, lessonIndex) {
        const editor = document.getElementById('contentEditor');
        editor.innerHTML = `
            <div class="content-editor">
                <div class="editor-toolbar">
                    <select id="lessonType" class="lesson-type">
                        <option value="text" ${lesson.type === 'text' ? 'selected' : ''}>Text</option>
                        <option value="video" ${lesson.type === 'video' ? 'selected' : ''}>Video</option>
                        <option value="quiz" ${lesson.type === 'quiz' ? 'selected' : ''}>Quiz</option>
                    </select>
                    <input type="text" id="lessonTitle" class="lesson-title" 
                           value="${lesson.title}" placeholder="Lesson title">
                    <input type="text" id="lessonDuration" class="lesson-duration"
                           value="${lesson.duration}" placeholder="Duration (e.g., 5:30)">
                </div>
                <div class="editor-content">
                    ${this.getLessonEditorByType(lesson)}
                </div>
                <div class="editor-actions">
                    <button class="secondary-button" id="cancelLessonBtn">Cancel</button>
                    <button class="primary-button" id="saveLessonBtn">Save Lesson</button>
                </div>
            </div>
        `;

        this.attachLessonEditorListeners(lesson, sectionIndex, lessonIndex);
    }

    getLessonEditorByType(lesson) {
        switch (lesson.type) {
            case 'text':
                return `
                    <textarea id="lessonContent" class="lesson-content-text" 
                              rows="20" placeholder="Enter lesson content..."
                    >${lesson.content || ''}</textarea>
                `;
            case 'video':
                return `
                    <div class="video-editor">
                        <input type="url" id="videoUrl" class="lesson-content-video"
                               value="${lesson.videoUrl || ''}" 
                               placeholder="Enter video URL">
                        ${lesson.videoUrl ? `
                            <div class="video-preview">
                                <iframe src="${lesson.videoUrl}" 
                                        frameborder="0" 
                                        allowfullscreen></iframe>
                            </div>
                        ` : ''}
                    </div>
                `;
            case 'quiz':
                return `
                    <div class="quiz-editor">
                        <div id="questionsList">
                            ${(lesson.questions || []).map(this.renderQuizQuestion).join('')}
                        </div>
                        <button id="addQuestionBtn" class="add-item-btn">
                            <i class="fas fa-plus"></i> Add Question
                        </button>
                    </div>
                `;
            default:
                return '<p>Unsupported lesson type</p>';
        }
    }

    attachLessonEditorListeners(lesson, sectionIndex, lessonIndex) {
        // Type change handler
        document.getElementById('lessonType')?.addEventListener('change', (e) => {
            lesson.type = e.target.value;
            document.querySelector('.editor-content').innerHTML = 
                this.getLessonEditorByType(lesson);
        });

        // Save handler
        document.getElementById('saveLessonBtn')?.addEventListener('click', () => {
            lesson.title = document.getElementById('lessonTitle').value;
            lesson.duration = document.getElementById('lessonDuration').value;

            switch (lesson.type) {
                case 'text':
                    lesson.content = document.getElementById('lessonContent').value;
                    break;
                case 'video':
                    lesson.videoUrl = document.getElementById('videoUrl').value;
                    break;
                case 'quiz':
                    lesson.questions = this.collectQuizQuestions();
                    break;
            }

            this.sections[sectionIndex].lessons[lessonIndex] = lesson;
            this.renderSections();
            this.showNotification('Lesson saved successfully', 'success');
        });

        // Cancel handler
        document.getElementById('cancelLessonBtn')?.addEventListener('click', () => {
            document.getElementById('contentEditor').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-edit"></i>
                    <p>Select a lesson to edit its content</p>
                </div>
            `;
        });
    }
}

// Initialize the editor
const editor = new CourseEditor();
