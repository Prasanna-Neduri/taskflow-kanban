const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const Task = require('./models/Task');

const sampleTasks = [
  {
    title: 'Design TaskFlow Architecture & UI Wireframes',
    description: 'Structure the Kanban board layout, modal components, and REST API contracts for college submission.',
    status: 'done',
    priority: 'high',
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago (completed)
  },
  {
    title: 'Setup MongoDB Atlas Cloud Database',
    description: 'Configure cluster security, generate connection string, and set up .env environment variables.',
    status: 'done',
    priority: 'high',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago (completed)
  },
  {
    title: 'Implement Kanban Drag-and-Drop Interaction',
    description: 'Build smooth HTML5 drag-and-drop between To Do, In Progress, and Done columns with PATCH API sync.',
    status: 'in-progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Tomorrow
  },
  {
    title: 'Build Search, Filter, and Sorting Controls',
    description: 'Add real-time client-side and server-side filtering by status, priority level, and search keywords.',
    status: 'in-progress',
    priority: 'medium',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // In 3 days
  },
  {
    title: 'Review Overdue Project Milestones',
    description: 'Inspect tasks nearing completion and verify that overdue visual badges display accurately.',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago (Overdue task!)
  },
  {
    title: 'Write User Guide & Troubleshooting Documentation',
    description: 'Document Atlas setup, IP whitelisting, test instructions, and common errors in README.md.',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // In 5 days
  },
  {
    title: 'Prepare Final Submission Archive (taskflow-kanban.zip)',
    description: 'Package source code, exclude node_modules, and verify clean unpack and start commands.',
    status: 'todo',
    priority: 'low',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // In 7 days
  }
];

const seedData = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('your_mongodb_connection_string')) {
    console.error('\n❌ ERROR: MONGODB_URI is not set in backend/.env');
    console.error('Please configure your MongoDB Atlas connection string before running the seed script.\n');
    process.exit(1);
  }

  try {
    console.log('\n[TaskFlow Seeder] Connecting to MongoDB...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[TaskFlow Seeder] Connected successfully.');

    const shouldClear = process.argv.includes('--clear') || process.argv.includes('--reset');

    if (shouldClear) {
      const deleted = await Task.deleteMany({});
      console.log(`[TaskFlow Seeder] Cleared ${deleted.deletedCount} existing tasks.`);
    } else {
      const existingCount = await Task.countDocuments();
      if (existingCount > 0) {
        console.log(`\nℹ️  Notice: Database already contains ${existingCount} tasks.`);
        console.log('To avoid duplicates, skipping seed. Run "node seed.js --reset" if you want to replace all tasks.\n');
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    const createdTasks = await Task.insertMany(sampleTasks);
    console.log(`\n✅ Successfully seeded ${createdTasks.length} realistic tasks into MongoDB:`);
    console.table(
      createdTasks.map((t) => ({
        Title: t.title.substring(0, 35) + '...',
        Status: t.status,
        Priority: t.priority,
        DueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : 'None'
      }))
    );
    console.log('\nSeed completed successfully!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to seed database:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

seedData();
