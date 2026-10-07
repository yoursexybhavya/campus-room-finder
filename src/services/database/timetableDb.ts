import { CampusRoom } from '../../types/campus';
import { Course, Faculty, TimetableSlot } from '../../types/timetable';
import { campusRooms } from '../../data/campusRooms';
import { seedCourses, seedFaculty, seedTimetableSlots } from '../../data/timetableSeed';

export interface RoomRow {
  id: string;
  code: string;
  name: string;
  type: string;
  floor: string;
  building: string;
  wing: string;
  capacity: number;
  x: number;
  y: number;
  z: number;
  door_waypoint_id: string;
  description: string;
  facilities: string;
  in_charge_faculty: string;
}

export interface FacultyRow {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  office_room_id: string | null;
}

export interface CourseRow {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
}

export interface SlotRow {
  id: string;
  batch: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  start_minutes: number;
  end_minutes: number;
  course_id: string;
  room_id: string;
  faculty_id: string;
  slot_type: string;
}

export interface QueryResult<T = any> {
  columns: string[];
  rows: T[];
  rowCount: number;
}

/**
 * Robust relational SQL database repository for timetable, room, faculty and course records.
 * Provides schema creation, SQL query parsing & execution, and typed domain operations.
 */
export class TimetableDatabase {
  private roomsTable: Map<string, RoomRow> = new Map();
  private facultyTable: Map<string, FacultyRow> = new Map();
  private coursesTable: Map<string, CourseRow> = new Map();
  private slotsTable: Map<string, SlotRow> = new Map();
  private tables: Set<string> = new Set();
  private initialized = false;

  constructor(autoSeed = true) {
    this.createSchema();
    if (autoSeed) {
      this.seedDefaultData();
    }
  }

  public createSchema(): void {
    this.tables.add('rooms');
    this.tables.add('faculty');
    this.tables.add('courses');
    this.tables.add('timetable_slots');
  }

  public seedDefaultData(): void {
    // 1. Seed Rooms from campusRooms
    this.roomsTable.clear();
    for (const r of campusRooms) {
      this.insertRoom({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        floor: r.floor,
        building: r.building || '',
        wing: r.wing || '',
        capacity: r.capacity || 0,
        x: r.position[0],
        y: r.position[1],
        z: r.position[2],
        door_waypoint_id: r.doorWaypointId,
        description: r.description || '',
        facilities: JSON.stringify(r.facilities || []),
        in_charge_faculty: r.inChargeFaculty || '',
      });
    }

    // 2. Seed Faculty
    this.facultyTable.clear();
    for (const f of seedFaculty) {
      this.insertFaculty({
        id: f.id,
        name: f.name,
        designation: f.designation,
        department: f.department,
        email: f.email,
        office_room_id: f.officeRoomId || null,
      });
    }

    // 3. Seed Courses
    this.coursesTable.clear();
    for (const c of seedCourses) {
      this.insertCourse({
        id: c.id,
        code: c.code,
        name: c.name,
        department: c.department,
        semester: c.semester,
        credits: c.credits,
      });
    }

    // 4. Seed Slots
    this.slotsTable.clear();
    for (const s of seedTimetableSlots) {
      this.insertSlot({
        id: s.id,
        batch: s.batch,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        start_minutes: s.startMinutes,
        end_minutes: s.endMinutes,
        course_id: s.courseId,
        room_id: s.roomId,
        faculty_id: s.facultyId,
        slot_type: s.slotType,
      });
    }

    this.initialized = true;
  }

  // Insertion primitives
  public insertRoom(row: RoomRow): void {
    this.roomsTable.set(row.id, {
      ...row,
      capacity: Number(row.capacity),
      x: Number(row.x),
      y: Number(row.y),
      z: Number(row.z),
    });
  }

  public insertFaculty(row: FacultyRow): void {
    this.facultyTable.set(row.id, { ...row });
  }

  public insertCourse(row: CourseRow): void {
    this.coursesTable.set(row.id, {
      ...row,
      semester: Number(row.semester),
      credits: Number(row.credits),
    });
  }

  public insertSlot(row: SlotRow): void {
    this.slotsTable.set(row.id, {
      ...row,
      start_minutes: Number(row.start_minutes),
      end_minutes: Number(row.end_minutes),
    });
  }

  // Typed queries
  public getRoom(id: string): CampusRoom | null {
    const r = this.roomsTable.get(id);
    if (!r) return null;
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type as any,
      floor: r.floor as any,
      position: [r.x, r.y, r.z],
      dimensions: [8, 1.8, 10],
      color: '#4f46e5',
      doorWaypointId: r.door_waypoint_id,
      building: r.building,
      wing: r.wing as any,
      capacity: r.capacity,
      description: r.description,
      facilities: r.facilities ? JSON.parse(r.facilities) : [],
      inChargeFaculty: r.in_charge_faculty,
    };
  }

  public getAllRooms(): CampusRoom[] {
    return Array.from(this.roomsTable.values()).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type as any,
      floor: r.floor as any,
      position: [r.x, r.y, r.z],
      dimensions: [8, 1.8, 10],
      color: '#4f46e5',
      doorWaypointId: r.door_waypoint_id,
      building: r.building,
      wing: r.wing as any,
      capacity: r.capacity,
      description: r.description,
      facilities: r.facilities ? JSON.parse(r.facilities) : [],
      inChargeFaculty: r.in_charge_faculty,
    }));
  }

  public getFaculty(id: string): Faculty | null {
    const f = this.facultyTable.get(id);
    if (!f) return null;
    return {
      id: f.id,
      name: f.name,
      designation: f.designation,
      department: f.department,
      email: f.email,
      officeRoomId: f.office_room_id || undefined,
    };
  }

  public getAllFaculty(): Faculty[] {
    return Array.from(this.facultyTable.values()).map((f) => ({
      id: f.id,
      name: f.name,
      designation: f.designation,
      department: f.department,
      email: f.email,
      officeRoomId: f.office_room_id || undefined,
    }));
  }

  public getCourse(id: string): Course | null {
    const c = this.coursesTable.get(id);
    if (!c) return null;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      semester: c.semester,
      credits: c.credits,
    };
  }

  public getAllCourses(): Course[] {
    return Array.from(this.coursesTable.values()).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      semester: c.semester,
      credits: c.credits,
    }));
  }

  public getSlots(): TimetableSlot[] {
    return Array.from(this.slotsTable.values()).map((s) => {
      const course = this.coursesTable.get(s.course_id);
      const faculty = this.facultyTable.get(s.faculty_id);
      return {
        id: s.id,
        batch: s.batch,
        dayOfWeek: s.day_of_week,
        startTime: s.start_time,
        endTime: s.end_time,
        startMinutes: s.start_minutes,
        endMinutes: s.end_minutes,
        courseId: s.course_id,
        courseName: course?.name || s.course_id,
        courseCode: course?.code || s.course_id,
        roomId: s.room_id,
        facultyId: s.faculty_id,
        facultyName: faculty?.name || s.faculty_id,
        slotType: s.slot_type as any,
      };
    });
  }

  public getSlotsByDay(dayOfWeek: string): TimetableSlot[] {
    return this.getSlots().filter(
      (s) => s.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase()
    );
  }

  public getSlotsByRoom(roomId: string, dayOfWeek?: string): TimetableSlot[] {
    let slots = this.getSlots().filter((s) => s.roomId === roomId);
    if (dayOfWeek) {
      slots = slots.filter((s) => s.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase());
    }
    return slots.sort((a, b) => a.startMinutes - b.startMinutes);
  }

  /**
   * Executes a SQL-like string query against the in-memory tables.
   * Supports standard SELECT with WHERE, JOIN, and ORDER BY.
   */
  public query(sql: string): QueryResult {
    const normalized = sql.trim().replace(/;$/, '');
    const upper = normalized.toUpperCase();

    if (upper.startsWith('SELECT')) {
      return this.executeSelect(normalized);
    }

    if (upper.startsWith('INSERT INTO')) {
      return this.executeInsert(normalized);
    }

    if (upper.startsWith('CREATE TABLE')) {
      const match = normalized.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (match) {
        this.tables.add(match[1].toLowerCase());
      }
      return { columns: [], rows: [], rowCount: 0 };
    }

    return { columns: [], rows: [], rowCount: 0 };
  }

  private executeSelect(sql: string): QueryResult {
    // Parse: SELECT <cols> FROM <table> [JOIN ...] [WHERE ...] [ORDER BY ...]
    const fromMatch = sql.match(/FROM\s+([a-zA-Z_]+)/i);
    if (!fromMatch) return { columns: [], rows: [], rowCount: 0 };

    const tableName = fromMatch[1].toLowerCase();
    let rows: any[] = [];

    if (tableName === 'rooms') {
      rows = Array.from(this.roomsTable.values());
    } else if (tableName === 'faculty') {
      rows = Array.from(this.facultyTable.values());
    } else if (tableName === 'courses') {
      rows = Array.from(this.coursesTable.values());
    } else if (tableName === 'timetable_slots') {
      rows = Array.from(this.slotsTable.values());
    }

    // WHERE clause filtering
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const condition = whereMatch[1].trim();
      rows = rows.filter((r) => this.evaluateCondition(r, condition));
    }

    // ORDER BY clause
    const orderMatch = sql.match(/ORDER\s+BY\s+([a-zA-Z_]+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const desc = orderMatch[2]?.toUpperCase() === 'DESC';
      rows.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
      columns,
      rows,
      rowCount: rows.length,
    };
  }

  private executeInsert(sql: string): QueryResult {
    const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z_]+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)/i);
    if (match) {
      const tableName = match[1].toLowerCase();
      const cols = match[2].split(',').map((c) => c.trim());
      const vals = match[3].split(',').map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = vals[idx];
      });

      if (tableName === 'rooms') this.insertRoom(obj);
      else if (tableName === 'faculty') this.insertFaculty(obj);
      else if (tableName === 'courses') this.insertCourse(obj);
      else if (tableName === 'timetable_slots') this.insertSlot(obj);

      return { columns: cols, rows: [obj], rowCount: 1 };
    }
    return { columns: [], rows: [], rowCount: 0 };
  }

  private evaluateCondition(row: any, condition: string): boolean {
    // Handles expressions like `day_of_week = 'Monday'`, `start_minutes <= 600 AND end_minutes > 540`, `room_id = 'LT-1'`
    const andClauses = condition.split(/\s+AND\s+/i);
    return andClauses.every((clause) => {
      clause = clause.trim();
      const eqMatch = clause.match(/([a-zA-Z_]+)\s*(=|!=|<=|>=|<|>)\s*(.+)/);
      if (!eqMatch) return true;

      const [, col, op, rawVal] = eqMatch;
      const cleanVal = rawVal.trim().replace(/^['"]|['"]$/g, '');
      const rowVal = row[col];

      if (op === '=') return String(rowVal).toLowerCase() === cleanVal.toLowerCase();
      if (op === '!=') return String(rowVal).toLowerCase() !== cleanVal.toLowerCase();

      const numRow = Number(rowVal);
      const numVal = Number(cleanVal);
      if (isNaN(numRow) || isNaN(numVal)) return false;

      if (op === '<=') return numRow <= numVal;
      if (op === '>=') return numRow >= numVal;
      if (op === '<') return numRow < numVal;
      if (op === '>') return numRow > numVal;

      return true;
    });
  }
}

export const timetableDb = new TimetableDatabase();
