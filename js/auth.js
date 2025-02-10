import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class Auth {
    constructor() {
        this.user = null;
        auth.onAuthStateChanged(user => {
            this.user = user;
        });
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Create user profile in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: email,
                enrolled: []
            });
            return true;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.user = null;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    isLoggedIn() {
        return !!this.user;
    }

    getUser() {
        return this.user;
    }

    async enrollCourse(courseId) {
        if (!this.user) return false;
        
        try {
            const userRef = doc(db, 'users', this.user.uid);
            await updateDoc(userRef, {
                enrolled: arrayUnion(courseId)
            });
            return true;
        } catch (error) {
            console.error('Enrollment error:', error);
            return false;
        }
    }

    async isAdmin() {
        if (!this.user) return false;
        try {
            const userDoc = await getDoc(doc(db, 'users', this.user.uid));
            return userDoc.data()?.isAdmin || false;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }
}
