import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const cors = require('cors');
const app = express();
const externalUrl = process.env.RENDER_EXTERNAL_URL;
const PORT = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Create HTTP server instance
const server = http.createServer(app);

// Create Socket.io server with CORS config to match your Express config
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || "https://kanboard-b03p.onrender.com",
}));

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false,
  },
});

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  // Handle joining a project room
  socket.on("join_project", (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`Client ${socket.id} joined project ${projectId}`);
  });
  
  // Handle leaving a project room
  socket.on("leave_project", (projectId) => {
    socket.leave(`project_${projectId}`);
    console.log(`Client ${socket.id} left project ${projectId}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// GET projects where the user is a collaborator
app.get('/projects/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT 
         p.id, 
         p.name,
         CASE WHEN p.userid = $1 THEN true ELSE false END AS "isCreator"
       FROM project_user pu
       JOIN project p ON pu.project_id = p.id
       WHERE pu.user_id = $1`,
      [userId]
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).send('Internal server error');
  }
});

// GET all collaborators on a specific project
app.get('/projects/:projectId/collaborators', async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const client = await pool.connect();

    const result = await client.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN project_user pu ON u.id = pu.user_id
       WHERE pu.project_id = $1`,
      [projectId]
    );

    client.release();

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).send('Internal server error');
  }
});


// POST create a new project
app.post('/projects/:userId', async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert project
    const projectResult = await client.query(
      'INSERT INTO project (name, userid) VALUES ($1, $2) RETURNING *',
      [name, userId]
    );
    const newProject = projectResult.rows[0];
    newProject.isCreator = true; // Set isCreator to true for the creator

    // Add creator as collaborator in project_user
    await client.query(
      'INSERT INTO project_user (project_id, user_id) VALUES ($1, $2)',
      [newProject.id, userId]
    );

    await client.query('COMMIT');
    res.status(201).json(newProject);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating project:', error);
    res.status(500).send('Internal server error');
  } finally {
    client.release();
  }
});


// DELETE a project and its collaborators
app.delete('/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete from project_user first due to FK constraint
    await client.query(
      'DELETE FROM project_user WHERE project_id = $1',
      [projectId]
    );

    const projectResult = await client.query(
      'DELETE FROM project WHERE id = $1 RETURNING id',
      [projectId]
    );

    await client.query('COMMIT');

    if (projectResult.rowCount === 0) {
       res.status(404).send('Project not found');
    }

    res.status(200).send('Project deleted successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting project:', error);
    res.status(500).send('Internal server error');
  } finally {
    client.release();
  }
});

// Leave a project (remove user from project_user)
app.delete('/projects/:projectId/leave/:userId', async (req, res) => {
  const { projectId, userId } = req.params;

  try {
    const client = await pool.connect();

    // Delete the user from project_user table
    const result = await client.query(
      `DELETE FROM project_user WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    client.release();

    if (result.rowCount === 0) {
      res.status(404).json({ message: "User is not part of the project." });
    }

    res.json({ message: "Successfully left the project." });
  } catch (error) {
    console.error("Error leaving project:", error);
    res.status(500).send("Internal server error");
  }
});



app.get('/tasks/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT 
         tasks.*, 
         users.name AS assigned_user_name 
       FROM tasks
       LEFT JOIN users ON tasks.assigned_to = users.id
       WHERE tasks.project_id = $1`,
      [projectId]
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).send('Internal server error');
  }
});


app.post("/tasks", async (req: Request, res: Response) => {
  const { title, description, status, assigned_to, project_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, assigned_to, project_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, status, assigned_to, project_id]
    );

    const newTask = result.rows[0];

    // Emit event to all clients in this project room
    io.to(`project_${project_id}`).emit("task_created", newTask);

    res.status(201).json(newTask);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.put("/tasks/:taskId", async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { title, description, status, user_id, assigned_to, project_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           status = $3,
           user_id = $4,
            assigned_to = $5,
           project_id = $6
       WHERE id = $7
       RETURNING *`,
      [title, description, status, user_id, assigned_to, project_id, taskId]
    );

    if (result.rowCount === 0) {
      res.status(404).send("Task not found");
      return;
    }

  const updatedTask = result.rows[0];

  // Fetch the full task with assigned user name
  const taskWithUser = await pool.query(
  `SELECT 
     tasks.*, 
     users.name AS assigned_user_name 
   FROM tasks 
   LEFT JOIN users ON tasks.assigned_to = users.id 
   WHERE tasks.id = $1`,
  [updatedTask.id]
  );

  const fullTask = taskWithUser.rows[0];

  // Emit updated task with user name
  io.to(`project_${project_id}`).emit("task_updated", fullTask);

  res.status(200).json(fullTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).send("Internal server error");
  }
});

app.delete("/tasks/:id", async (req, res) => {
  const taskId = parseInt(req.params.id);
  
  try {
    // First, get the project_id before deleting the task
    const taskResult = await pool.query("SELECT project_id FROM tasks WHERE id = $1", [taskId]);
    
    if (taskResult.rowCount === 0) {
      res.status(404).send("Task not found");
      return;
    }
    
    const projectId = taskResult.rows[0].project_id;
    
    // Delete the task
    await pool.query("DELETE FROM tasks WHERE id = $1", [taskId]);
    
    // Notify all clients in the project room about the deletion
    io.to(`project_${projectId}`).emit("task_deleted", { id: taskId, project_id: projectId });
    
    res.status(204).send(); 
  } catch (error) {
    console.error("Failed to delete task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

app.post('/users', async (req, res) => {
  const { id, name, email } = req.body;

  if (!id || !email) {
     res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO users (id, name, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
       RETURNING *`,
      [id, name, email]
    );
    client.release();

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error inserting user:', error);
    res.status(500).send('Internal server error');
  }
});

// Update to the send-request endpoint
app.post('/users/:userId/send-request', async (req, res) => {
  const { userId } = req.params;
  const { email, type, project_id } = req.body; // Now also accepting project_id

  if (!['friend', 'collab'].includes(type)) {
    res.status(400).json({ error: 'Invalid request type' });
    return;
  }

  // If it's a collab request, we need a project_id
  if (type === 'collab' && !project_id) {
    res.status(400).json({ error: 'Project ID is required for collaboration requests' });
    return;
  }

  try {
    const client = await pool.connect();

    // Fetch the target user's ID based on email
    const targetUserResult = await client.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );

    if (targetUserResult.rowCount === 0) {
      client.release();
      res.status(404).json({ error: 'User with this email not found' });
      return;
    }

    const targetUserId = targetUserResult.rows[0].id;

    // Check for existing pending request
    const existingRequest = await client.query(
      'SELECT id FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2 AND type = $3 AND status = \'pending\' AND (project_id = $4 OR project_id IS NULL)',
      [userId, targetUserId, type, project_id || null]
    );

    if (existingRequest?.rowCount && existingRequest.rowCount > 0) {
      client.release();
      res.status(409).json({ error: 'Request already pending' });
      return;
    }

    // Check if the user is already a collaborator
    if (type === 'collab') {
      const collaboratorCheck = await client.query(
        'SELECT * FROM project_user WHERE user_id = $1 AND project_id = $2',
        [targetUserId, project_id]
      );

      if (collaboratorCheck?.rowCount && collaboratorCheck.rowCount > 0) {
        client.release();
        res.status(409).json({ error: 'User is already a collaborator on this project' });
        return;
      }
    }

    // Insert new request - now including project_id for collab requests
    const result = await client.query(
      'INSERT INTO friend_requests (from_user_id, to_user_id, type, status, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, targetUserId, type, 'pending', type === 'collab' ? project_id : null]
    );

    client.release();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error sending request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/users/:userId/handle-request', async (req, res) => {
  const { userId } = req.params;
  const { requestId, accept } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch the request
    const requestResult = await client.query(
      `SELECT * FROM friend_requests WHERE id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );

    if (requestResult.rowCount === 0) {
      await client.query('ROLLBACK');
      client.release();
       res.status(404).json({ error: 'Request not found or already handled' });
    }

    const request = requestResult.rows[0];

    if (accept) {
      if (request.type === 'friend') {
        // Add to friends table
        await client.query(
          `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)`,
          [request.from_user_id, request.to_user_id]
        );
      } else if (request.type === 'collab') {
        // Add to project_user table
        await client.query(
          `INSERT INTO project_user (project_id, user_id) VALUES ($1, $2)`,
          [request.project_id, request.to_user_id]
        );
      }
    }

    // Update request status
    await client.query(
      `UPDATE friend_requests SET status = $1 WHERE id = $2`,
      [accept ? 'accepted' : 'rejected', requestId]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Request handled successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error handling request:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.delete('/users/:userId/friends/:friendId', async (req, res) => {
  const { userId, friendId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove from friends table
    await client.query(
      `DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    // Remove friend from projects owned by user
    await client.query(
      `DELETE FROM project_user
       WHERE user_id = $1 AND project_id IN (
         SELECT id FROM project WHERE userid = $2
       )`,
      [friendId, userId]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Friend and associated collaborations removed' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error removing friend:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update to the get-requests endpoint to include project information
app.get('/users/:userId/requests', async (req, res) => {
  const { userId } = req.params;

  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT fr.*, 
              u.name AS from_user_name, 
              u.email AS from_user_email,
              p.name AS project_name
       FROM friend_requests fr
       JOIN users u ON fr.from_user_id = u.id
       LEFT JOIN project p ON fr.project_id = p.id
       WHERE fr.to_user_id = $1 AND fr.status = 'pending'`,
      [userId]
    );
    client.release();
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/users/:userId/friends', async (req, res) => {
  const { userId } = req.params;

  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT u.id, u.name, u.email
       FROM friends f
       JOIN users u ON 
         (u.id = f.friend_id AND f.user_id = $1)
       WHERE f.user_id = $1 OR f.friend_id = $1`,
      [userId]
    );
    client.release();
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).send('Internal server error');
  }
});




// IMPORTANT: Use server.listen instead of app.listen
const hostname = '0.0.0.0';
server.listen(PORT, hostname, () => {
console.log(`Server running at http://${hostname}:${PORT}/ and from
outside on ${externalUrl}`);
});