import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import db from './db.js';
import {
  hashPassword, verifyPassword, generateToken,
  generateReferralCode, authMiddleware, optionalAuth, adminOnly
} from './auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Rate Limiting ──────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 posts per hour
  message: { error: 'You have reached your posting limit (15 per hour). Please take a break.' }
});

app.use('/api/', apiLimiter);

// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// ─── POST /api/auth/register ────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, referralCode } = req.body;
    if (!username || !password || !referralCode) {
      return res.status(400).json({ error: 'Username, password, and referral code are required' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate referral code
    const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode.toUpperCase());
    if (!referrer) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    // Check username uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = hashPassword(password);
    const myReferralCode = generateReferralCode();

    const result = db.prepare(
      'INSERT INTO users (username, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?)'
    ).run(username, passwordHash, myReferralCode, referrer.id);

    const user = db.prepare('SELECT id, username, role, referral_code, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────
app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, role, referral_code, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════

// ─── GET /api/posts ─────────────────────────────────────────
app.get('/api/posts', optionalAuth, (req, res) => {
  try {
    const { category, page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT p.id, p.content, p.category, p.color_seed, p.user_id, p.created_at,
        (SELECT json_group_object(emoji, cnt) FROM (
          SELECT emoji, COUNT(*) as cnt FROM reactions WHERE post_id = p.id GROUP BY emoji
        )) as reactions
      FROM posts p
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ' AND p.category = ?';
      params.push(category);
    }
    
    if (search && search.trim() !== '') {
      query += ' AND p.content LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const posts = db.prepare(query).all(...params);

    // Parse reactions + add user-specific reaction info
    const parsedPosts = posts.map(post => {
      const parsed = {
        ...post,
        reactions: post.reactions ? JSON.parse(post.reactions) : {},
        isOwner: req.user ? post.user_id === req.user.id : false,
      };
      // Remove user_id from public response (only expose isOwner boolean)
      delete parsed.user_id;

      // If user is logged in, find their reaction on this post
      if (req.user) {
        const userReaction = db.prepare(
          'SELECT emoji FROM reactions WHERE post_id = ? AND user_id = ?'
        ).get(post.id, req.user.id);
        parsed.userReaction = userReaction ? userReaction.emoji : null;
      }

      return parsed;
    });

    let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE 1=1';
    const countParams = [];
    if (category && category !== 'all') {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    if (search && search.trim() !== '') {
      countQuery += ' AND content LIKE ?';
      countParams.push(`%${search.trim()}%`);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      posts: parsedPosts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ─── GET /api/stats ─────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  try {
    const { total: totalPosts } = db.prepare('SELECT COUNT(*) as total FROM posts').get();
    const { total: totalReactions } = db.prepare('SELECT COUNT(*) as total FROM reactions').get();
    res.json({ totalPosts, totalReactions });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATED ROUTES
// ═══════════════════════════════════════════════════════════════

// ─── POST /api/posts ────────────────────────────────────────
app.post('/api/posts', authMiddleware, postLimiter, (req, res) => {
  try {
    const { content, category = 'thoughts' } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }
    if (content.length > 1000) {
      return res.status(400).json({ error: 'Content must be 1000 characters or less' });
    }

    const validCategories = [
      'thoughts', 'confessions', 'stories', 'gratitude',
      'rants', 'ideas', 'feelings', 'latenight'
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const colorSeed = Math.floor(Math.random() * 360);

    const result = db.prepare(
      'INSERT INTO posts (content, category, color_seed, user_id) VALUES (?, ?, ?, ?)'
    ).run(content.trim(), category, colorSeed, req.user.id);

    const post = db.prepare('SELECT id, content, category, color_seed, created_at FROM posts WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ ...post, reactions: {}, isOwner: true, userReaction: null });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// ─── POST /api/posts/:id/react (toggle) ─────────────────────
app.post('/api/posts/:id/react', authMiddleware, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { emoji } = req.body;

    const validEmojis = ['❤️', '🤗', '😢', '🔥', '💡', '👏'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid reaction emoji' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Check if user already reacted with this emoji
    const existing = db.prepare(
      'SELECT id FROM reactions WHERE post_id = ? AND user_id = ? AND emoji = ?'
    ).get(postId, req.user.id, emoji);

    if (existing) {
      // Toggle OFF — remove the reaction
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
    } else {
      // Remove any previous reaction by this user on this post (one reaction per user per post)
      db.prepare('DELETE FROM reactions WHERE post_id = ? AND user_id = ?').run(postId, req.user.id);
      // Add new reaction
      db.prepare('INSERT INTO reactions (post_id, user_id, emoji) VALUES (?, ?, ?)').run(postId, req.user.id, emoji);
    }

    // Return updated reactions
    const reactions = db.prepare(
      'SELECT emoji, COUNT(*) as count FROM reactions WHERE post_id = ? GROUP BY emoji'
    ).all(postId);

    const reactionMap = {};
    reactions.forEach(r => { reactionMap[r.emoji] = r.count; });

    // What emoji does this user now have?
    const userReaction = db.prepare(
      'SELECT emoji FROM reactions WHERE post_id = ? AND user_id = ?'
    ).get(postId, req.user.id);

    res.json({ reactions: reactionMap, userReaction: userReaction ? userReaction.emoji : null });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// ─── DELETE /api/posts/:id ──────────────────────────────────
app.delete('/api/posts/:id', authMiddleware, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Only owner or admin can delete
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ─── POST /api/posts/:id/report ─────────────────────────────
app.post('/api/posts/:id/report', authMiddleware, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { reason, details } = req.body;

    const validReasons = ['spam', 'harassment', 'inappropriate', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Valid reason is required' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Check if user already reported this post
    const existing = db.prepare(
      'SELECT id FROM reports WHERE post_id = ? AND reported_by = ?'
    ).get(postId, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'You have already reported this post' });
    }

    db.prepare(
      'INSERT INTO reports (post_id, reported_by, reason, details) VALUES (?, ?, ?, ?)'
    ).run(postId, req.user.id, reason, details || null);

    res.status(201).json({ success: true, message: 'Report submitted for admin review' });
  } catch (error) {
    console.error('Error reporting post:', error);
    res.status(500).json({ error: 'Failed to report post' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════

// ─── GET /api/admin/posts ───────────────────────────────────
app.get('/api/admin/posts', authMiddleware, adminOnly, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const posts = db.prepare(`
      SELECT p.*, u.username as author,
        (SELECT json_group_object(emoji, cnt) FROM (
          SELECT emoji, COUNT(*) as cnt FROM reactions WHERE post_id = p.id GROUP BY emoji
        )) as reactions,
        (SELECT COUNT(*) FROM reports WHERE post_id = p.id AND status = 'pending') as pending_reports
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), offset);

    const parsedPosts = posts.map(post => ({
      ...post,
      reactions: post.reactions ? JSON.parse(post.reactions) : {}
    }));

    const { total } = db.prepare('SELECT COUNT(*) as total FROM posts').get();

    res.json({ posts: parsedPosts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Admin posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ─── GET /api/admin/posts/:id ───────────────────────────────
app.get('/api/admin/posts/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const post = db.prepare(`
      SELECT p.*, u.username as author
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(postId);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Get reactors with usernames
    const reactors = db.prepare(`
      SELECT r.emoji, u.username, r.created_at
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.post_id = ?
      ORDER BY r.created_at DESC
    `).all(postId);

    res.json({ post, reactors });
  } catch (error) {
    console.error('Admin post detail error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// ─── GET /api/admin/reports ─────────────────────────────────
app.get('/api/admin/reports', authMiddleware, adminOnly, (req, res) => {
  try {
    const { status = 'all' } = req.query;
    let query = `
      SELECT r.*, p.content as post_content, p.category as post_category,
        u.username as reporter,
        (SELECT username FROM users WHERE id = p.user_id) as post_author
      FROM reports r
      JOIN posts p ON r.post_id = p.id
      JOIN users u ON r.reported_by = u.id
    `;
    const params = [];

    if (status !== 'all') {
      query += ' WHERE r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const reports = db.prepare(query).all(...params);
    res.json({ reports });
  } catch (error) {
    console.error('Admin reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ─── PUT /api/admin/reports/:id ─────────────────────────────
app.put('/api/admin/reports/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { status, adminNotes, deletePost } = req.body;

    if (!['reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be reviewed or dismissed' });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    db.prepare(
      'UPDATE reports SET status = ?, admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, adminNotes || null, reportId);

    // Optionally delete the post
    if (deletePost) {
      db.prepare('DELETE FROM posts WHERE id = ?').run(report.post_id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Admin review error:', error);
    res.status(500).json({ error: 'Failed to review report' });
  }
});

// ─── GET /api/admin/users ───────────────────────────────────
app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.role, u.referral_code, u.created_at,
        (SELECT username FROM users WHERE id = u.referred_by) as referred_by_username,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
        (SELECT COUNT(*) FROM users WHERE referred_by = u.id) as referral_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PRODUCTION STATIC SERVING
// ═══════════════════════════════════════════════════════════════
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✨ ExpressInEase API running on http://localhost:${PORT}`);
});
