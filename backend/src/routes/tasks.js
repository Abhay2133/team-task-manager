const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const c = require('../controllers/taskController');

const validateTask = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
];

// All task routes need :id (projectId) for requireRole lookup
router.get('/:id/tasks', auth, requireRole('MEMBER'), c.listTasks);
router.post('/:id/tasks', auth, requireRole('ADMIN'), validateTask, c.createTask);
router.put('/:id/tasks/:taskId', auth, requireRole('ADMIN'), validateTask, c.updateTask);
router.patch('/:id/tasks/:taskId/status', auth, requireRole('MEMBER'), c.patchStatus);
router.delete('/:id/tasks/:taskId', auth, requireRole('ADMIN'), c.deleteTask);

module.exports = router;
