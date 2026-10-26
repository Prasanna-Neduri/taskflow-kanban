const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');

const router = express.Router();

/**
 * Middleware: Verify database connectivity
 */
const checkDbConnection = (req, res, next) => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB database is not connected. Please configure your MONGODB_URI in backend/.env and verify network access in MongoDB Atlas.'
    });
  }
  next();
};

router.use(checkDbConnection);

/**
 * Validation helper for ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (with optional filtering and search)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, priority, search, sort } = req.query;
    const filter = {};

    // Filter by status
    if (status && ['todo', 'in-progress', 'done'].includes(status.toLowerCase())) {
      filter.status = status.toLowerCase();
    }

    // Filter by priority
    if (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) {
      filter.priority = priority.toLowerCase();
    }

    // Search by title or description
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Sorting
    let sortOptions = { createdAt: -1 }; // default: newest first
    if (sort === 'dueDate') {
      sortOptions = { dueDate: 1, createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'priority') {
      // In JS sort after retrieval or sort by priority
      sortOptions = { priority: 1, createdAt: -1 };
    }

    const tasks = await Task.find(filter).sort(sortOptions);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get a single task by ID
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID format: '${id}'`
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    // Validate title presence
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title is required and cannot be empty'
      });
    }

    // Validate status if provided
    if (status && !['todo', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'todo', 'in-progress', or 'done'"
      });
    }

    // Validate priority if provided
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Priority must be either 'low', 'medium', or 'high'"
      });
    }

    // Validate dueDate if provided
    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid due date format'
        });
      }
    }

    const newTask = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: parsedDueDate
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update an existing task
 * @access  Public
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID format: '${id}'`
      });
    }

    const { title, description, status, priority, dueDate } = req.body;
    const updates = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Task title cannot be empty'
        });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() : '';
    }

    if (status !== undefined) {
      if (!['todo', 'in-progress', 'done'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'todo', 'in-progress', or 'done'"
        });
      }
      updates.status = status;
    }

    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Priority must be either 'low', 'medium', or 'high'"
        });
      }
      updates.priority = priority;
    }

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        updates.dueDate = null;
      } else {
        const parsed = new Date(dueDate);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid due date format'
          });
        }
        updates.dueDate = parsed;
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: `Task with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status (drag-and-drop or quick transition)
 * @access  Public
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID format: '${id}'`
      });
    }

    if (!status || !['todo', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required ('todo', 'in-progress', or 'done')"
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: `Task with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: `Task moved to '${status}' successfully`,
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Public
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID format: '${id}'`
      });
    }

    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: `Task with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: deletedTask
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/tasks/seed
 * @desc    Seed sample tasks if database is empty or requested
 * @access  Public
 */
router.post('/seed', async (req, res, next) => {
  try {
    const sampleTasks = [
      {
        title: 'Design TaskFlow Architecture',
        description: 'Design the full-stack architecture, REST API routes, and Mongoose data model.',
        status: 'done',
        priority: 'high',
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago (done)
      },
      {
        title: 'Setup MongoDB Atlas Cluster',
        description: 'Create cloud database cluster, create database user, and configure IP whitelist.',
        status: 'done',
        priority: 'high',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Implement Kanban Drag-and-Drop',
        description: 'Connect HTML5 drag and drop events to PATCH /api/tasks/:id/status endpoint.',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // tomorrow
      },
      {
        title: 'Build Responsive Sidebar & Metrics',
        description: 'Implement responsive mobile navigation drawer and dynamic task summary counters.',
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Review Overdue Project Milestones',
        description: 'Check pending college submission requirements and verify overdue task alerts.',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago (overdue!)
      },
      {
        title: 'Write User Documentation & README',
        description: 'Prepare beginner-friendly step-by-step setup guide with screenshots and API specs.',
        status: 'todo',
        priority: 'low',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    ];

    // Check if query param clear=true was passed
    if (req.query.clear === 'true') {
      await Task.deleteMany({});
    }

    const created = await Task.insertMany(sampleTasks);

    res.status(201).json({
      success: true,
      message: `Successfully seeded ${created.length} sample tasks`,
      count: created.length,
      data: created
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
