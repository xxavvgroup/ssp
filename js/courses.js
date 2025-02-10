import { db, auth } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    doc, 
    getDoc, 
    updateDoc, 
    arrayUnion, 
    addDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

    async updateCourseStats(courseId, rating) {
        try {
            const courseRef = doc(db, 'courses', courseId);
            const courseDoc = await getDoc(courseRef);
            const currentStats = courseDoc.data()?.stats || {
                totalReviews: 0,
                averageRating: 0,
                ratingCounts: [0, 0, 0, 0, 0]  // For 1-5 stars
            };

            // Update stats
            const newTotalReviews = currentStats.totalReviews + 1;
            const newAverage = (
                (currentStats.averageRating * currentStats.totalReviews + rating) / 
                newTotalReviews
            ).toFixed(1);

            // Update rating counts
            const ratingCounts = [...currentStats.ratingCounts];
            ratingCounts[rating - 1]++;

            await updateDoc(courseRef, {
                stats: {
                    totalReviews: newTotalReviews,
                    averageRating: parseFloat(newAverage),
                    ratingCounts
                }
            });
        } catch (error) {
            console.error('Error updating course stats:', error);
        }
    }

    async addReview(courseId, reviewData) {
        const user = auth.currentUser;
        if (!user) throw new Error('Must be logged in to review');

        try {
            // Check if user is enrolled in the course
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const enrolledCourses = userDoc.data()?.enrolled || [];
            
            if (!enrolledCourses.includes(courseId)) {
                throw new Error('You must be enrolled in this course to review it');
            }

            // Check for existing review
            const existing = await this.getUserReview(courseId, user.uid);
            if (existing) {
                throw new Error('You have already reviewed this course');
            }

            const courseRef = doc(db, 'courses', courseId);
            const review = {
                ...reviewData,
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL,
                helpful: 0,
                helpfulUsers: []
            };

            await updateDoc(courseRef, {
                reviews: arrayUnion(review)
            });

            // Update course statistics
            await this.updateCourseStats(courseId, review.rating);
            
            return true;
        } catch (error) {
            console.error('Error adding review:', error);
            throw error;
        }
    }

    async getUserReview(courseId, userId) {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        const reviews = courseDoc.data()?.reviews || [];
        return reviews.find(review => review.userId === userId);
    }

    async addReviewReply(courseId, reviewId, reply) {
        const user = auth.currentUser;
        if (!user) throw new Error('Must be logged in to reply');

        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseRef);
        const reviews = courseDoc.data()?.reviews || [];

        const updatedReviews = reviews.map(review => {
            if (review.id === reviewId) {
                return {
                    ...review,
                    reply,
                    replyDate: new Date().toISOString()
                };
            }
            return review;
        });

        await updateDoc(courseRef, { reviews: updatedReviews });
    }

    async markReviewHelpful(courseId, reviewId) {
        const user = auth.currentUser;
        if (!user) throw new Error('Must be logged in');

        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseRef);
        const reviews = courseDoc.data()?.reviews || [];

        const updatedReviews = reviews.map(review => {
            if (review.id === reviewId) {
                return {
                    ...review,
                    helpful: (review.helpful || 0) + 1
                };
            }
            return review;
        });

        await updateDoc(courseRef, { reviews: updatedReviews });
    }

    async addReviewReply(courseId, reviewId, replyContent) {
        try {
            const courseRef = doc(db, 'courses', courseId);
            const courseDoc = await getDoc(courseRef);
            const reviews = courseDoc.data().reviews || [];
            
            const updatedReviews = reviews.map(review => 
                review.id === reviewId ? {
                    ...review,
                    reply: replyContent,
                    replyDate: new Date().toISOString()
                } : review
            );

            await updateDoc(courseRef, { reviews: updatedReviews });
            return true;
        } catch (error) {
            console.error('Error adding review reply:', error);
            throw error;
        }
    }

    async addReviewHelpful(courseId, reviewId, userId) {
        try {
            const courseRef = doc(db, 'courses', courseId);
            const courseDoc = await getDoc(courseRef);
            const reviews = courseDoc.data().reviews || [];
            
            const updatedReviews = reviews.map(review => {
                if (review.id === reviewId && !review.helpfulUsers?.includes(userId)) {
                    return {
                        ...review,
                        helpful: (review.helpful || 0) + 1,
                        helpfulUsers: [...(review.helpfulUsers || []), userId]
                    };
                }
                return review;
            });

            await updateDoc(courseRef, { reviews: updatedReviews });
            return true;
        } catch (error) {
            console.error('Error marking review as helpful:', error);
            throw error;
        }
    }

    async reportReview(courseId, reviewId, reason) {
        try {
            const reportRef = collection(db, 'reportedReviews');
            await addDoc(reportRef, {
                courseId,
                reviewId,
                reason,
                timestamp: new Date().toISOString(),
                status: 'pending'
            });
            return true;
        } catch (error) {
            console.error('Error reporting review:', error);
            throw error;
        }
    }

    isInstructor(courseId) {
        const user = auth.currentUser;
        if (!user) return false;
        
        const course = this.courses.find(c => c.id === courseId);
        return course?.authorId === user.uid;
    }
}
