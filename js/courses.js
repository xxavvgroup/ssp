import { db } from './firebase-config.js';
import { collection, getDocs, query, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class CourseManager {
    constructor() {
        this.courses = [];
    }

    async loadCourses() {
        try {
            const coursesQuery = query(collection(db, 'courses'));
            const querySnapshot = await getDocs(coursesQuery);
            
            if (querySnapshot.empty) {
                console.log('No courses found in database');
                return [];
            }

            this.courses = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return this.courses;
        } catch (error) {
            console.error('Error loading courses:', error);
            // Fallback to local data if Firebase fails
            this.courses = [
                {
                    id: 'sample1',
                    title: "Sample Course",
                    description: "This is a sample course (Firebase connection failed)",
                    author: "System",
                    duration: "1 hour",
                    category: "Sample",
                    level: "Beginner"
                }
            ];
            return this.courses;
        }
    }

    async getCourse(id) {
        try {
            const courseDoc = await getDoc(doc(db, 'courses', id));
            if (courseDoc.exists()) {
                return { id: courseDoc.id, ...courseDoc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting course:', error);
            return null;
        }
    }

    getAllCourses() {
        return this.courses;
    }

    getFeaturedCourses() {
        return this.courses.slice(0, 3);
    }
}
