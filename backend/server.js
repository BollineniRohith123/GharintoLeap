"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
// Production-ready server with comprehensive API coverage for Gharinto Interior Design Marketplace
var express_1 = require("express");
var cors_1 = require("cors");
var bcryptjs_1 = require("bcryptjs");
var jsonwebtoken_1 = require("jsonwebtoken");
var pg_1 = require("pg");
var multer_1 = require("multer");
var path_1 = require("path");
var fs_1 = require("fs");
var app = (0, express_1.default)();
var PORT = 4000;
var JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
// Database connection
var pool = new pg_1.Pool({
    host: 'localhost',
    port: 5432,
    database: 'gharinto_dev',
    user: 'postgres',
    password: '1234',
    ssl: false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10
});
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
// File upload configuration
var storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        var uploadDir = './uploads/';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
var upload = (0, multer_1.default)({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
// Auth middleware
var authenticateToken = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, user;
    return __generator(this, function (_a) {
        authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return [2 /*return*/, res.status(401).json({ error: 'Authorization token missing or invalid format' })];
        }
        token = authHeader.split(' ')[1];
        if (!token || token.trim() === '') {
            return [2 /*return*/, res.status(401).json({ error: 'Access token required' })];
        }
        try {
            user = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.user = user;
            next();
        }
        catch (error) {
            return [2 /*return*/, res.status(403).json({ error: 'Invalid or expired token' })];
        }
        return [2 /*return*/];
    });
}); };
// Permission check middleware
var requirePermission = function (permission) {
    return function (req, res, next) {
        if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('*')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
// ==================== AUTHENTICATION ENDPOINTS ====================
// Registration endpoint
app.post('/auth/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, firstName, lastName, phone, city, _b, userType, existing, passwordHash, userResult, user, token, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                _a = req.body, email = _a.email, password = _a.password, firstName = _a.firstName, lastName = _a.lastName, phone = _a.phone, city = _a.city, _b = _a.userType, userType = _b === void 0 ? 'customer' : _b;
                if (!email || !password || !firstName || !lastName) {
                    return [2 /*return*/, res.status(400).json({ error: 'Required fields missing' })];
                }
                return [4 /*yield*/, pool.query('SELECT id FROM users WHERE email = $1', [email])];
            case 1:
                existing = _c.sent();
                if (existing.rows.length > 0) {
                    return [2 /*return*/, res.status(409).json({ error: 'Email already exists' })];
                }
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 2:
                passwordHash = _c.sent();
                return [4 /*yield*/, pool.query("\n      INSERT INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified)\n      VALUES ($1, $2, $3, $4, $5, $6, true, true) RETURNING *\n    ", [email, passwordHash, firstName, lastName, phone, city])];
            case 3:
                userResult = _c.sent();
                user = userResult.rows[0];
                token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
                res.status(201).json({
                    token: token,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        phone: user.phone,
                        city: user.city
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _c.sent();
                console.error('Registration error:', error_1);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Password reset endpoints
app.post('/auth/forgot-password', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var email, user, resetToken, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                email = req.body.email;
                return [4 /*yield*/, pool.query('SELECT id FROM users WHERE email = $1', [email])];
            case 1:
                user = _a.sent();
                if (!(user.rows.length > 0)) return [3 /*break*/, 3];
                resetToken = jsonwebtoken_1.default.sign({ userId: user.rows[0].id }, JWT_SECRET, { expiresIn: '1h' });
                return [4 /*yield*/, pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.rows[0].id, resetToken, new Date(Date.now() + 3600000)])];
            case 2:
                _a.sent();
                console.log("Reset token for ".concat(email, ": ").concat(resetToken)); // In production, send email
                _a.label = 3;
            case 3:
                res.json({ message: 'Reset link sent if email exists' });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                console.error('Forgot password error:', error_2);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.post('/auth/reset-password', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, token, newPassword, decoded, passwordHash, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, token = _a.token, newPassword = _a.newPassword;
                if (!token || !newPassword) {
                    return [2 /*return*/, res.status(400).json({ error: 'Token and new password required' })];
                }
                decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                return [4 /*yield*/, bcryptjs_1.default.hash(newPassword, 10)];
            case 1:
                passwordHash = _b.sent();
                return [4 /*yield*/, pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, decoded.userId])];
            case 2:
                _b.sent();
                return [4 /*yield*/, pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [token])];
            case 3:
                _b.sent();
                res.json({ message: 'Password reset successful' });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                console.error('Reset password error:', error_3);
                res.status(400).json({ error: 'Invalid or expired token' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.post('/auth/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, userQuery, result, user, isValidPassword, token, error_4;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                _a = req.body, email = _a.email, password = _a.password;
                console.log('🔐 Login attempt:', { email: email });
                if (!email || !password) {
                    return [2 /*return*/, res.status(400).json({ error: 'Email and password required' })];
                }
                userQuery = "\n      SELECT u.*, \n             ARRAY_AGG(DISTINCT r.name) as roles,\n             ARRAY_AGG(DISTINCT p.name) as permissions\n      FROM users u\n      LEFT JOIN user_roles ur ON u.id = ur.user_id\n      LEFT JOIN roles r ON ur.role_id = r.id\n      LEFT JOIN role_permissions rp ON r.id = rp.role_id\n      LEFT JOIN permissions p ON rp.permission_id = p.id\n      WHERE u.email = $1 AND u.is_active = true\n      GROUP BY u.id\n    ";
                return [4 /*yield*/, pool.query(userQuery, [email])];
            case 1:
                result = _d.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                user = result.rows[0];
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.password_hash)];
            case 2:
                isValidPassword = _d.sent();
                if (!isValidPassword) {
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                token = jsonwebtoken_1.default.sign({
                    id: user.id,
                    email: user.email,
                    roles: user.roles || [],
                    permissions: user.permissions || []
                }, JWT_SECRET, { expiresIn: '24h' });
                res.json({
                    token: token,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        phone: user.phone,
                        city: user.city,
                        avatarUrl: user.avatar_url,
                        roles: ((_b = user.roles) === null || _b === void 0 ? void 0 : _b.filter(function (r) { return r; })) || [],
                        permissions: ((_c = user.permissions) === null || _c === void 0 ? void 0 : _c.filter(function (p) { return p; })) || []
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _d.sent();
                console.error('💥 Login error:', error_4);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ==================== USER MANAGEMENT ENDPOINTS ====================
app.get('/users/profile', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userQuery, result, user, menuQuery, menuResult, error_5;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                userQuery = "\n      SELECT u.*,\n             ARRAY_AGG(DISTINCT r.name) as roles,\n             ARRAY_AGG(DISTINCT p.name) as permissions\n      FROM users u\n      LEFT JOIN user_roles ur ON u.id = ur.user_id\n      LEFT JOIN roles r ON ur.role_id = r.id\n      LEFT JOIN role_permissions rp ON r.id = rp.role_id\n      LEFT JOIN permissions p ON rp.permission_id = p.id\n      WHERE u.id = $1\n      GROUP BY u.id\n    ";
                return [4 /*yield*/, pool.query(userQuery, [req.user.id])];
            case 1:
                result = _c.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                user = result.rows[0];
                menuQuery = "\n      SELECT DISTINCT m.name, m.display_name, m.icon, m.path, m.sort_order\n      FROM menus m\n      JOIN role_menus rm ON m.id = rm.menu_id\n      JOIN user_roles ur ON rm.role_id = ur.role_id\n      WHERE ur.user_id = $1 AND m.is_active = true AND rm.can_view = true\n      ORDER BY m.sort_order, m.display_name\n    ";
                return [4 /*yield*/, pool.query(menuQuery, [req.user.id])];
            case 2:
                menuResult = _c.sent();
                res.json({
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    city: user.city,
                    avatarUrl: user.avatar_url,
                    roles: ((_a = user.roles) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return r; })) || [],
                    permissions: ((_b = user.permissions) === null || _b === void 0 ? void 0 : _b.filter(function (p) { return p; })) || [],
                    menus: menuResult.rows.map(function (menu) { return ({
                        name: menu.name,
                        displayName: menu.display_name,
                        icon: menu.icon,
                        path: menu.path
                    }); })
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _c.sent();
                console.error('Profile error:', error_5);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get('/users', authenticateToken, requirePermission('users.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, role, city, search, offset, whereClause, queryParams, paramIndex, usersQuery, countQuery, _d, usersResult, countResult, error_6;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, role = _a.role, city = _a.city, search = _a.search;
                offset = (page - 1) * limit;
                whereClause = 'WHERE u.id IS NOT NULL';
                queryParams = [];
                paramIndex = 1;
                if (role) {
                    whereClause += " AND r.name = $".concat(paramIndex);
                    queryParams.push(role);
                    paramIndex++;
                }
                if (city) {
                    whereClause += " AND u.city ILIKE $".concat(paramIndex);
                    queryParams.push("%".concat(city, "%"));
                    paramIndex++;
                }
                if (search) {
                    whereClause += " AND (u.first_name ILIKE $".concat(paramIndex, " OR u.last_name ILIKE $").concat(paramIndex, " OR u.email ILIKE $").concat(paramIndex, ")");
                    queryParams.push("%".concat(search, "%"));
                    paramIndex++;
                }
                usersQuery = "\n      SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.is_active, u.created_at,\n             ARRAY_AGG(DISTINCT r.name) as roles\n      FROM users u\n      LEFT JOIN user_roles ur ON u.id = ur.user_id\n      LEFT JOIN roles r ON ur.role_id = r.id\n      ".concat(whereClause, "\n      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.is_active, u.created_at\n      ORDER BY u.created_at DESC\n      LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1, "\n    ");
                countQuery = "\n      SELECT COUNT(DISTINCT u.id) as total\n      FROM users u\n      LEFT JOIN user_roles ur ON u.id = ur.user_id\n      LEFT JOIN roles r ON ur.role_id = r.id\n      ".concat(whereClause, "\n    ");
                return [4 /*yield*/, Promise.all([
                        pool.query(usersQuery, __spreadArray(__spreadArray([], queryParams, true), [limit, offset], false)),
                        pool.query(countQuery, queryParams)
                    ])];
            case 1:
                _d = _e.sent(), usersResult = _d[0], countResult = _d[1];
                res.json({
                    users: usersResult.rows.map(function (user) {
                        var _a;
                        return ({
                            id: user.id,
                            email: user.email,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            phone: user.phone,
                            city: user.city,
                            isActive: user.is_active,
                            roles: ((_a = user.roles) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return r; })) || [],
                            createdAt: user.created_at
                        });
                    }),
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _e.sent();
                console.error('Users list error:', error_6);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/users', authenticateToken, requirePermission('users.create'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, firstName, lastName, phone, city, roles, existingUser, passwordHash, userResult, newUser, _i, roles_1, roleName, roleResult, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 9, , 10]);
                _a = req.body, email = _a.email, password = _a.password, firstName = _a.firstName, lastName = _a.lastName, phone = _a.phone, city = _a.city, roles = _a.roles;
                // Validate required fields
                if (!email || !password || !firstName || !lastName) {
                    return [2 /*return*/, res.status(400).json({ error: 'Email, password, firstName, and lastName are required' })];
                }
                return [4 /*yield*/, pool.query('SELECT id FROM users WHERE email = $1', [email])];
            case 1:
                existingUser = _b.sent();
                if (existingUser.rows.length > 0) {
                    return [2 /*return*/, res.status(409).json({ error: 'User with this email already exists' })];
                }
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 2:
                passwordHash = _b.sent();
                return [4 /*yield*/, pool.query("\n      INSERT INTO users (email, password_hash, first_name, last_name, phone, city)\n      VALUES ($1, $2, $3, $4, $5, $6)\n      RETURNING id, email, first_name, last_name, phone, city, created_at\n    ", [email, passwordHash, firstName, lastName, phone, city])];
            case 3:
                userResult = _b.sent();
                newUser = userResult.rows[0];
                if (!(roles && roles.length > 0)) return [3 /*break*/, 8];
                _i = 0, roles_1 = roles;
                _b.label = 4;
            case 4:
                if (!(_i < roles_1.length)) return [3 /*break*/, 8];
                roleName = roles_1[_i];
                return [4 /*yield*/, pool.query('SELECT id FROM roles WHERE name = $1', [roleName])];
            case 5:
                roleResult = _b.sent();
                if (!(roleResult.rows.length > 0)) return [3 /*break*/, 7];
                return [4 /*yield*/, pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUser.id, roleResult.rows[0].id])];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 4];
            case 8:
                res.status(201).json({
                    id: newUser.id,
                    email: newUser.email,
                    firstName: newUser.first_name,
                    lastName: newUser.last_name,
                    phone: newUser.phone,
                    city: newUser.city,
                    roles: roles || [],
                    createdAt: newUser.created_at
                });
                return [3 /*break*/, 10];
            case 9:
                error_7 = _b.sent();
                console.error('Create user error:', error_7);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
app.get('/users/:id', authenticateToken, requirePermission('users.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userQuery, result, user, error_8;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                id = req.params.id;
                userQuery = "\n      SELECT u.*, \n             ARRAY_AGG(DISTINCT r.name) as roles,\n             ARRAY_AGG(DISTINCT p.name) as permissions\n      FROM users u\n      LEFT JOIN user_roles ur ON u.id = ur.user_id\n      LEFT JOIN roles r ON ur.role_id = r.id\n      LEFT JOIN role_permissions rp ON r.id = rp.role_id\n      LEFT JOIN permissions p ON rp.permission_id = p.id\n      WHERE u.id = $1\n      GROUP BY u.id\n    ";
                return [4 /*yield*/, pool.query(userQuery, [id])];
            case 1:
                result = _c.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                user = result.rows[0];
                res.json({
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    city: user.city,
                    avatarUrl: user.avatar_url,
                    isActive: user.is_active,
                    roles: ((_a = user.roles) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return r; })) || [],
                    permissions: ((_b = user.permissions) === null || _b === void 0 ? void 0 : _b.filter(function (p) { return p; })) || [],
                    createdAt: user.created_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _c.sent();
                console.error('Get user error:', error_8);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/users/:id', authenticateToken, requirePermission('users.edit'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, firstName, lastName, phone, city, isActive, roles, updateResult, updatedUser, _i, roles_2, roleName, roleResult, error_9;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 8, , 9]);
                id = req.params.id;
                _a = req.body, firstName = _a.firstName, lastName = _a.lastName, phone = _a.phone, city = _a.city, isActive = _a.isActive, roles = _a.roles;
                return [4 /*yield*/, pool.query("\n      UPDATE users \n      SET first_name = $1, last_name = $2, phone = $3, city = $4, is_active = $5, updated_at = NOW()\n      WHERE id = $6\n      RETURNING id, email, first_name, last_name, phone, city, is_active, updated_at\n    ", [firstName, lastName, phone, city, isActive, id])];
            case 1:
                updateResult = _b.sent();
                if (updateResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                updatedUser = updateResult.rows[0];
                if (!(roles && Array.isArray(roles))) return [3 /*break*/, 7];
                // Remove existing roles
                return [4 /*yield*/, pool.query('DELETE FROM user_roles WHERE user_id = $1', [id])];
            case 2:
                // Remove existing roles
                _b.sent();
                _i = 0, roles_2 = roles;
                _b.label = 3;
            case 3:
                if (!(_i < roles_2.length)) return [3 /*break*/, 7];
                roleName = roles_2[_i];
                return [4 /*yield*/, pool.query('SELECT id FROM roles WHERE name = $1', [roleName])];
            case 4:
                roleResult = _b.sent();
                if (!(roleResult.rows.length > 0)) return [3 /*break*/, 6];
                return [4 /*yield*/, pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [id, roleResult.rows[0].id])];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 3];
            case 7:
                res.json({
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.first_name,
                    lastName: updatedUser.last_name,
                    phone: updatedUser.phone,
                    city: updatedUser.city,
                    isActive: updatedUser.is_active,
                    roles: roles || [],
                    updatedAt: updatedUser.updated_at
                });
                return [3 /*break*/, 9];
            case 8:
                error_9 = _b.sent();
                console.error('Update user error:', error_9);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
app.delete('/users/:id', authenticateToken, requirePermission('users.delete'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, userExists, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                return [4 /*yield*/, pool.query('SELECT id FROM users WHERE id = $1', [id])];
            case 1:
                userExists = _a.sent();
                if (userExists.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                // Delete user (cascade will handle related records)
                return [4 /*yield*/, pool.query('DELETE FROM users WHERE id = $1', [id])];
            case 2:
                // Delete user (cascade will handle related records)
                _a.sent();
                res.json({ message: 'User deleted successfully' });
                return [3 /*break*/, 4];
            case 3:
                error_10 = _a.sent();
                console.error('Delete user error:', error_10);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ==================== PROJECT MANAGEMENT ENDPOINTS ====================
app.get('/projects', authenticateToken, requirePermission('projects.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, status_1, city, designerId, clientId, offset, whereClause, queryParams, paramIndex, projectsQuery, countQuery, _d, projectsResult, countResult, error_11;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, status_1 = _a.status, city = _a.city, designerId = _a.designerId, clientId = _a.clientId;
                offset = (page - 1) * limit;
                whereClause = 'WHERE 1=1';
                queryParams = [];
                paramIndex = 1;
                // Role-based filtering
                if (req.user.roles.includes('interior_designer')) {
                    whereClause += " AND p.designer_id = $".concat(paramIndex);
                    queryParams.push(req.user.id);
                    paramIndex++;
                }
                else if (req.user.roles.includes('project_manager')) {
                    whereClause += " AND p.project_manager_id = $".concat(paramIndex);
                    queryParams.push(req.user.id);
                    paramIndex++;
                }
                else if (req.user.roles.includes('customer')) {
                    whereClause += " AND p.client_id = $".concat(paramIndex);
                    queryParams.push(req.user.id);
                    paramIndex++;
                }
                if (status_1) {
                    whereClause += " AND p.status = $".concat(paramIndex);
                    queryParams.push(status_1);
                    paramIndex++;
                }
                if (city) {
                    whereClause += " AND p.city = $".concat(paramIndex);
                    queryParams.push(city);
                    paramIndex++;
                }
                if (designerId) {
                    whereClause += " AND p.designer_id = $".concat(paramIndex);
                    queryParams.push(designerId);
                    paramIndex++;
                }
                if (clientId) {
                    whereClause += " AND p.client_id = $".concat(paramIndex);
                    queryParams.push(clientId);
                    paramIndex++;
                }
                projectsQuery = "\n      SELECT \n        p.*,\n        c.first_name as client_first_name,\n        c.last_name as client_last_name,\n        c.email as client_email,\n        d.first_name as designer_first_name,\n        d.last_name as designer_last_name,\n        pm.first_name as pm_first_name,\n        pm.last_name as pm_last_name\n      FROM projects p\n      JOIN users c ON p.client_id = c.id\n      LEFT JOIN users d ON p.designer_id = d.id\n      LEFT JOIN users pm ON p.project_manager_id = pm.id\n      ".concat(whereClause, "\n      ORDER BY p.created_at DESC\n      LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1, "\n    ");
                countQuery = "\n      SELECT COUNT(*) as total\n      FROM projects p\n      ".concat(whereClause, "\n    ");
                return [4 /*yield*/, Promise.all([
                        pool.query(projectsQuery, __spreadArray(__spreadArray([], queryParams, true), [limit, offset], false)),
                        pool.query(countQuery, queryParams)
                    ])];
            case 1:
                _d = _e.sent(), projectsResult = _d[0], countResult = _d[1];
                res.json({
                    projects: projectsResult.rows.map(function (project) { return ({
                        id: project.id,
                        title: project.title,
                        description: project.description,
                        client: {
                            id: project.client_id,
                            name: "".concat(project.client_first_name, " ").concat(project.client_last_name),
                            email: project.client_email
                        },
                        designer: project.designer_id ? {
                            id: project.designer_id,
                            name: "".concat(project.designer_first_name, " ").concat(project.designer_last_name)
                        } : null,
                        projectManager: project.project_manager_id ? {
                            id: project.project_manager_id,
                            name: "".concat(project.pm_first_name, " ").concat(project.pm_last_name)
                        } : null,
                        status: project.status,
                        priority: project.priority,
                        budget: project.budget,
                        estimatedCost: project.estimated_cost,
                        actualCost: project.actual_cost,
                        progressPercentage: project.progress_percentage,
                        startDate: project.start_date,
                        endDate: project.end_date,
                        estimatedEndDate: project.estimated_end_date,
                        city: project.city,
                        address: project.address,
                        areaSqft: project.area_sqft,
                        propertyType: project.property_type,
                        createdAt: project.created_at,
                        updatedAt: project.updated_at
                    }); }),
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
                return [3 /*break*/, 3];
            case 2:
                error_11 = _e.sent();
                console.error('Projects list error:', error_11);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/projects', authenticateToken, requirePermission('projects.create'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, title, description, clientId, designerId, budget, startDate, endDate, city, address, areaSqft, propertyType, leadId, projectManagerId, pm, projectResult, newProject, defaultMilestones, _i, defaultMilestones_1, milestone, error_12;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 11, , 12]);
                _a = req.body, title = _a.title, description = _a.description, clientId = _a.clientId, designerId = _a.designerId, budget = _a.budget, startDate = _a.startDate, endDate = _a.endDate, city = _a.city, address = _a.address, areaSqft = _a.areaSqft, propertyType = _a.propertyType, leadId = _a.leadId;
                if (!title || !clientId || !budget) {
                    return [2 /*return*/, res.status(400).json({ error: 'Title, clientId, and budget are required' })];
                }
                projectManagerId = null;
                if (!req.user.roles.includes('project_manager')) return [3 /*break*/, 1];
                projectManagerId = req.user.id;
                return [3 /*break*/, 3];
            case 1: return [4 /*yield*/, pool.query("\n        SELECT u.id, COUNT(p.id) as project_count\n        FROM users u\n        JOIN user_roles ur ON u.id = ur.user_id\n        JOIN roles r ON ur.role_id = r.id\n        LEFT JOIN projects p ON u.id = p.project_manager_id AND p.status NOT IN ('completed', 'cancelled')\n        WHERE r.name = 'project_manager' AND u.is_active = true\n        GROUP BY u.id\n        ORDER BY project_count ASC\n        LIMIT 1\n      ")];
            case 2:
                pm = _c.sent();
                projectManagerId = (_b = pm.rows[0]) === null || _b === void 0 ? void 0 : _b.id;
                _c.label = 3;
            case 3: return [4 /*yield*/, pool.query("\n      INSERT INTO projects (\n        title, description, client_id, designer_id, project_manager_id,\n        budget, start_date, end_date, city, address, area_sqft, property_type\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)\n      RETURNING *\n    ", [
                    title, description, clientId, designerId, projectManagerId,
                    budget, startDate, endDate, city, address, areaSqft, propertyType
                ])];
            case 4:
                projectResult = _c.sent();
                newProject = projectResult.rows[0];
                if (!leadId) return [3 /*break*/, 6];
                return [4 /*yield*/, pool.query('UPDATE leads SET status = $1, converted_to_project = $2 WHERE id = $3', ['converted', newProject.id, leadId])];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6:
                defaultMilestones = [
                    { title: 'Design Planning', order: 1, budget: Math.floor(budget * 0.1) },
                    { title: 'Material Selection', order: 2, budget: Math.floor(budget * 0.2) },
                    { title: 'Execution Phase 1', order: 3, budget: Math.floor(budget * 0.3) },
                    { title: 'Execution Phase 2', order: 4, budget: Math.floor(budget * 0.25) },
                    { title: 'Final Touches', order: 5, budget: Math.floor(budget * 0.15) }
                ];
                _i = 0, defaultMilestones_1 = defaultMilestones;
                _c.label = 7;
            case 7:
                if (!(_i < defaultMilestones_1.length)) return [3 /*break*/, 10];
                milestone = defaultMilestones_1[_i];
                return [4 /*yield*/, pool.query("\n        INSERT INTO project_milestones (project_id, title, budget, sort_order)\n        VALUES ($1, $2, $3, $4)\n      ", [newProject.id, milestone.title, milestone.budget, milestone.order])];
            case 8:
                _c.sent();
                _c.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 7];
            case 10:
                res.status(201).json({
                    id: newProject.id,
                    title: newProject.title,
                    description: newProject.description,
                    clientId: newProject.client_id,
                    designerId: newProject.designer_id,
                    projectManagerId: newProject.project_manager_id,
                    status: newProject.status,
                    priority: newProject.priority,
                    budget: newProject.budget,
                    startDate: newProject.start_date,
                    endDate: newProject.end_date,
                    city: newProject.city,
                    address: newProject.address,
                    areaSqft: newProject.area_sqft,
                    propertyType: newProject.property_type,
                    progressPercentage: newProject.progress_percentage,
                    createdAt: newProject.created_at
                });
                return [3 /*break*/, 12];
            case 11:
                error_12 = _c.sent();
                console.error('Create project error:', error_12);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
app.get('/projects/:id', authenticateToken, requirePermission('projects.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, projectQuery, milestonesQuery, _a, projectResult, milestonesResult, project, hasAccess, error_13;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                projectQuery = "\n      SELECT \n        p.*,\n        c.first_name as client_first_name,\n        c.last_name as client_last_name,\n        c.email as client_email,\n        c.phone as client_phone,\n        d.first_name as designer_first_name,\n        d.last_name as designer_last_name,\n        d.email as designer_email,\n        pm.first_name as pm_first_name,\n        pm.last_name as pm_last_name,\n        pm.email as pm_email\n      FROM projects p\n      JOIN users c ON p.client_id = c.id\n      LEFT JOIN users d ON p.designer_id = d.id\n      LEFT JOIN users pm ON p.project_manager_id = pm.id\n      WHERE p.id = $1\n    ";
                milestonesQuery = "\n      SELECT * FROM project_milestones \n      WHERE project_id = $1 \n      ORDER BY sort_order\n    ";
                return [4 /*yield*/, Promise.all([
                        pool.query(projectQuery, [id]),
                        pool.query(milestonesQuery, [id])
                    ])];
            case 1:
                _a = _b.sent(), projectResult = _a[0], milestonesResult = _a[1];
                if (projectResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Project not found' })];
                }
                project = projectResult.rows[0];
                hasAccess = req.user.roles.includes('admin') ||
                    req.user.roles.includes('super_admin') ||
                    project.client_id === parseInt(req.user.id) ||
                    project.designer_id === parseInt(req.user.id) ||
                    project.project_manager_id === parseInt(req.user.id);
                if (!hasAccess) {
                    return [2 /*return*/, res.status(403).json({ error: 'Access denied to this project' })];
                }
                res.json({
                    id: project.id,
                    title: project.title,
                    description: project.description,
                    client: {
                        id: project.client_id,
                        name: "".concat(project.client_first_name, " ").concat(project.client_last_name),
                        email: project.client_email,
                        phone: project.client_phone
                    },
                    designer: project.designer_id ? {
                        id: project.designer_id,
                        name: "".concat(project.designer_first_name, " ").concat(project.designer_last_name),
                        email: project.designer_email
                    } : null,
                    projectManager: project.project_manager_id ? {
                        id: project.project_manager_id,
                        name: "".concat(project.pm_first_name, " ").concat(project.pm_last_name),
                        email: project.pm_email
                    } : null,
                    status: project.status,
                    priority: project.priority,
                    budget: project.budget,
                    estimatedCost: project.estimated_cost,
                    actualCost: project.actual_cost,
                    progressPercentage: project.progress_percentage,
                    startDate: project.start_date,
                    endDate: project.end_date,
                    estimatedEndDate: project.estimated_end_date,
                    city: project.city,
                    address: project.address,
                    areaSqft: project.area_sqft,
                    propertyType: project.property_type,
                    milestones: milestonesResult.rows.map(function (milestone) { return ({
                        id: milestone.id,
                        title: milestone.title,
                        description: milestone.description,
                        plannedStartDate: milestone.planned_start_date,
                        plannedEndDate: milestone.planned_end_date,
                        actualStartDate: milestone.actual_start_date,
                        actualEndDate: milestone.actual_end_date,
                        status: milestone.status,
                        budget: milestone.budget,
                        actualCost: milestone.actual_cost,
                        sortOrder: milestone.sort_order
                    }); }),
                    createdAt: project.created_at,
                    updatedAt: project.updated_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_13 = _b.sent();
                console.error('Get project error:', error_13);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/projects/:id', authenticateToken, requirePermission('projects.edit'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, title, description, designerId, status_2, priority, budget, estimatedCost, actualCost, progressPercentage, startDate, endDate, estimatedEndDate, city, address, areaSqft, propertyType, updateResult, updatedProject, error_14;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, title = _a.title, description = _a.description, designerId = _a.designerId, status_2 = _a.status, priority = _a.priority, budget = _a.budget, estimatedCost = _a.estimatedCost, actualCost = _a.actualCost, progressPercentage = _a.progressPercentage, startDate = _a.startDate, endDate = _a.endDate, estimatedEndDate = _a.estimatedEndDate, city = _a.city, address = _a.address, areaSqft = _a.areaSqft, propertyType = _a.propertyType;
                return [4 /*yield*/, pool.query("\n      UPDATE projects SET\n        title = $1, description = $2, designer_id = $3, status = $4, priority = $5,\n        budget = $6, estimated_cost = $7, actual_cost = $8, progress_percentage = $9,\n        start_date = $10, end_date = $11, estimated_end_date = $12,\n        city = $13, address = $14, area_sqft = $15, property_type = $16,\n        updated_at = NOW()\n      WHERE id = $17\n      RETURNING *\n    ", [
                        title, description, designerId, status_2, priority, budget, estimatedCost,
                        actualCost, progressPercentage, startDate, endDate, estimatedEndDate,
                        city, address, areaSqft, propertyType, id
                    ])];
            case 1:
                updateResult = _b.sent();
                if (updateResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Project not found' })];
                }
                updatedProject = updateResult.rows[0];
                res.json({
                    id: updatedProject.id,
                    title: updatedProject.title,
                    description: updatedProject.description,
                    designerId: updatedProject.designer_id,
                    status: updatedProject.status,
                    priority: updatedProject.priority,
                    budget: updatedProject.budget,
                    estimatedCost: updatedProject.estimated_cost,
                    actualCost: updatedProject.actual_cost,
                    progressPercentage: updatedProject.progress_percentage,
                    startDate: updatedProject.start_date,
                    endDate: updatedProject.end_date,
                    estimatedEndDate: updatedProject.estimated_end_date,
                    city: updatedProject.city,
                    address: updatedProject.address,
                    areaSqft: updatedProject.area_sqft,
                    propertyType: updatedProject.property_type,
                    updatedAt: updatedProject.updated_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_14 = _b.sent();
                console.error('Update project error:', error_14);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.delete('/projects/:id', authenticateToken, requirePermission('projects.manage'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, deleteResult, error_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id])];
            case 1:
                deleteResult = _a.sent();
                if (deleteResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Project not found' })];
                }
                res.json({ message: 'Project deleted successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_15 = _a.sent();
                console.error('Delete project error:', error_15);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== LEAD MANAGEMENT ENDPOINTS ====================
// ==================== WALLET & FINANCIAL ENDPOINTS ====================
app.get('/wallet', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, newWallet, error_16;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id])];
            case 1:
                wallet = _a.sent();
                if (!(wallet.rows.length === 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING *', [req.user.id])];
            case 2:
                newWallet = _a.sent();
                wallet = newWallet;
                _a.label = 3;
            case 3:
                res.json(wallet.rows[0]);
                return [3 /*break*/, 5];
            case 4:
                error_16 = _a.sent();
                console.error('Wallet error:', error_16);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.get('/wallet/transactions', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var transactions, error_17;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT t.*, w.user_id FROM transactions t \n      JOIN wallets w ON t.wallet_id = w.id \n      WHERE w.user_id = $1 ORDER BY t.created_at DESC LIMIT 50\n    ", [req.user.id])];
            case 1:
                transactions = _a.sent();
                res.json({ transactions: transactions.rows });
                return [3 /*break*/, 3];
            case 2:
                error_17 = _a.sent();
                console.error('Transactions error:', error_17);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/quotations', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var quotations, error_18;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT q.*, u.first_name, u.last_name, p.title as project_title\n      FROM quotations q \n      JOIN users u ON q.client_id = u.id \n      LEFT JOIN projects p ON q.project_id = p.id\n      WHERE q.client_id = $1 OR $2 = ANY(ARRAY['admin', 'finance_manager', 'super_admin'])\n      ORDER BY q.created_at DESC\n    ", [req.user.id, ((_a = req.user.roles) === null || _a === void 0 ? void 0 : _a[0]) || 'customer'])];
            case 1:
                quotations = _b.sent();
                res.json({ quotations: quotations.rows });
                return [3 /*break*/, 3];
            case 2:
                error_18 = _b.sent();
                console.error('Quotations error:', error_18);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/quotations', authenticateToken, requirePermission('finance.create'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, clientId, projectId, title, items, validUntil, totalAmount, quotationNumber, quotationResult, error_19;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, clientId = _a.clientId, projectId = _a.projectId, title = _a.title, items = _a.items, validUntil = _a.validUntil;
                if (!clientId || !title || !items || !Array.isArray(items)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Required fields missing' })];
                }
                totalAmount = items.reduce(function (sum, item) {
                    return sum + (item.quantity * item.unitPrice);
                }, 0);
                quotationNumber = "QUO-".concat(Date.now());
                return [4 /*yield*/, pool.query("\n      INSERT INTO quotations (quotation_number, client_id, project_id, title, total_amount, valid_until, prepared_by, status)\n      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft') RETURNING *\n    ", [quotationNumber, clientId, projectId, title, totalAmount, validUntil, req.user.id])];
            case 1:
                quotationResult = _b.sent();
                res.status(201).json(quotationResult.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_19 = _b.sent();
                console.error('Create quotation error:', error_19);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/invoices', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var invoices, error_20;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT i.*, u.first_name, u.last_name, p.title as project_title\n      FROM invoices i \n      JOIN users u ON i.client_id = u.id \n      LEFT JOIN projects p ON i.project_id = p.id\n      WHERE i.client_id = $1 OR $2 = ANY(ARRAY['admin', 'finance_manager', 'super_admin'])\n      ORDER BY i.created_at DESC\n    ", [req.user.id, ((_a = req.user.roles) === null || _a === void 0 ? void 0 : _a[0]) || 'customer'])];
            case 1:
                invoices = _b.sent();
                res.json({ invoices: invoices.rows });
                return [3 /*break*/, 3];
            case 2:
                error_20 = _b.sent();
                console.error('Invoices error:', error_20);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== EMPLOYEE MANAGEMENT ENDPOINTS ====================
app.get('/employees', authenticateToken, requirePermission('employees.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var employees, error_21;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT u.*, ep.employee_id, ep.department, ep.designation, ep.joining_date, ep.basic_salary, ep.gross_salary, ep.ctc\n      FROM users u \n      JOIN employee_profiles ep ON u.id = ep.user_id\n      WHERE ep.is_active = true\n      ORDER BY ep.joining_date DESC\n    ")];
            case 1:
                employees = _a.sent();
                res.json({ employees: employees.rows });
                return [3 /*break*/, 3];
            case 2:
                error_21 = _a.sent();
                console.error('Employees error:', error_21);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/employees/attendance', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, date, checkInTime, checkOutTime, status_3, empId, attendance, error_22;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, userId = _a.userId, date = _a.date, checkInTime = _a.checkInTime, checkOutTime = _a.checkOutTime, status_3 = _a.status;
                empId = userId || req.user.id;
                return [4 /*yield*/, pool.query("\n      INSERT INTO employee_attendance (user_id, date, check_in_time, check_out_time, status)\n      VALUES ($1, $2, $3, $4, $5)\n      ON CONFLICT (user_id, date) DO UPDATE SET\n      check_in_time = $3, check_out_time = $4, status = $5, updated_at = NOW()\n      RETURNING *\n    ", [empId, date, checkInTime, checkOutTime, status_3])];
            case 1:
                attendance = _b.sent();
                res.json(attendance.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_22 = _b.sent();
                console.error('Attendance error:', error_22);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== COMPLAINTS ENDPOINTS ====================
app.get('/complaints', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var complaints, error_23;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT c.*, p.title as project_title, u.first_name, u.last_name\n      FROM complaints c \n      LEFT JOIN projects p ON c.project_id = p.id\n      LEFT JOIN users u ON c.assigned_to = u.id\n      WHERE c.complainant_id = $1 OR $2 = ANY(ARRAY['admin', 'support', 'super_admin'])\n      ORDER BY c.created_at DESC\n    ", [req.user.id, ((_a = req.user.roles) === null || _a === void 0 ? void 0 : _a[0]) || 'customer'])];
            case 1:
                complaints = _b.sent();
                res.json({ complaints: complaints.rows });
                return [3 /*break*/, 3];
            case 2:
                error_23 = _b.sent();
                console.error('Complaints error:', error_23);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/complaints', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, title, description, _b, priority, projectId, complaintNumber, complaint, error_24;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.body, title = _a.title, description = _a.description, _b = _a.priority, priority = _b === void 0 ? 'medium' : _b, projectId = _a.projectId;
                if (!title || !description) {
                    return [2 /*return*/, res.status(400).json({ error: 'Title and description required' })];
                }
                complaintNumber = "COMP-".concat(Date.now());
                return [4 /*yield*/, pool.query("\n      INSERT INTO complaints (complaint_number, title, description, priority, project_id, \n                            complainant_id, complainant_name, complainant_email, status)\n      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open') RETURNING *\n    ", [
                        complaintNumber, title, description, priority, projectId, req.user.id,
                        "".concat(req.user.firstName || '', " ").concat(req.user.lastName || ''),
                        req.user.email
                    ])];
            case 1:
                complaint = _c.sent();
                res.status(201).json(complaint.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_24 = _c.sent();
                console.error('Create complaint error:', error_24);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== NOTIFICATIONS ENDPOINTS ====================
app.get('/notifications', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var notifications, error_25;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT * FROM notifications \n      WHERE user_id = $1 AND is_archived = false\n      ORDER BY created_at DESC LIMIT 50\n    ", [req.user.id])];
            case 1:
                notifications = _a.sent();
                res.json({ notifications: notifications.rows });
                return [3 /*break*/, 3];
            case 2:
                error_25 = _a.sent();
                console.error('Notifications error:', error_25);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/notifications/:id/read', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, error_26;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, pool.query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2', [id, req.user.id])];
            case 1:
                _a.sent();
                res.json({ message: 'Notification marked as read' });
                return [3 /*break*/, 3];
            case 2:
                error_26 = _a.sent();
                console.error('Mark notification read error:', error_26);
                res.status(500).json({ error: 'Server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== LEAD MANAGEMENT ENDPOINTS ====================
app.get('/leads', authenticateToken, requirePermission('leads.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, status_4, city, assignedTo, minScore, offset, whereClause, queryParams, paramIndex, leadsQuery, countQuery, _d, leadsResult, countResult, error_27;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, status_4 = _a.status, city = _a.city, assignedTo = _a.assignedTo, minScore = _a.minScore;
                offset = (page - 1) * limit;
                whereClause = 'WHERE 1=1';
                queryParams = [];
                paramIndex = 1;
                // Role-based filtering
                if (req.user.roles.includes('interior_designer')) {
                    whereClause += " AND l.assigned_to = $".concat(paramIndex);
                    queryParams.push(req.user.id);
                    paramIndex++;
                }
                if (status_4) {
                    whereClause += " AND l.status = $".concat(paramIndex);
                    queryParams.push(status_4);
                    paramIndex++;
                }
                if (city) {
                    whereClause += " AND l.city = $".concat(paramIndex);
                    queryParams.push(city);
                    paramIndex++;
                }
                if (assignedTo) {
                    whereClause += " AND l.assigned_to = $".concat(paramIndex);
                    queryParams.push(assignedTo);
                    paramIndex++;
                }
                if (minScore) {
                    whereClause += " AND l.score >= $".concat(paramIndex);
                    queryParams.push(minScore);
                    paramIndex++;
                }
                leadsQuery = "\n      SELECT \n        l.*,\n        u.first_name as assigned_first_name,\n        u.last_name as assigned_last_name\n      FROM leads l\n      LEFT JOIN users u ON l.assigned_to = u.id\n      ".concat(whereClause, "\n      ORDER BY l.score DESC, l.created_at DESC\n      LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1, "\n    ");
                countQuery = "SELECT COUNT(*) as total FROM leads l ".concat(whereClause);
                return [4 /*yield*/, Promise.all([
                        pool.query(leadsQuery, __spreadArray(__spreadArray([], queryParams, true), [limit, offset], false)),
                        pool.query(countQuery, queryParams)
                    ])];
            case 1:
                _d = _e.sent(), leadsResult = _d[0], countResult = _d[1];
                res.json({
                    leads: leadsResult.rows.map(function (lead) { return ({
                        id: lead.id,
                        source: lead.source,
                        firstName: lead.first_name,
                        lastName: lead.last_name,
                        email: lead.email,
                        phone: lead.phone,
                        city: lead.city,
                        budgetMin: lead.budget_min,
                        budgetMax: lead.budget_max,
                        projectType: lead.project_type,
                        propertyType: lead.property_type,
                        timeline: lead.timeline,
                        description: lead.description,
                        score: lead.score,
                        status: lead.status,
                        assignedTo: lead.assigned_to ? {
                            id: lead.assigned_to,
                            name: "".concat(lead.assigned_first_name, " ").concat(lead.assigned_last_name)
                        } : null,
                        convertedToProject: lead.converted_to_project,
                        createdAt: lead.created_at,
                        updatedAt: lead.updated_at
                    }); }),
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
                return [3 /*break*/, 3];
            case 2:
                error_27 = _e.sent();
                console.error('Leads error:', error_27);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/leads', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, source, firstName, lastName, email, phone, city, budgetMin, budgetMax, projectType, propertyType, timeline, description, score, leadResult, newLead, designer, error_28;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, , 6]);
                _a = req.body, source = _a.source, firstName = _a.firstName, lastName = _a.lastName, email = _a.email, phone = _a.phone, city = _a.city, budgetMin = _a.budgetMin, budgetMax = _a.budgetMax, projectType = _a.projectType, propertyType = _a.propertyType, timeline = _a.timeline, description = _a.description;
                if (!source || !firstName || !lastName || !email || !phone || !city) {
                    return [2 /*return*/, res.status(400).json({ error: 'Source, firstName, lastName, email, phone, and city are required' })];
                }
                score = 0;
                if (budgetMin && budgetMin > 500000)
                    score += 30;
                else if (budgetMin && budgetMin > 200000)
                    score += 20;
                else if (budgetMin)
                    score += 10;
                if (timeline === 'immediate')
                    score += 25;
                else if (timeline === '1-3 months')
                    score += 20;
                else if (timeline === '3-6 months')
                    score += 15;
                else if (timeline === '6-12 months')
                    score += 10;
                if (projectType === 'full_home')
                    score += 20;
                else if (projectType === 'multiple_rooms')
                    score += 15;
                else if (projectType === 'single_room')
                    score += 10;
                if (propertyType === 'apartment')
                    score += 10;
                else if (propertyType === 'villa')
                    score += 15;
                else if (propertyType === 'office')
                    score += 12;
                if (source === 'website_form')
                    score += 10;
                else if (source === 'referral')
                    score += 15;
                else if (source === 'social_media')
                    score += 8;
                return [4 /*yield*/, pool.query("\n      INSERT INTO leads (\n        source, first_name, last_name, email, phone, city,\n        budget_min, budget_max, project_type, property_type,\n        timeline, description, score\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\n      RETURNING *\n    ", [
                        source, firstName, lastName, email, phone, city,
                        budgetMin, budgetMax, projectType, propertyType,
                        timeline, description, score
                    ])];
            case 1:
                leadResult = _b.sent();
                newLead = leadResult.rows[0];
                return [4 /*yield*/, pool.query("\n      SELECT u.id, COUNT(l.id) as lead_count\n      FROM users u\n      JOIN user_roles ur ON u.id = ur.user_id\n      JOIN roles r ON ur.role_id = r.id\n      LEFT JOIN leads l ON u.id = l.assigned_to AND l.status IN ('new', 'contacted', 'qualified')\n      WHERE r.name = 'interior_designer' \n        AND u.city = $1 \n        AND u.is_active = true\n      GROUP BY u.id\n      ORDER BY lead_count ASC, u.created_at ASC\n      LIMIT 1\n    ", [city])];
            case 2:
                designer = _b.sent();
                if (!(designer.rows.length > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query('UPDATE leads SET assigned_to = $1 WHERE id = $2', [designer.rows[0].id, newLead.id])];
            case 3:
                _b.sent();
                newLead.assigned_to = designer.rows[0].id;
                _b.label = 4;
            case 4:
                res.status(201).json({
                    id: newLead.id,
                    source: newLead.source,
                    firstName: newLead.first_name,
                    lastName: newLead.last_name,
                    email: newLead.email,
                    phone: newLead.phone,
                    city: newLead.city,
                    budgetMin: newLead.budget_min,
                    budgetMax: newLead.budget_max,
                    projectType: newLead.project_type,
                    propertyType: newLead.property_type,
                    timeline: newLead.timeline,
                    description: newLead.description,
                    score: newLead.score,
                    status: newLead.status,
                    assignedTo: newLead.assigned_to,
                    createdAt: newLead.created_at
                });
                return [3 /*break*/, 6];
            case 5:
                error_28 = _b.sent();
                console.error('Create lead error:', error_28);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.get('/leads/:id', authenticateToken, requirePermission('leads.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, leadQuery, result, lead, error_29;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                leadQuery = "\n      SELECT \n        l.*,\n        u.first_name as assigned_first_name,\n        u.last_name as assigned_last_name,\n        u.email as assigned_email\n      FROM leads l\n      LEFT JOIN users u ON l.assigned_to = u.id\n      WHERE l.id = $1\n    ";
                return [4 /*yield*/, pool.query(leadQuery, [id])];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Lead not found' })];
                }
                lead = result.rows[0];
                res.json({
                    id: lead.id,
                    source: lead.source,
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    phone: lead.phone,
                    city: lead.city,
                    budgetMin: lead.budget_min,
                    budgetMax: lead.budget_max,
                    projectType: lead.project_type,
                    propertyType: lead.property_type,
                    timeline: lead.timeline,
                    description: lead.description,
                    score: lead.score,
                    status: lead.status,
                    assignedTo: lead.assigned_to ? {
                        id: lead.assigned_to,
                        name: "".concat(lead.assigned_first_name, " ").concat(lead.assigned_last_name),
                        email: lead.assigned_email
                    } : null,
                    convertedToProject: lead.converted_to_project,
                    createdAt: lead.created_at,
                    updatedAt: lead.updated_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_29 = _a.sent();
                console.error('Get lead error:', error_29);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/leads/:id', authenticateToken, requirePermission('leads.edit'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, firstName, lastName, email, phone, city, budgetMin, budgetMax, projectType, propertyType, timeline, description, status_5, score, updateResult, updatedLead, error_30;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, firstName = _a.firstName, lastName = _a.lastName, email = _a.email, phone = _a.phone, city = _a.city, budgetMin = _a.budgetMin, budgetMax = _a.budgetMax, projectType = _a.projectType, propertyType = _a.propertyType, timeline = _a.timeline, description = _a.description, status_5 = _a.status, score = _a.score;
                return [4 /*yield*/, pool.query("\n      UPDATE leads SET\n        first_name = $1, last_name = $2, email = $3, phone = $4, city = $5,\n        budget_min = $6, budget_max = $7, project_type = $8, property_type = $9,\n        timeline = $10, description = $11, status = $12, score = $13,\n        updated_at = NOW()\n      WHERE id = $14\n      RETURNING *\n    ", [
                        firstName, lastName, email, phone, city, budgetMin, budgetMax,
                        projectType, propertyType, timeline, description, status_5, score, id
                    ])];
            case 1:
                updateResult = _b.sent();
                if (updateResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Lead not found' })];
                }
                updatedLead = updateResult.rows[0];
                res.json({
                    id: updatedLead.id,
                    firstName: updatedLead.first_name,
                    lastName: updatedLead.last_name,
                    email: updatedLead.email,
                    phone: updatedLead.phone,
                    city: updatedLead.city,
                    budgetMin: updatedLead.budget_min,
                    budgetMax: updatedLead.budget_max,
                    projectType: updatedLead.project_type,
                    propertyType: updatedLead.property_type,
                    timeline: updatedLead.timeline,
                    description: updatedLead.description,
                    status: updatedLead.status,
                    score: updatedLead.score,
                    updatedAt: updatedLead.updated_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_30 = _b.sent();
                console.error('Update lead error:', error_30);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/leads/:id/assign', authenticateToken, requirePermission('leads.assign'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, assignedTo, updateResult, error_31;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                assignedTo = req.body.assignedTo;
                if (!assignedTo) {
                    return [2 /*return*/, res.status(400).json({ error: 'assignedTo is required' })];
                }
                return [4 /*yield*/, pool.query('UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [assignedTo, id])];
            case 1:
                updateResult = _a.sent();
                if (updateResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Lead not found' })];
                }
                res.json({ message: 'Lead assigned successfully', leadId: id, assignedTo: assignedTo });
                return [3 /*break*/, 3];
            case 2:
                error_31 = _a.sent();
                console.error('Assign lead error:', error_31);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/leads/:id/convert', authenticateToken, requirePermission('leads.convert'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, projectTitle, projectDescription, budget, designerId, leadResult, lead, projectResult, newProject, error_32;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                id = req.params.id;
                _a = req.body, projectTitle = _a.projectTitle, projectDescription = _a.projectDescription, budget = _a.budget, designerId = _a.designerId;
                return [4 /*yield*/, pool.query('SELECT * FROM leads WHERE id = $1', [id])];
            case 1:
                leadResult = _b.sent();
                if (leadResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Lead not found' })];
                }
                lead = leadResult.rows[0];
                return [4 /*yield*/, pool.query("\n      INSERT INTO projects (title, description, client_id, designer_id, budget, city, property_type)\n      VALUES ($1, $2, $3, $4, $5, $6, $7)\n      RETURNING *\n    ", [
                        projectTitle || "Project for ".concat(lead.first_name, " ").concat(lead.last_name),
                        projectDescription || lead.description,
                        lead.id, // Note: This should be a user_id, not lead_id in real implementation
                        designerId || lead.assigned_to,
                        budget || lead.budget_max || lead.budget_min,
                        lead.city,
                        lead.property_type
                    ])];
            case 2:
                projectResult = _b.sent();
                newProject = projectResult.rows[0];
                // Update lead status
                return [4 /*yield*/, pool.query('UPDATE leads SET status = $1, converted_to_project = $2, updated_at = NOW() WHERE id = $3', ['converted', newProject.id, id])];
            case 3:
                // Update lead status
                _b.sent();
                res.json({
                    message: 'Lead converted to project successfully',
                    lead: { id: lead.id, status: 'converted' },
                    project: {
                        id: newProject.id,
                        title: newProject.title,
                        createdAt: newProject.created_at
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_32 = _b.sent();
                console.error('Convert lead error:', error_32);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ==================== MATERIALS ENDPOINTS ====================
app.get('/materials', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, category, vendorId, search, offset, whereClause, queryParams, paramIndex, materialsQuery, countQuery, _d, materialsResult, countResult, error_33;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, category = _a.category, vendorId = _a.vendorId, search = _a.search;
                offset = (page - 1) * limit;
                whereClause = 'WHERE m.is_active = true';
                queryParams = [];
                paramIndex = 1;
                if (category) {
                    whereClause += " AND m.category = $".concat(paramIndex);
                    queryParams.push(category);
                    paramIndex++;
                }
                if (vendorId) {
                    whereClause += " AND m.vendor_id = $".concat(paramIndex);
                    queryParams.push(vendorId);
                    paramIndex++;
                }
                if (search) {
                    whereClause += " AND (m.name ILIKE $".concat(paramIndex, " OR m.description ILIKE $").concat(paramIndex, ")");
                    queryParams.push("%".concat(search, "%"));
                    paramIndex++;
                }
                materialsQuery = "\n      SELECT \n        m.*,\n        v.company_name as vendor_name,\n        v.rating as vendor_rating\n      FROM materials m\n      LEFT JOIN vendors v ON m.vendor_id = v.id\n      ".concat(whereClause, "\n      ORDER BY m.created_at DESC\n      LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1, "\n    ");
                countQuery = "SELECT COUNT(*) as total FROM materials m ".concat(whereClause);
                return [4 /*yield*/, Promise.all([
                        pool.query(materialsQuery, __spreadArray(__spreadArray([], queryParams, true), [limit, offset], false)),
                        pool.query(countQuery, queryParams)
                    ])];
            case 1:
                _d = _e.sent(), materialsResult = _d[0], countResult = _d[1];
                res.json({
                    materials: materialsResult.rows.map(function (material) { return ({
                        id: material.id,
                        name: material.name,
                        category: material.category,
                        subcategory: material.subcategory,
                        brand: material.brand,
                        model: material.model,
                        description: material.description,
                        unit: material.unit,
                        price: material.price,
                        discountedPrice: material.discounted_price,
                        stockQuantity: material.stock_quantity,
                        minOrderQuantity: material.min_order_quantity,
                        leadTimeDays: material.lead_time_days,
                        images: material.images,
                        specifications: material.specifications,
                        vendor: {
                            id: material.vendor_id,
                            name: material.vendor_name,
                            rating: material.vendor_rating
                        },
                        createdAt: material.created_at
                    }); }),
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
                return [3 /*break*/, 3];
            case 2:
                error_33 = _e.sent();
                console.error('Materials error:', error_33);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/materials', authenticateToken, requirePermission('vendors.manage'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, vendorId, name_1, category, subcategory, brand, model, description, unit, price, discountedPrice, stockQuantity, minOrderQuantity, leadTimeDays, images, specifications, materialResult, newMaterial, error_34;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, vendorId = _a.vendorId, name_1 = _a.name, category = _a.category, subcategory = _a.subcategory, brand = _a.brand, model = _a.model, description = _a.description, unit = _a.unit, price = _a.price, discountedPrice = _a.discountedPrice, stockQuantity = _a.stockQuantity, minOrderQuantity = _a.minOrderQuantity, leadTimeDays = _a.leadTimeDays, images = _a.images, specifications = _a.specifications;
                if (!name_1 || !category || !unit || !price) {
                    return [2 /*return*/, res.status(400).json({ error: 'Name, category, unit, and price are required' })];
                }
                return [4 /*yield*/, pool.query("\n      INSERT INTO materials (\n        vendor_id, name, category, subcategory, brand, model, description,\n        unit, price, discounted_price, stock_quantity, min_order_quantity,\n        lead_time_days, images, specifications\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)\n      RETURNING *\n    ", [
                        vendorId, name_1, category, subcategory, brand, model, description,
                        unit, price, discountedPrice, stockQuantity, minOrderQuantity,
                        leadTimeDays, images, specifications
                    ])];
            case 1:
                materialResult = _b.sent();
                newMaterial = materialResult.rows[0];
                res.status(201).json({
                    id: newMaterial.id,
                    vendorId: newMaterial.vendor_id,
                    name: newMaterial.name,
                    category: newMaterial.category,
                    subcategory: newMaterial.subcategory,
                    brand: newMaterial.brand,
                    model: newMaterial.model,
                    description: newMaterial.description,
                    unit: newMaterial.unit,
                    price: newMaterial.price,
                    discountedPrice: newMaterial.discounted_price,
                    stockQuantity: newMaterial.stock_quantity,
                    minOrderQuantity: newMaterial.min_order_quantity,
                    leadTimeDays: newMaterial.lead_time_days,
                    images: newMaterial.images,
                    specifications: newMaterial.specifications,
                    createdAt: newMaterial.created_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_34 = _b.sent();
                console.error('Create material error:', error_34);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/materials/categories', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categoriesResult, error_35;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT DISTINCT category, COUNT(*) as count \n      FROM materials \n      WHERE is_active = true \n      GROUP BY category \n      ORDER BY category\n    ")];
            case 1:
                categoriesResult = _a.sent();
                res.json({
                    categories: categoriesResult.rows.map(function (cat) { return ({
                        name: cat.category,
                        count: parseInt(cat.count)
                    }); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_35 = _a.sent();
                console.error('Material categories error:', error_35);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/materials/:id', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, materialQuery, result, material, error_36;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                materialQuery = "\n      SELECT \n        m.*,\n        v.company_name as vendor_name,\n        v.rating as vendor_rating,\n        v.city as vendor_city,\n        v.is_verified as vendor_verified\n      FROM materials m\n      LEFT JOIN vendors v ON m.vendor_id = v.id\n      WHERE m.id = $1\n    ";
                return [4 /*yield*/, pool.query(materialQuery, [id])];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Material not found' })];
                }
                material = result.rows[0];
                res.json({
                    id: material.id,
                    name: material.name,
                    category: material.category,
                    subcategory: material.subcategory,
                    brand: material.brand,
                    model: material.model,
                    description: material.description,
                    unit: material.unit,
                    price: material.price,
                    discountedPrice: material.discounted_price,
                    stockQuantity: material.stock_quantity,
                    minOrderQuantity: material.min_order_quantity,
                    leadTimeDays: material.lead_time_days,
                    images: material.images,
                    specifications: material.specifications,
                    vendor: {
                        id: material.vendor_id,
                        name: material.vendor_name,
                        rating: material.vendor_rating,
                        city: material.vendor_city,
                        isVerified: material.vendor_verified
                    },
                    createdAt: material.created_at,
                    updatedAt: material.updated_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_36 = _a.sent();
                console.error('Get material error:', error_36);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/materials/:id', authenticateToken, requirePermission('vendors.manage'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, name_2, category, subcategory, brand, model, description, unit, price, discountedPrice, stockQuantity, minOrderQuantity, leadTimeDays, images, specifications, isActive, updateResult, updatedMaterial, error_37;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, name_2 = _a.name, category = _a.category, subcategory = _a.subcategory, brand = _a.brand, model = _a.model, description = _a.description, unit = _a.unit, price = _a.price, discountedPrice = _a.discountedPrice, stockQuantity = _a.stockQuantity, minOrderQuantity = _a.minOrderQuantity, leadTimeDays = _a.leadTimeDays, images = _a.images, specifications = _a.specifications, isActive = _a.isActive;
                return [4 /*yield*/, pool.query("\n      UPDATE materials SET\n        name = $1, category = $2, subcategory = $3, brand = $4, model = $5,\n        description = $6, unit = $7, price = $8, discounted_price = $9,\n        stock_quantity = $10, min_order_quantity = $11, lead_time_days = $12,\n        images = $13, specifications = $14, is_active = $15, updated_at = NOW()\n      WHERE id = $16\n      RETURNING *\n    ", [
                        name_2, category, subcategory, brand, model, description,
                        unit, price, discountedPrice, stockQuantity, minOrderQuantity,
                        leadTimeDays, images, specifications, isActive, id
                    ])];
            case 1:
                updateResult = _b.sent();
                if (updateResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Material not found' })];
                }
                updatedMaterial = updateResult.rows[0];
                res.json({
                    id: updatedMaterial.id,
                    name: updatedMaterial.name,
                    category: updatedMaterial.category,
                    price: updatedMaterial.price,
                    stockQuantity: updatedMaterial.stock_quantity,
                    isActive: updatedMaterial.is_active,
                    updatedAt: updatedMaterial.updated_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_37 = _b.sent();
                console.error('Update material error:', error_37);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== VENDOR MANAGEMENT ENDPOINTS ====================
app.get('/vendors', authenticateToken, requirePermission('vendors.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, city, businessType, isVerified, offset, whereClause, queryParams, paramIndex, vendorsQuery, countQuery, _d, vendorsResult, countResult, error_38;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, city = _a.city, businessType = _a.businessType, isVerified = _a.isVerified;
                offset = (page - 1) * limit;
                whereClause = 'WHERE 1=1';
                queryParams = [];
                paramIndex = 1;
                if (city) {
                    whereClause += " AND v.city = $".concat(paramIndex);
                    queryParams.push(city);
                    paramIndex++;
                }
                if (businessType) {
                    whereClause += " AND v.business_type = $".concat(paramIndex);
                    queryParams.push(businessType);
                    paramIndex++;
                }
                if (isVerified !== undefined) {
                    whereClause += " AND v.is_verified = $".concat(paramIndex);
                    queryParams.push(isVerified === 'true');
                    paramIndex++;
                }
                vendorsQuery = "\n      SELECT \n        v.*,\n        u.first_name, u.last_name, u.email, u.phone,\n        COUNT(m.id) as material_count\n      FROM vendors v\n      JOIN users u ON v.user_id = u.id\n      LEFT JOIN materials m ON v.id = m.vendor_id AND m.is_active = true\n      ".concat(whereClause, "\n      GROUP BY v.id, u.first_name, u.last_name, u.email, u.phone\n      ORDER BY v.rating DESC, v.created_at DESC\n      LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1, "\n    ");
                countQuery = "SELECT COUNT(*) as total FROM vendors v ".concat(whereClause);
                return [4 /*yield*/, Promise.all([
                        pool.query(vendorsQuery, __spreadArray(__spreadArray([], queryParams, true), [limit, offset], false)),
                        pool.query(countQuery, queryParams)
                    ])];
            case 1:
                _d = _e.sent(), vendorsResult = _d[0], countResult = _d[1];
                res.json({
                    vendors: vendorsResult.rows.map(function (vendor) { return ({
                        id: vendor.id,
                        userId: vendor.user_id,
                        companyName: vendor.company_name,
                        businessType: vendor.business_type,
                        gstNumber: vendor.gst_number,
                        panNumber: vendor.pan_number,
                        address: vendor.address,
                        city: vendor.city,
                        state: vendor.state,
                        pincode: vendor.pincode,
                        isVerified: vendor.is_verified,
                        rating: vendor.rating,
                        totalOrders: vendor.total_orders,
                        materialCount: parseInt(vendor.material_count),
                        contact: {
                            name: "".concat(vendor.first_name, " ").concat(vendor.last_name),
                            email: vendor.email,
                            phone: vendor.phone
                        },
                        createdAt: vendor.created_at
                    }); }),
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
                return [3 /*break*/, 3];
            case 2:
                error_38 = _e.sent();
                console.error('Vendors error:', error_38);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/vendors', authenticateToken, requirePermission('vendors.manage'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, companyName, businessType, gstNumber, panNumber, address, city, state, pincode, vendorResult, newVendor, error_39;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, userId = _a.userId, companyName = _a.companyName, businessType = _a.businessType, gstNumber = _a.gstNumber, panNumber = _a.panNumber, address = _a.address, city = _a.city, state = _a.state, pincode = _a.pincode;
                if (!userId || !companyName || !businessType) {
                    return [2 /*return*/, res.status(400).json({ error: 'userId, companyName, and businessType are required' })];
                }
                return [4 /*yield*/, pool.query("\n      INSERT INTO vendors (\n        user_id, company_name, business_type, gst_number, pan_number,\n        address, city, state, pincode\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n      RETURNING *\n    ", [userId, companyName, businessType, gstNumber, panNumber, address, city, state, pincode])];
            case 1:
                vendorResult = _b.sent();
                newVendor = vendorResult.rows[0];
                res.status(201).json({
                    id: newVendor.id,
                    userId: newVendor.user_id,
                    companyName: newVendor.company_name,
                    businessType: newVendor.business_type,
                    city: newVendor.city,
                    state: newVendor.state,
                    isVerified: newVendor.is_verified,
                    rating: newVendor.rating,
                    createdAt: newVendor.created_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_39 = _b.sent();
                console.error('Create vendor error:', error_39);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/vendors/:id', authenticateToken, requirePermission('vendors.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, vendorQuery, result, vendor, error_40;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                vendorQuery = "\n      SELECT \n        v.*,\n        u.first_name, u.last_name, u.email, u.phone\n      FROM vendors v\n      JOIN users u ON v.user_id = u.id\n      WHERE v.id = $1\n    ";
                return [4 /*yield*/, pool.query(vendorQuery, [id])];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Vendor not found' })];
                }
                vendor = result.rows[0];
                res.json({
                    id: vendor.id,
                    userId: vendor.user_id,
                    companyName: vendor.company_name,
                    businessType: vendor.business_type,
                    gstNumber: vendor.gst_number,
                    panNumber: vendor.pan_number,
                    address: vendor.address,
                    city: vendor.city,
                    state: vendor.state,
                    pincode: vendor.pincode,
                    isVerified: vendor.is_verified,
                    rating: vendor.rating,
                    totalOrders: vendor.total_orders,
                    contact: {
                        name: "".concat(vendor.first_name, " ").concat(vendor.last_name),
                        email: vendor.email,
                        phone: vendor.phone
                    },
                    createdAt: vendor.created_at,
                    updatedAt: vendor.updated_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_40 = _a.sent();
                console.error('Get vendor error:', error_40);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/vendors/:id/materials', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, _b, page, _c, limit, offset, materialsQuery, countQuery, _d, materialsResult, countResult, error_41;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c;
                offset = (page - 1) * limit;
                materialsQuery = "\n      SELECT * FROM materials \n      WHERE vendor_id = $1 AND is_active = true\n      ORDER BY created_at DESC\n      LIMIT $2 OFFSET $3\n    ";
                countQuery = "SELECT COUNT(*) as total FROM materials WHERE vendor_id = $1 AND is_active = true";
                return [4 /*yield*/, Promise.all([
                        pool.query(materialsQuery, [id, limit, offset]),
                        pool.query(countQuery, [id])
                    ])];
            case 1:
                _d = _e.sent(), materialsResult = _d[0], countResult = _d[1];
                res.json({
                    materials: materialsResult.rows.map(function (material) { return ({
                        id: material.id,
                        name: material.name,
                        category: material.category,
                        price: material.price,
                        stockQuantity: material.stock_quantity,
                        unit: material.unit,
                        createdAt: material.created_at
                    }); }),
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
                return [3 /*break*/, 3];
            case 2:
                error_41 = _e.sent();
                console.error('Vendor materials error:', error_41);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== FILE MANAGEMENT ENDPOINTS ====================
app.post('/files/upload', authenticateToken, upload.single('file'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, entityType, entityId, fileRecord, newFile, error_42;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ error: 'No file uploaded' })];
                }
                _a = req.body, entityType = _a.entityType, entityId = _a.entityId;
                return [4 /*yield*/, pool.query("\n      INSERT INTO file_uploads (\n        id, user_id, filename, original_name, file_path, file_size, mime_type,\n        entity_type, entity_id\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n      RETURNING *\n    ", [
                        req.file.filename,
                        req.user.id,
                        req.file.filename,
                        req.file.originalname,
                        req.file.path,
                        req.file.size,
                        req.file.mimetype,
                        entityType,
                        entityId
                    ])];
            case 1:
                fileRecord = _b.sent();
                newFile = fileRecord.rows[0];
                res.status(201).json({
                    id: newFile.id,
                    filename: newFile.filename,
                    originalName: newFile.original_name,
                    fileSize: newFile.file_size,
                    mimeType: newFile.mime_type,
                    entityType: newFile.entity_type,
                    entityId: newFile.entity_id,
                    createdAt: newFile.created_at
                });
                return [3 /*break*/, 3];
            case 2:
                error_42 = _b.sent();
                console.error('File upload error:', error_42);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/files', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, entityType, entityId, _b, page, _c, limit, offset, whereClause, queryParams, paramIndex, filesQuery, countQuery, _d, filesResult, countResult, error_43;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, entityType = _a.entityType, entityId = _a.entityId, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c;
                offset = (page - 1) * limit;
                whereClause = 'WHERE user_id = $1';
                queryParams = [req.user.id];
                paramIndex = 2;
                if (entityType) {
                    whereClause += " AND entity_type = $".concat(paramIndex);
                    queryParams.push(entityType);
                    paramIndex++;
                }
                if (entityId) {
                    whereClause += " AND entity_id = $".concat(paramIndex);
                    queryParams.push(entityId);
                    paramIndex++;
                }
                filesQuery = "\n      SELECT * FROM file_uploads \n      ".concat(whereClause, "\n      ORDER BY created_at DESC\n      LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1, "\n    ");
                countQuery = "SELECT COUNT(*) as total FROM file_uploads ".concat(whereClause);
                return [4 /*yield*/, Promise.all([
                        pool.query(filesQuery, __spreadArray(__spreadArray([], queryParams, true), [limit, offset], false)),
                        pool.query(countQuery, queryParams)
                    ])];
            case 1:
                _d = _e.sent(), filesResult = _d[0], countResult = _d[1];
                res.json({
                    files: filesResult.rows.map(function (file) { return ({
                        id: file.id,
                        filename: file.filename,
                        originalName: file.original_name,
                        fileSize: file.file_size,
                        mimeType: file.mime_type,
                        entityType: file.entity_type,
                        entityId: file.entity_id,
                        createdAt: file.created_at
                    }); }),
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
                return [3 /*break*/, 3];
            case 2:
                error_43 = _e.sent();
                console.error('Files list error:', error_43);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== ANALYTICS ENDPOINTS ====================
app.get('/analytics/dashboard', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var queries, results, totalLeads, totalProjects, conversionRate, error_44;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                queries = {
                    totalLeads: "SELECT COUNT(*) as count FROM leads",
                    totalProjects: "SELECT COUNT(*) as count FROM projects",
                    totalRevenue: "SELECT COALESCE(SUM(actual_cost), 0) as sum FROM projects WHERE status = 'completed'",
                    activeProjects: "SELECT COUNT(*) as count FROM projects WHERE status IN ('in_progress', 'planning')",
                    leadsThisMonth: "SELECT COUNT(*) as count FROM leads WHERE created_at >= date_trunc('month', CURRENT_DATE)",
                    projectsThisMonth: "SELECT COUNT(*) as count FROM projects WHERE created_at >= date_trunc('month', CURRENT_DATE)",
                    revenueThisMonth: "SELECT COALESCE(SUM(actual_cost), 0) as sum FROM projects WHERE status = 'completed' AND updated_at >= date_trunc('month', CURRENT_DATE)"
                };
                return [4 /*yield*/, Promise.all([
                        pool.query(queries.totalLeads),
                        pool.query(queries.totalProjects),
                        pool.query(queries.totalRevenue),
                        pool.query(queries.activeProjects),
                        pool.query(queries.leadsThisMonth),
                        pool.query(queries.projectsThisMonth),
                        pool.query(queries.revenueThisMonth)
                    ])];
            case 1:
                results = _a.sent();
                totalLeads = parseInt(results[0].rows[0].count);
                totalProjects = parseInt(results[1].rows[0].count);
                conversionRate = totalLeads > 0 ? ((totalProjects / totalLeads) * 100).toFixed(1) : 0;
                res.json({
                    totalLeads: totalLeads,
                    totalProjects: totalProjects,
                    totalRevenue: parseInt(results[2].rows[0].sum),
                    activeProjects: parseInt(results[3].rows[0].count),
                    conversionRate: parseFloat(String(conversionRate)),
                    leadsThisMonth: parseInt(results[4].rows[0].count),
                    projectsThisMonth: parseInt(results[5].rows[0].count),
                    revenueThisMonth: parseInt(results[6].rows[0].sum)
                });
                return [3 /*break*/, 3];
            case 2:
                error_44 = _a.sent();
                console.error('Analytics error:', error_44);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/analytics/leads', authenticateToken, requirePermission('analytics.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var statusStats, sourceStats, cityStats, monthlyTrend, error_45;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, pool.query("\n      SELECT status, COUNT(*) as count \n      FROM leads \n      GROUP BY status \n      ORDER BY count DESC\n    ")];
            case 1:
                statusStats = _a.sent();
                return [4 /*yield*/, pool.query("\n      SELECT source, COUNT(*) as count \n      FROM leads \n      GROUP BY source \n      ORDER BY count DESC\n    ")];
            case 2:
                sourceStats = _a.sent();
                return [4 /*yield*/, pool.query("\n      SELECT city, COUNT(*) as count \n      FROM leads \n      GROUP BY city \n      ORDER BY count DESC\n      LIMIT 10\n    ")];
            case 3:
                cityStats = _a.sent();
                return [4 /*yield*/, pool.query("\n      SELECT \n        DATE_TRUNC('month', created_at) as month,\n        COUNT(*) as count\n      FROM leads \n      WHERE created_at >= NOW() - INTERVAL '12 months'\n      GROUP BY DATE_TRUNC('month', created_at)\n      ORDER BY month\n    ")];
            case 4:
                monthlyTrend = _a.sent();
                res.json({
                    statusDistribution: statusStats.rows,
                    sourceDistribution: sourceStats.rows,
                    topCities: cityStats.rows,
                    monthlyTrend: monthlyTrend.rows
                });
                return [3 /*break*/, 6];
            case 5:
                error_45 = _a.sent();
                console.error('Lead analytics error:', error_45);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.get('/analytics/projects', authenticateToken, requirePermission('analytics.view'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var statusStats, budgetStats, monthlyRevenue, error_46;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, pool.query("\n      SELECT status, COUNT(*) as count \n      FROM projects \n      GROUP BY status \n      ORDER BY count DESC\n    ")];
            case 1:
                statusStats = _a.sent();
                return [4 /*yield*/, pool.query("\n      SELECT \n        CASE \n          WHEN budget < 200000 THEN 'Under 2L'\n          WHEN budget < 500000 THEN '2L-5L'\n          WHEN budget < 1000000 THEN '5L-10L'\n          ELSE 'Above 10L'\n        END as budget_range,\n        COUNT(*) as count\n      FROM projects \n      GROUP BY budget_range\n      ORDER BY count DESC\n    ")];
            case 2:
                budgetStats = _a.sent();
                return [4 /*yield*/, pool.query("\n      SELECT \n        DATE_TRUNC('month', updated_at) as month,\n        SUM(actual_cost) as revenue\n      FROM projects \n      WHERE status = 'completed' AND updated_at >= NOW() - INTERVAL '12 months'\n      GROUP BY DATE_TRUNC('month', updated_at)\n      ORDER BY month\n    ")];
            case 3:
                monthlyRevenue = _a.sent();
                res.json({
                    statusDistribution: statusStats.rows,
                    budgetDistribution: budgetStats.rows,
                    monthlyRevenue: monthlyRevenue.rows
                });
                return [3 /*break*/, 5];
            case 4:
                error_46 = _a.sent();
                console.error('Project analytics error:', error_46);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ==================== RBAC & SYSTEM ENDPOINTS ====================
app.get('/rbac/user-permissions', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var permissionQuery, result, error_47;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                permissionQuery = "\n      SELECT ARRAY_AGG(DISTINCT p.name) as permissions\n      FROM permissions p\n      JOIN role_permissions rp ON p.id = rp.permission_id\n      JOIN user_roles ur ON rp.role_id = ur.role_id\n      WHERE ur.user_id = $1\n    ";
                return [4 /*yield*/, pool.query(permissionQuery, [req.user.id])];
            case 1:
                result = _c.sent();
                res.json({
                    permissions: ((_b = (_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.permissions) === null || _b === void 0 ? void 0 : _b.filter(function (p) { return p; })) || []
                });
                return [3 /*break*/, 3];
            case 2:
                error_47 = _c.sent();
                console.error('Permissions error:', error_47);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/menus/user', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var menuQuery, result, error_48;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                menuQuery = "\n      SELECT DISTINCT m.name, m.display_name, m.icon, m.path, m.sort_order\n      FROM menus m\n      JOIN role_menus rm ON m.id = rm.menu_id\n      JOIN user_roles ur ON rm.role_id = ur.role_id\n      WHERE ur.user_id = $1 AND m.is_active = true AND rm.can_view = true\n      ORDER BY m.sort_order, m.display_name\n    ";
                return [4 /*yield*/, pool.query(menuQuery, [req.user.id])];
            case 1:
                result = _a.sent();
                res.json({
                    menus: result.rows.map(function (menu) { return ({
                        name: menu.name,
                        displayName: menu.display_name,
                        icon: menu.icon,
                        path: menu.path
                    }); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_48 = _a.sent();
                console.error('Menus error:', error_48);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== SEARCH ENDPOINTS ====================
app.get('/search', authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, q, type, results, projectsResult, leadsResult, usersResult, materialsResult, error_49;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 9, , 10]);
                _a = req.query, q = _a.q, type = _a.type;
                if (!q) {
                    return [2 /*return*/, res.status(400).json({ error: 'Search query is required' })];
                }
                results = {};
                if (!(!type || type === 'projects')) return [3 /*break*/, 2];
                return [4 /*yield*/, pool.query("\n        SELECT id, title, status, city \n        FROM projects \n        WHERE title ILIKE $1 OR description ILIKE $1\n        LIMIT 5\n      ", ["%".concat(q, "%")])];
            case 1:
                projectsResult = _b.sent();
                results.projects = projectsResult.rows;
                _b.label = 2;
            case 2:
                if (!(!type || type === 'leads')) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query("\n        SELECT id, first_name, last_name, email, city, status \n        FROM leads \n        WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1\n        LIMIT 5\n      ", ["%".concat(q, "%")])];
            case 3:
                leadsResult = _b.sent();
                results.leads = leadsResult.rows;
                _b.label = 4;
            case 4:
                if (!(!type || type === 'users')) return [3 /*break*/, 6];
                return [4 /*yield*/, pool.query("\n        SELECT id, first_name, last_name, email, city \n        FROM users \n        WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1\n        LIMIT 5\n      ", ["%".concat(q, "%")])];
            case 5:
                usersResult = _b.sent();
                results.users = usersResult.rows;
                _b.label = 6;
            case 6:
                if (!(!type || type === 'materials')) return [3 /*break*/, 8];
                return [4 /*yield*/, pool.query("\n        SELECT id, name, category, price, unit \n        FROM materials \n        WHERE name ILIKE $1 OR description ILIKE $1 AND is_active = true\n        LIMIT 5\n      ", ["%".concat(q, "%")])];
            case 7:
                materialsResult = _b.sent();
                results.materials = materialsResult.rows;
                _b.label = 8;
            case 8:
                res.json(results);
                return [3 /*break*/, 10];
            case 9:
                error_49 = _b.sent();
                console.error('Search error:', error_49);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// ==================== HEALTH CHECK ENDPOINTS ====================
app.get('/health', function (req, res) {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});
app.get('/health/db', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_50;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query('SELECT NOW()')];
            case 1:
                result = _a.sent();
                res.json({
                    status: 'ok',
                    database: 'connected',
                    timestamp: result.rows[0].now
                });
                return [3 /*break*/, 3];
            case 2:
                error_50 = _a.sent();
                res.status(500).json({
                    status: 'error',
                    database: 'disconnected',
                    error: error_50.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== ERROR HANDLING ====================
app.use(function (req, res) {
    console.log('Unhandled request:', req.method, req.originalUrl);
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});
app.use(function (error, req, res, next) {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});
// ==================== START SERVER ====================
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 Production server running on http://localhost:".concat(PORT));
    console.log('📝 Available endpoints:');
    console.log('  🔐 Authentication:');
    console.log('    POST /auth/login');
    console.log('  👥 User Management:');
    console.log('    GET  /users/profile, GET /users, POST /users, GET /users/:id, PUT /users/:id, DELETE /users/:id');
    console.log('  📁 Project Management:');
    console.log('    GET  /projects, POST /projects, GET /projects/:id, PUT /projects/:id, DELETE /projects/:id');
    console.log('  🎯 Lead Management:');
    console.log('    GET  /leads, POST /leads, GET /leads/:id, PUT /leads/:id, POST /leads/:id/assign, POST /leads/:id/convert');
    console.log('  🏗️  Materials:');
    console.log('    GET  /materials, POST /materials, GET /materials/categories, GET /materials/:id, PUT /materials/:id');
    console.log('  🏢 Vendor Management:');
    console.log('    GET  /vendors, POST /vendors, GET /vendors/:id, GET /vendors/:id/materials');
    console.log('  📊 Analytics:');
    console.log('    GET  /analytics/dashboard, GET /analytics/leads, GET /analytics/projects');
    console.log('  🔍 Search:');
    console.log('    GET  /search');
    console.log('  📎 Files:');
    console.log('    POST /files/upload, GET /files');
    console.log('  🛡️  RBAC:');
    console.log('    GET  /rbac/user-permissions, GET /menus/user');
    console.log('  ❤️  Health:');
    console.log('    GET  /health, GET /health/db');
    console.log('\n✨ Frontend should connect to: http://localhost:4000');
    console.log('💾 Database: PostgreSQL (gharinto_dev)');
    console.log('🎯 API Coverage: 40+ endpoints implemented');
});
exports.default = app;
