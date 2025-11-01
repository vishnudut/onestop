import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface CSVRow {
  [key: string]: string;
}

/**
 * Read a CSV file and return parsed data
 */
export async function readCSV(filename: string): Promise<CSVRow[]> {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });
  
  return result.data as CSVRow[];
}

/**
 * Write data to a CSV file (overwrites existing file)
 */
export async function writeCSV(filename: string, data: CSVRow[]): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  const csv = Papa.unparse(data);
  fs.writeFileSync(filePath, csv, 'utf-8');
}

/**
 * Append a single row to a CSV file
 */
export async function appendToCSV(filename: string, row: CSVRow): Promise<void> {
  const data = await readCSV(filename);
  data.push(row);
  await writeCSV(filename, data);
}

/**
 * Update rows in a CSV file that match a condition
 */
export async function updateCSV(
  filename: string,
  condition: (row: CSVRow) => boolean,
  updates: Partial<CSVRow>
): Promise<void> {
  const data = await readCSV(filename);
  const updatedData = data.map(row => {
    if (condition(row)) {
      return { ...row, ...updates };
    }
    return row;
  });
  await writeCSV(filename, updatedData);
}

/**
 * Find rows in a CSV file that match a condition
 */
export async function findInCSV(
  filename: string,
  condition: (row: CSVRow) => boolean
): Promise<CSVRow[]> {
  const data = await readCSV(filename);
  return data.filter(condition);
}

/**
 * Find a single row in a CSV file
 */
export async function findOneInCSV(
  filename: string,
  condition: (row: CSVRow) => boolean
): Promise<CSVRow | null> {
  const data = await readCSV(filename);
  return data.find(condition) || null;
}
