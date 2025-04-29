import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const cors = require('cors');
const app = express();
const PORT = 3000;

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

app.get('/projects/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, name FROM project WHERE userid = $1',
      [userId]
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).send('Internal server error' );
  }
});

app.post('/projects/:userId', async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO project (name, userid) VALUES ($1, $2) RETURNING *',
      [name, userId]
    );
    client.release();
    res.status(201).json(result.rows[0]);  // Send back the created project
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).send('Internal server error');
  }
});

app.delete('/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const client = await pool.connect();
    const result = await client.query(
      'DELETE FROM project WHERE id = $1 RETURNING id',
      [projectId]
    );
    client.release();
    
    if (result.rowCount === 0) {
      res.status(404).send('Project not found');
    }

    res.status(200).send('Project deleted successfully');
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).send('Internal server error');
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

    res.status(201).json(result.rows[0]);
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
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).send("Internal server error");
  }
});

app.delete("/tasks/:id", async (req, res) => {
  const taskId = parseInt(req.params.id);
  try {
    await pool.query("DELETE FROM tasks WHERE id = $1", [taskId]);
    res.status(204).send(); 
  } catch (error) {
    console.error("Failed to delete task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});



  
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));