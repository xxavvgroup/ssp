import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    increment,
    setDoc,
    orderBy,
    limit,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class AdminManager {
    constructor() {
        this.isAdmin = false;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Initialize default documents if they don't exist
            const settingsRef = doc(db, 'settings', 'global');
            const statsRef = doc(db, 'statistics', 'global');
            
            const settingsDoc = await getDoc(settingsRef);
            const statsDoc = await getDoc(statsRef);

            if (!settingsDoc.exists()) {
                await setDoc(settingsRef, this.getDefaultSettings());
            }

            if (!statsDoc.exists()) {
                await setDoc(statsRef, this.getDefaultStats());
            }

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing AdminManager:', error);
        }
    }

    async checkAdminStatus(userId) {
        if (!userId) return false;
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            this.isAdmin = userDoc.data()?.isAdmin || false;
            return this.isAdmin;
        } catch (error) {
            console.error('Admin check error:', error);
            return false;
        }
    }

    async createCourse(courseData) {
        if (!this.isAdmin) throw new Error('Unauthorized');
        try {
            const docRef = await addDoc(collection(db, 'courses'), {
                ...courseData,
                createdAt: new Date().toISOString()
            });
            
            await this.addNotification(
                'success',
                'New Course Created',
                `Course "${courseData.title}" has been added to the platform`
            );
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating course:', error);
            throw error;
        }
    }

    async updateCourse(courseId, courseData) {
        if (!this.isAdmin) throw new Error('Unauthorized');
        try {
            await updateDoc(doc(db, 'courses', courseId), courseData);
            return true;
        } catch (error) {
            console.error('Error updating course:', error);
            throw error;
        }
    }

    async deleteCourse(courseId) {
        if (!this.isAdmin) throw new Error('Unauthorized');
        try {
            await deleteDoc(doc(db, 'courses', courseId));
            return true;
        } catch (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }

    async getStatistics() {
        await this.initialize();
        try {
            const statsRef = doc(db, 'statistics', 'global');
            const stats = await getDoc(statsRef);
            
            // If stats don't exist, initialize them
            if (!stats.exists()) {
                const defaultStats = this.getDefaultStats();
                if (this.isAdmin) {
                    await setDoc(statsRef, defaultStats);
                }
                return defaultStats;
            }
            
            const users = await this.getAllUsers();
            const courses = await getDocs(collection(db, 'courses'));
            
            return {
                totalCourses: courses.size,
                activeUsers: users.filter(user => user.lastActive > Date.now() - 30 * 24 * 60 * 60 * 1000).length,
                totalEnrollments: users.reduce((total, user) => total + (user.enrolled?.length || 0), 0),
                ...stats.data()
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return this.getDefaultStats();
        }
    }

    async updateStatistics(courseId, type, value = 1) {
        try {
            const statRef = doc(db, 'statistics', 'global');
            await updateDoc(statRef, {
                [`courses.${courseId}.${type}`]: increment(value),
                [`total${type}`]: increment(value)
            });
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    async getAllUsers() {
        try {
            const usersSnap = await getDocs(collection(db, 'users'));
            return usersSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    async updateUserRole(userId, isAdmin) {
        if (!this.isAdmin) throw new Error('Unauthorized');
        try {
            await updateDoc(doc(db, 'users', userId), { isAdmin });
            return true;
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }

    async getSettings() {
        await this.initialize();
        try {
            const settings = await getDoc(doc(db, 'settings', 'global'));
            return settings.exists() ? settings.data() : this.getDefaultSettings();
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getDefaultSettings();
        }
    }

    async updateSettings(settings) {
        if (!this.isAdmin) throw new Error('Unauthorized');
        try {
            const settingsRef = doc(db, 'settings', 'global');
            await setDoc(settingsRef, settings, { merge: true });
            
            // Add notification for settings update
            await this.addNotification(
                'info',
                'Settings Updated',
                'System settings have been modified'
            );
            
            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    async getCourseAnalytics(courseId) {
        try {
            const stats = await getDoc(doc(db, 'statistics', 'global'));
            return stats.data()?.courses?.[courseId] || this.getDefaultCourseStats();
        } catch (error) {
            console.error('Error getting course analytics:', error);
            return this.getDefaultCourseStats();
        }
    }

    getDefaultStats() {
        return {
            totalCourses: 0,
            totalEnrollments: 0,
            totalCompletions: 0,
            activeUsers: 0,
            courses: {}
        };
    }

    getDefaultSettings() {
        return {
            allowRegistration: true,
            requireEmailVerification: false,
            defaultLanguage: 'English',
            systemNotifications: true
        };
    }

    getDefaultCourseStats() {
        return {
            views: 0,
            enrollments: 0,
            completions: 0,
            averageRating: 0,
            totalRatings: 0
        };
    }

    async initializeStatistics() {
        try {
            await setDoc(doc(db, 'statistics', 'global'), this.getDefaultStats());
        } catch (error) {
            console.error('Error initializing statistics:', error);
        }
    }

    async addNotification(type, title, message) {
        if (!this.isAdmin) throw new Error('Unauthorized');
        try {
            const notificationRef = await addDoc(collection(db, 'notifications'), {
                type, // 'info', 'warning', 'success'
                title,
                message,
                timestamp: new Date().toISOString(),
                read: false
            });
            return notificationRef.id;
        } catch (error) {
            console.error('Error adding notification:', error);
            throw error;
        }
    }

    async getNotifications() {
        try {
            const q = query(
                collection(db, 'notifications'), 
                orderBy('timestamp', 'desc'),
                limit(20)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    async markNotificationRead(notificationId) {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllNotificationsRead() {
        try {
            const batch = writeBatch(db);
            const unreadNotifications = await getDocs(
                query(collection(db, 'notifications'), where('read', '==', false))
            );
            
            unreadNotifications.docs.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });

            await batch.commit();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    async updateCourseContent(courseId, content) {
        if (!this.isAdmin) throw new Error('Unauthorized');
        try {
            await updateDoc(doc(db, 'courses', courseId), { content });
            
            await this.addNotification(
                'success',
                'Course Content Updated',
                'Course content has been successfully updated'
            );
            
            return true;
        } catch (error) {
            console.error('Error updating course content:', error);
            throw error;
        }
    }
}
