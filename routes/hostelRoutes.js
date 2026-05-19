import express from 'express'
import { createHostel } from '../controllers/hostelController.js';

const router = express.Router()



router.post("/admin/create", createHostel)


export default router;