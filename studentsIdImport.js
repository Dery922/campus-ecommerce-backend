// import-data.js
import mongoose from "mongoose";
import xlsx from "xlsx";
import Student from "./models/Student.js"; // adjust path if needed

// 1️⃣ Connect to MongoDB
await mongoose.connect("mongodb://127.0.0.1:27017/campus-ecommerce");
console.log("✅ Connected to MongoDB");

// 2️⃣ Read the Excel file
const workbook = xlsx.readFile("./students.xlsx"); // path to your file
const sheetName = workbook.SheetNames[0]; // first sheet
const worksheet = workbook.Sheets[sheetName];

// 3️⃣ Convert sheet to JSON
// Add 'header: 1' to get an array of arrays instead of objects with bad keys
const studentsData = xlsx.utils.sheet_to_json(worksheet, { header: ["student_id", "name", "program"] });

console.log(`📄 Found ${studentsData.length} students`);

// 4️⃣ Save data to MongoDB
for (const student of studentsData) {
  try {
    console.log(student);
    // if you have a unique field like studentId, use upsert to avoid duplicates
    await Student.updateOne(
      { studentId: student.student_id }, // replace with your unique field
      { $set: student },
      { upsert: true }
    );
    console.log(`✔️ Imported/Updated student: ${student.name}`);
  } catch (err) {
    console.error(`❌ Error importing student: ${student.name}`, err.message);
  }
}

console.log("🎉 Import finished!");
process.exit();