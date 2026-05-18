const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

exports.register = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return next(new AppError('Email already in use', 409));

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  res.status(201).json({ token: signToken(user), user });
});

exports.login = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return next(new AppError('Invalid credentials', 401));

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return next(new AppError('Invalid credentials', 401));

  const { passwordHash: _, ...safeUser } = user;
  res.json({ token: signToken(user), user: safeUser });
});

exports.me = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) return next(new AppError('User not found', 404));
  res.json({ user });
});
