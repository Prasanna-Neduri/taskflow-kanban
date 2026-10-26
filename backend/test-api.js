process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const { Readable } = require('stream');
const { EventEmitter } = require('events');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = require('./server');
const Task = require('./models/Task');

/**
 * Direct Express dispatch helper that executes requests through
 * the Express app pipeline without requiring OS network port binding.
 */
const request = (method, url, body = null) => {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    let bytesSent = false;

    const req = new Readable({
      read() {
        if (postData && !bytesSent) {
          bytesSent = true;
          this.push(postData);
        }
        this.push(null);
      }
    });

    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      ...(postData ? { 'content-length': Buffer.byteLength(postData).toString() } : {}),
      host: 'localhost:3000'
    };

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.setHeader = (k, v) => {
      res._headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => res._headers[k.toLowerCase()];
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };

    let responseData = '';
    res.write = function (chunk) {
      if (chunk) responseData += chunk;
      return true;
    };

    res.end = function (chunk) {
      if (chunk) responseData += chunk;
      let parsed = responseData;
      try {
        parsed = JSON.parse(responseData);
      } catch (e) {}
      resolve({ status: res.statusCode, body: parsed });
    };

    res.json = function (data) {
      this.setHeader('content-type', 'application/json');
      responseData = JSON.stringify(data);
      this.end();
    };

    res.send = function (data) {
      if (typeof data === 'object') return this.json(data);
      responseData = String(data);
      this.end();
    };

    app.handle(req, res);
  });
};

const runTests = async () => {
  console.log('===================================================================');
  console.log('🧪 TaskFlow - Automated API & Integration Test Suite');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  };

  try {
    // -----------------------------------------------------------------
    // 1. Health check endpoint
    // -----------------------------------------------------------------
    console.log('1. Testing Health Endpoint (/api/health)');
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthRes.body.status === 'ok', "Health status is 'ok'");
    assert('database' in healthRes.body, "Health response includes 'database' info");

    // -----------------------------------------------------------------
    // 2. Offline Database Protection (when DB is not yet connected)
    // -----------------------------------------------------------------
    console.log('\n2. Testing Offline Database Protection');
    const offlineTaskRes = await request('GET', '/api/tasks');
    assert(offlineTaskRes.status === 503, 'GET /api/tasks returns HTTP 503 when DB is disconnected');
    assert(
      offlineTaskRes.body.message && offlineTaskRes.body.message.includes('MongoDB database is not connected'),
      'API returns clear actionable error message about database connection'
    );

    // -----------------------------------------------------------------
    // 3. Task Model Schema Validation (Mongoose ODM)
    // -----------------------------------------------------------------
    console.log('\n3. Testing Task Model Schema Validation (Mongoose ODM)');
    const invalidTask = new Task({ title: '' });
    const valError = invalidTask.validateSync();
    assert(valError && valError.errors && valError.errors.title, 'Model rejects empty title');

    const invalidStatusTask = new Task({ title: 'Test Task', status: 'invalid-status' });
    const statusError = invalidStatusTask.validateSync();
    assert(statusError && statusError.errors && statusError.errors.status, 'Model rejects invalid status enum');

    const invalidPriorityTask = new Task({ title: 'Test Task', priority: 'ultra-high' });
    const priorityError = invalidPriorityTask.validateSync();
    assert(priorityError && priorityError.errors && priorityError.errors.priority, 'Model rejects invalid priority enum');

    const validTask = new Task({
      title: 'College Submission Checklist',
      description: 'Verify all project deliverables',
      status: 'todo',
      priority: 'high',
      dueDate: new Date()
    });
    const validError = validTask.validateSync();
    assert(!validError, 'Model accepts valid task fields');

    // -----------------------------------------------------------------
    // 4. Testing End-to-End REST API Route Logic & CRUD Handling
    // -----------------------------------------------------------------
    console.log('\n4. Testing REST API Route Handlers & Input Validations');

    // Simulate database active readyState for controller testing
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    // In-memory mock store for controller integration
    const inMemoryTasks = new Map();
    const testId = new mongoose.Types.ObjectId().toString();

    // Stub Task methods to verify controller request/response cycles
    const origCreate = Task.create;
    const origFind = Task.find;
    const origFindById = Task.findById;
    const origFindByIdAndUpdate = Task.findByIdAndUpdate;
    const origFindByIdAndDelete = Task.findByIdAndDelete;

    Task.create = async (doc) => {
      const id = new mongoose.Types.ObjectId().toString();
      const task = {
        _id: id,
        id,
        title: doc.title,
        description: doc.description || '',
        status: doc.status || 'todo',
        priority: doc.priority || 'medium',
        dueDate: doc.dueDate || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryTasks.set(id, task);
      return task;
    };

    Task.find = (filter) => {
      return {
        sort: (sortOpts) => {
          let list = Array.from(inMemoryTasks.values());
          if (filter.status) list = list.filter((t) => t.status === filter.status);
          if (filter.priority) list = list.filter((t) => t.priority === filter.priority);
          return Promise.resolve(list);
        }
      };
    };

    Task.findById = async (id) => inMemoryTasks.get(id) || null;

    Task.findByIdAndUpdate = async (id, updates) => {
      const existing = inMemoryTasks.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      inMemoryTasks.set(id, updated);
      return updated;
    };

    Task.findByIdAndDelete = async (id) => {
      const existing = inMemoryTasks.get(id);
      if (!existing) return null;
      inMemoryTasks.delete(id);
      return existing;
    };

    // Test POST /api/tasks (Valid)
    const newTaskPayload = {
      title: 'Automated Test Task',
      description: 'Verifying end-to-end task creation via REST API',
      status: 'todo',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString()
    };
    const createRes = await request('POST', '/api/tasks', newTaskPayload);
    assert(createRes.status === 201, 'POST /api/tasks returns HTTP 201 Created');
    assert(createRes.body.success === true, 'Response contains success: true');
    assert(createRes.body.data.title === newTaskPayload.title, 'Created task matches title');
    const createdTaskId = createRes.body.data.id || createRes.body.data._id;
    assert(Boolean(createdTaskId), 'Task received valid MongoDB ObjectId');

    // Test Validation: Missing title
    const badCreateRes = await request('POST', '/api/tasks', { description: 'Missing title' });
    assert(badCreateRes.status === 400, 'POST /api/tasks with missing title returns HTTP 400 Bad Request');

    // Test Validation: Invalid status
    const badStatusRes = await request('POST', '/api/tasks', {
      title: 'Bad status task',
      status: 'flying'
    });
    assert(badStatusRes.status === 400, 'POST /api/tasks with invalid status returns HTTP 400 Bad Request');

    // Test Validation: Invalid priority
    const badPriorityRes = await request('POST', '/api/tasks', {
      title: 'Bad priority task',
      priority: 'super-urgent'
    });
    assert(badPriorityRes.status === 400, 'POST /api/tasks with invalid priority returns HTTP 400 Bad Request');

    // Test GET /api/tasks
    const getAllRes = await request('GET', '/api/tasks');
    assert(getAllRes.status === 200, 'GET /api/tasks returns HTTP 200 OK');
    assert(Array.isArray(getAllRes.body.data), 'GET /api/tasks returns array of tasks');
    assert(getAllRes.body.count >= 1, 'Task count reflects at least the created task');

    // Test GET /api/tasks/:id
    const getOneRes = await request('GET', `/api/tasks/${createdTaskId}`);
    assert(getOneRes.status === 200, `GET /api/tasks/${createdTaskId} returns HTTP 200`);
    assert(getOneRes.body.data.title === newTaskPayload.title, 'Fetched single task title matches');

    // Test Invalid MongoDB ID format (CastError / invalid id)
    const badIdRes = await request('GET', '/api/tasks/invalid-object-id-1234');
    assert(badIdRes.status === 400, 'GET with malformed ObjectId returns HTTP 400 Bad Request');

    // Test Non-existent MongoDB ID
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request('GET', `/api/tasks/${fakeId}`);
    assert(notFoundRes.status === 404, 'GET with non-existent ObjectId returns HTTP 404 Not Found');

    // Test PUT /api/tasks/:id
    const updatePayload = {
      title: 'Automated Test Task (Updated)',
      description: 'Updated description through PUT',
      priority: 'medium'
    };
    const putRes = await request('PUT', `/api/tasks/${createdTaskId}`, updatePayload);
    assert(putRes.status === 200, 'PUT /api/tasks/:id returns HTTP 200 OK');
    assert(putRes.body.data.title === updatePayload.title, 'Updated task title reflects change');
    assert(putRes.body.data.priority === 'medium', 'Updated task priority reflects change');

    // Test PATCH /api/tasks/:id/status (Kanban drag-and-drop endpoint)
    const patchRes = await request('PATCH', `/api/tasks/${createdTaskId}/status`, {
      status: 'in-progress'
    });
    assert(patchRes.status === 200, 'PATCH /api/tasks/:id/status returns HTTP 200');
    assert(patchRes.body.data.status === 'in-progress', "Task status successfully updated to 'in-progress'");

    const patchDoneRes = await request('PATCH', `/api/tasks/${createdTaskId}/status`, {
      status: 'done'
    });
    assert(patchDoneRes.status === 200, "PATCH /api/tasks/:id/status updates to 'done'");
    assert(patchDoneRes.body.data.status === 'done', "Task status successfully updated to 'done'");

    // Test PATCH with invalid status
    const patchBadRes = await request('PATCH', `/api/tasks/${createdTaskId}/status`, {
      status: 'invalid-status'
    });
    assert(patchBadRes.status === 400, 'PATCH /api/tasks/:id/status with invalid status returns HTTP 400 Bad Request');

    // Test DELETE /api/tasks/:id
    const deleteRes = await request('DELETE', `/api/tasks/${createdTaskId}`);
    assert(deleteRes.status === 200, 'DELETE /api/tasks/:id returns HTTP 200 OK');

    // Verify deletion
    const verifyDeleteRes = await request('GET', `/api/tasks/${createdTaskId}`);
    assert(verifyDeleteRes.status === 404, 'GET after DELETE returns HTTP 404 Not Found');

    // Test Unknown API route -> 404
    const unknownRes = await request('GET', '/api/non-existent-route');
    assert(unknownRes.status === 404, 'GET /api/non-existent-route returns HTTP 404');

    // Restore Task methods and readyState
    Task.create = origCreate;
    Task.find = origFind;
    Task.findById = origFindById;
    Task.findByIdAndUpdate = origFindByIdAndUpdate;
    Task.findByIdAndDelete = origFindByIdAndDelete;
    Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });

    console.log('\n===================================================================');
    console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('===================================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  process.exit(failed > 0 ? 1 : 0);
};

runTests();
