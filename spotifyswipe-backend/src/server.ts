// server.ts (only DB + listen)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI!)
	.then(() => console.log('MongoDB connected are you sure?!'))
	.catch((err: any) => console.error(err));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
