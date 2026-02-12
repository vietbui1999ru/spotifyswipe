import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
	userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
	try {
		const token = req.cookies.jwt;
		if (!token) return res.status(401).json({ error: 'No token' });

		const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
		req.userId = decoded.userId;
		next();
	} catch (error) {
		res.status(401).json({ error: 'Invalid token' });
	}
}
