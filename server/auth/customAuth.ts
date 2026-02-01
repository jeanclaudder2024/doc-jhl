import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

// Session configuration
export function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: sessionTtl,
        tableName: "sessions",
    });
    return session({
        secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: sessionTtl,
        },
    });
}

// Setup auth middleware
export async function setupAuth(app: Express) {
    app.set("trust proxy", 1);
    app.use(getSession());
}

// Auth routes
export function registerAuthRoutes(app: Express) {
    // Signup
    app.post("/api/auth/signup", async (req, res) => {
        try {
            const { email, password, firstName, lastName } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }

            // Check if user exists
            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Create user
            const [newUser] = await db.insert(users).values({
                email,
                password: hashedPassword,
                firstName: firstName || null,
                lastName: lastName || null,
            }).returning();

            // Set session
            (req.session as any).userId = newUser.id;
            (req.session as any).user = {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
            };

            res.status(201).json({
                message: "User created successfully",
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                },
            });
        } catch (error) {
            console.error("Signup error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Login
    app.post("/api/auth/login", async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }

            // Find user
            const user = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (!user) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            // Set session
            (req.session as any).userId = user.id;
            (req.session as any).user = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            };

            res.json({
                message: "Login successful",
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
            });
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Logout
    app.post("/api/auth/logout", (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: "Logout failed" });
            }
            res.clearCookie("connect.sid");
            res.json({ message: "Logged out successfully" });
        });
    });

    // Get current user
    app.get("/api/auth/me", (req, res) => {
        const user = (req.session as any).user;
        if (!user) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        res.json({ user });
    });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
    const userId = (req.session as any).userId;

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    next();
};

// Auth storage interface (for compatibility)
export interface IAuthStorage {
    getUser(id: string): Promise<any>;
    upsertUser(user: any): Promise<any>;
}

export const authStorage: IAuthStorage = {
    async getUser(id: string) {
        return await db.query.users.findFirst({
            where: eq(users.id, id),
        });
    },
    async upsertUser(user: any) {
        const existing = await db.query.users.findFirst({
            where: eq(users.id, user.id),
        });
        if (existing) {
            await db.update(users).set(user).where(eq(users.id, user.id));
        } else {
            await db.insert(users).values(user);
        }
        return user;
    },
};
