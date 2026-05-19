// scripts/importStudents.js

import xlsx from "xlsx";
import Student from "../models/Student.js";
import connectDB from "../config/db.js";

await connectDB();

const workbook = xlsx.readFile("./students.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const students = xlsx.utils.sheet_to_json(sheet);

for (const student of students) {
  await Student.create({
    studentId: student.student_id,
    name: student.name,
    program: student.program
  });
}

console.log("Students imported successfully");
process.exit();