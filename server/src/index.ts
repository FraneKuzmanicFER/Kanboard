import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const cors = require('cors');
const app = express();
const PORT = 3000;

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
  origin: process.env.CLIENT_URL,
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
      `SELECT p.id, p.name
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


app.get('/tasks/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM tasks WHERE project_id = $1',
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
  const { title, description, status, user_id, project_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, user_id, project_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, status, user_id, project_id]
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
  const { title, description, status, user_id, project_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           status = $3,
           user_id = $4,
           project_id = $5
       WHERE id = $6
       RETURNING *`,
      [title, description, status, user_id, project_id, taskId]
    );

    if (result.rowCount === 0) {
      res.status(404).send("Task not found");
      return;
    }

    const updatedTask = result.rows[0];
    
    // Emit event to all clients in this project room
    io.to(`project_${project_id}`).emit("task_updated", updatedTask);
    
    res.status(200).json(updatedTask);
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

// IMPORTANT: Use server.listen instead of app.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT} with Socket.io`));