const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const c = require('../controllers/projectController');

const validateProject = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
];

router.get('/', auth, c.listProjects);
router.post('/', auth, validateProject, c.createProject);
router.get('/:id', auth, requireRole('MEMBER'), c.getProject);
router.put('/:id', auth, requireRole('ADMIN'), validateProject, c.updateProject);
router.delete('/:id', auth, requireRole('ADMIN'), c.deleteProject);
router.post('/:id/members', auth, requireRole('ADMIN'), c.addMember);
router.delete('/:id/members/:userId', auth, requireRole('ADMIN'), c.removeMember);

module.exports = router;
