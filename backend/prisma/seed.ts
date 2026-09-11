import "dotenv/config";
import { prisma } from "../server/lib/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  const departments = [
    "Administration",
    "Faculty",
    "Security",
    "IT Department",
    "Facilities",
    "Hostel",
    "Library",
  ];

  for (const name of departments) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Department: ${dept.name}`);
  }

  const defaultUsers = [
    { email: "admin@iiitn.ac.in", password: "Admin@123", role: "admin" as const, name: "Admin" },
    { email: "warden@iiitn.ac.in", password: "Warden@123", role: "warden" as const, name: "Chief Warden (Hostel Block A)" },
    { email: "faculty@iiitn.ac.in", password: "Host@123", role: "host" as const, name: "Dr. Amit Sharma (CSE Faculty)" },
    { email: "host@iiitn.ac.in", password: "Host@123", role: "host" as const, name: "Dr. Amit Sharma (CSE Faculty)" },
    { email: "guard@iiitn.ac.in", password: "Guard@123", role: "guard" as const, name: "Main Gate Security Checkpoint" },
    { email: "bt23cse026@iiitn.ac.in", password: "Student@123", role: "student" as const, name: "Ram Krishna", roll_number: "BT23CSE026" },
    { email: "student@iiitn.ac.in", password: "Student@123", role: "student" as const, name: "Aarav Sharma", roll_number: "BT23CSE001" },
    { email: "visitor@gmail.com", password: "Visitor@123", role: "visitor" as const, name: "Guest Visitor" },
  ];

  await prisma.host.updateMany({
    data: { roll_number: null },
  });

  for (const u of defaultUsers) {
    const password_hash = await bcrypt.hash(u.password, 10);
    const existing = await prisma.host.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.host.update({
        where: { email: u.email },
        data: {
          name: u.name,
          password_hash,
          role: u.role,
          is_verified: true,
          ...("roll_number" in u && u.roll_number ? { roll_number: u.roll_number } : {}),
        },
      });
    } else {
      await prisma.host.create({
        data: {
          email: u.email,
          name: u.name,
          password_hash,
          role: u.role,
          is_verified: true,
          roll_number: "roll_number" in u ? u.roll_number : null,
        },
      });
    }
    console.log(`User seeded: ${u.email} (${u.role})`);
  }

  try {
    const adminIIITN = await prisma.host.findUnique({ where: { email: "admin@iiitn.ac.in" } });
    const hostIIITN =
      (await prisma.host.findUnique({ where: { email: "faculty@iiitn.ac.in" } })) ||
      (await prisma.host.findUnique({ where: { email: "host@iiitn.ac.in" } }));

    const oldGmailHosts = await prisma.host.findMany({
      where: {
        email: { in: ["admin@gmail.com", "host@gmail.com", "guard@gmail.com", "warden@gmail.com", "student@gmail.com"] },
      },
    });

    for (const oldH of oldGmailHosts) {
      const targetHostId = oldH.role === "host" && hostIIITN ? hostIIITN.id : adminIIITN?.id || oldH.id;
      if (targetHostId !== oldH.id) {
        await prisma.visit.updateMany({
          where: { host_id: oldH.id },
          data: { host_id: targetHostId },
        });
      }
      await prisma.host.delete({ where: { id: oldH.id } }).catch(() => {});
      console.log(`Cleaned up obsolete staff account: ${oldH.email}`);
    }
  } catch (cleanErr) {
    console.error("Cleanup notice:", cleanErr);
  }

  console.log("Seeding Indian students dataset for Hostel Block A (10 Floors)...");

  await prisma.studentMovement.deleteMany({});
  await prisma.hostelLeave.deleteMany({});
  await prisma.student.deleteMany({});

  const girlNames = [
    "Aditi", "Ananya", "Anushka", "Bhavya", "Divya", "Jaya", "Khushi",
    "Meera", "Neha", "Pooja", "Priya", "Riya", "Sakshi", "Sanika",
    "Shreya", "Sneha", "Vaishnavi", "Zoya", "Ritika", "Tanvi",
  ];

  const boyNames = [
    "Aarav", "Aditya", "Akash", "Aniket", "Aryan", "Ayush", "Chetan", "Dev",
    "Gaurav", "Harsh", "Ishaan", "Kartik", "Kunal", "Manish", "Mohit", "Nikhil",
    "Pranav", "Rahul", "Rohan", "Sameer", "Sarthak", "Siddharth", "Tanmay",
    "Utkarsh", "Varun", "Vedant", "Vikas", "Yash", "Abhishek", "Rishabh",
  ];

  const lastNames = [
    "Sharma", "Verma", "Patil", "Deshmukh", "Gupta", "Singh", "Kumar", "Mishra",
    "Joshi", "Kulkarni", "Choudhary", "Reddy", "Nair", "Iyer", "Banerjee", "Chatterjee",
    "Agarwal", "Bhatia", "Mehta", "Shah", "Pandey", "Tiwari", "Yadav", "Rao",
    "Saxena", "Bose", "Ghosh", "Jadhav", "Shinde", "Pawar",
  ];

  const branchConfigs = [
    { code: "CSE", name: "Computer Science & Engg" },
    { code: "CSA", name: "AI & Machine Learning (CSA)" },
    { code: "ECE", name: "Electronics & Comm. Engg" },
    { code: "HCI", name: "Human-Computer Interaction (HCI)" },
  ];

  const batchYearPrefixes: Record<number, string> = {
    1: "26",
    2: "25",
    3: "24",
    4: "23",
  };

  const studentsData = [];

  studentsData.push({
    roll_number: "BT23CSE026",
    name: "Ram Krishna",
    email: "bt23cse026@iiitn.ac.in",
    phone: "9823456789",
    hostel_block: "Hostel Block A",
    room_number: "926",
    branch: "Computer Science & Engg",
    year: 4,
    parent_name: "Krishna Family",
    parent_phone: "919876543210",
    status: "inside",
  });

  let girlRoomIdx = 1;
  const boyRoomIndices: Record<number, number> = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 };

  for (let year = 1; year <= 4; year++) {
    const yearPrefix = batchYearPrefixes[year];

    for (let j = 1; j <= 20; j++) {
      const isGirl = j <= 5;
      const branchObj = branchConfigs[(j + year) % branchConfigs.length];
      const rollSeq = String(j + (year - 1) * 20).padStart(3, "0");
      const roll_number = `BT${yearPrefix}${branchObj.code}${rollSeq}`;

      if (roll_number === "BT23CSE026") continue;

      const fn = isGirl
        ? girlNames[(j * 2 + year) % girlNames.length]
        : boyNames[(j * 3 + year) % boyNames.length];
      const ln = lastNames[(j * 5 + year * 7) % lastNames.length];
      const name = `${fn} ${ln}`;
      const email = `${roll_number.toLowerCase()}@iiitn.ac.in`;
      const hostel_block = "Hostel Block A";

      let room_number = "101";
      if (isGirl) {
        const offset = String((girlRoomIdx % 53) + 1).padStart(2, "0");
        room_number = `1${offset}`;
        girlRoomIdx++;
      } else {
        let floor = 2;
        if (year === 1) {
          floor = j % 2 === 0 ? 2 : 3;
        } else if (year === 2) {
          floor = j % 2 === 0 ? 4 : 5;
        } else if (year === 3) {
          floor = 6 + (j % 3);
        } else {
          floor = j % 2 === 0 ? 9 : 10;
        }
        const offset = String((boyRoomIndices[floor] % 53) + 1).padStart(2, "0");
        room_number = `${floor}${offset}`;
        boyRoomIndices[floor]++;
      }

      const branch = branchObj.name;
      const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const parent_name = `${ln} Family`;
      const parent_phone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;

      let status = "inside";
      if (j % 7 === 0) status = "on_leave";
      else if (j % 4 === 0) status = "out_day";

      studentsData.push({
        roll_number,
        name,
        email,
        phone,
        hostel_block,
        room_number,
        branch,
        year,
        parent_name,
        parent_phone,
        status,
      });
    }
  }

  function getCurfewISTForDate(baseDate: Date = new Date()): Date {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(baseDate.getTime() + IST_OFFSET_MS);
    const y = istTime.getUTCFullYear();
    const m = istTime.getUTCMonth();
    const d = istTime.getUTCDate();
    return new Date(Date.UTC(y, m, d, 16, 0, 0, 0));
  }

  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { roll_number: s.roll_number },
      update: s,
      create: s,
    });

    if (s.status === "out_day") {
      const now = new Date();
      const exitTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 48, 0);
      const expectedIn = getCurfewISTForDate(exitTime);

      await prisma.studentMovement.create({
        data: {
          student_id: student.id,
          movement_type: "day_outing",
          exit_time: exitTime,
          exit_gate: "Main Gate",
          expected_in: expectedIn,
          purpose: "Market / Dinner",
          is_overdue: false,
        },
      });
    } else if (s.status === "on_leave") {
      const fromDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const toDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const leave = await prisma.hostelLeave.create({
        data: {
          student_id: student.id,
          leave_type: "vacation",
          from_date: fromDate,
          to_date: toDate,
          destination: "Home Visit (Nagpur / Mumbai / Pune)",
          reason: "Family Function / Semester Break",
          status: "approved",
          approved_by: "Hostel Warden Office",
          approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.studentMovement.create({
        data: {
          student_id: student.id,
          movement_type: "hostel_leave",
          exit_time: fromDate,
          exit_gate: "Main Gate",
          expected_in: toDate,
          leave_id: leave.id,
          purpose: "Approved Vacation Leave",
        },
      });
    }
  }

  const pendingStudents = await prisma.student.findMany({
    where: { status: "inside" },
    take: 4,
  });

  for (const ps of pendingStudents) {
    await prisma.hostelLeave.create({
      data: {
        student_id: ps.id,
        leave_type: "home_visit",
        from_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        to_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        destination: "Bhopal / Indore / Hyderabad",
        reason: "Attending sister's wedding ceremony",
        status: "pending",
      },
    });
  }

  console.log(`Seeded ${studentsData.length} Indian students with movements and leaves.`);
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
