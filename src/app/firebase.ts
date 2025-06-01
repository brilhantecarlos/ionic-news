import { getAuth } from 'firebase/auth';
import { app } from '../environments/firebase-config';

const auth = getAuth(app);
export { auth };
