import * as XLSX from 'xlsx';
import { DayOfWeek, ImportScheduleResult, MonthlyRecapRow, TeacherScheduleRow, YearlyReportRow } from '../types';

export const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Parse file Excel jadwal mingguan
export async function parseScheduleExcel(file: File): Promise<ImportScheduleResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  const errors: string[] = [];
  const parsedSchedules: TeacherScheduleRow[] = [];

  if (rawRows.length === 0) {
    errors.push('File Excel kosong atau tidak memiliki baris data.');
    return {
      schedules: [],
      detectedWeeklyHolidays: [...ALL_DAYS],
      activeDays: [],
      errors,
    };
  }

  // Helper untuk membaca nilai kolom case-insensitive & bebas spasi
  const getNumVal = (row: Record<string, any>, ...possibleKeys: string[]): number => {
    const keys = Object.keys(row);
    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === target);
      if (found && row[found] !== undefined && row[found] !== '') {
        const parsed = parseFloat(row[found]);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
    return 0;
  };

  const getStringVal = (row: Record<string, any>, ...possibleKeys: string[]): string => {
    const keys = Object.keys(row);
    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === target);
      if (found && row[found] !== undefined && row[found] !== '') {
        return String(row[found]).trim();
      }
    }
    return '';
  };

  rawRows.forEach((row, index) => {
    const teacherName = getStringVal(row, 'namaguru', 'guru', 'nama', 'teacher');
    if (!teacherName) {
      return; // lewati jika nama kosong
    }

    const senin = getNumVal(row, 'senin', 'mon');
    const selasa = getNumVal(row, 'selasa', 'tue');
    const rabu = getNumVal(row, 'rabu', 'wed');
    const kamis = getNumVal(row, 'kamis', 'thu');
    const jumat = getNumVal(row, 'jumat', 'jumat', 'jum at', 'fri');
    const sabtu = getNumVal(row, 'sabtu', 'sat');
    const minggu = getNumVal(row, 'minggu', 'ahad', 'sun');

    const tahfidzSenin = getNumVal(row, 'tahfidzsenin', 'tahfidz senin');
    const tahfidzSelasa = getNumVal(row, 'tahfidzselasa', 'tahfidz selasa');
    const tahfidzRabu = getNumVal(row, 'tahfidzrabu', 'tahfidz rabu');
    const tahfidzKamis = getNumVal(row, 'tahfidzkamis', 'tahfidz kamis');
    const tahfidzJumat = getNumVal(row, 'tahfidzjumat', 'tahfidz jum at', 'tahfidzjumat');
    const tahfidzSabtu = getNumVal(row, 'tahfidzsabtu', 'tahfidz sabtu');
    const tahfidzMinggu = getNumVal(row, 'tahfidzminggu', 'tahfidz minggu', 'tahfidzahad');

    parsedSchedules.push({
      id: `sch-${Date.now()}-${index + 1}`,
      teacherId: '',
      teacherName,
      senin,
      selasa,
      rabu,
      kamis,
      jumat,
      sabtu,
      minggu,
      tahfidzSenin,
      tahfidzSelasa,
      tahfidzRabu,
      tahfidzKamis,
      tahfidzJumat,
      tahfidzSabtu,
      tahfidzMinggu,
    });
  });

  // Deteksi otomatis hari libur pekanan:
  // "jika pada jadwal terdapat hari yang didalamnya tidak ada jadwal sama sekali berarti itu adalah libur pekanan dan secara otomatis sistem akan menandainya sebagai hari libur"
  const dayTotalHours: Record<DayOfWeek, number> = {
    Senin: 0,
    Selasa: 0,
    Rabu: 0,
    Kamis: 0,
    Jumat: 0,
    Sabtu: 0,
    Minggu: 0,
  };

  parsedSchedules.forEach(s => {
    dayTotalHours.Senin += (s.senin + s.tahfidzSenin);
    dayTotalHours.Selasa += (s.selasa + s.tahfidzSelasa);
    dayTotalHours.Rabu += (s.rabu + s.tahfidzRabu);
    dayTotalHours.Kamis += (s.kamis + s.tahfidzKamis);
    dayTotalHours.Jumat += (s.jumat + s.tahfidzJumat);
    dayTotalHours.Sabtu += (s.sabtu + s.tahfidzSabtu);
    dayTotalHours.Minggu += (s.minggu + s.tahfidzMinggu);
  });

  const detectedWeeklyHolidays: DayOfWeek[] = [];
  const activeDays: DayOfWeek[] = [];

  ALL_DAYS.forEach(day => {
    if (dayTotalHours[day] === 0) {
      detectedWeeklyHolidays.push(day);
    } else {
      activeDays.push(day);
    }
  });

  return {
    schedules: parsedSchedules,
    detectedWeeklyHolidays,
    activeDays,
    errors,
  };
}

// Download format template Excel jadwal sesuai spesifikasi pengguna:
// senin 1, selasa 1, rabu 2, kamis 3, jum'at 0, sabtu 1, minggu 2,
// tahfidz senin 2, tahfidz selasa 1, tahfidz rabu 1, tahfidz kamis 2, tahfidz jum'at 0, tahfidz sabtu 2, tahfidz minggu 2
export function downloadScheduleTemplate() {
  const sampleData = [
    {
      'Nama Guru': 'Ust. Ahmad Fauzi, S.Pd.I',
      'Senin': 1,
      'Selasa': 1,
      'Rabu': 2,
      'Kamis': 3,
      "Jum'at": 0,
      'Sabtu': 1,
      'Minggu': 2,
      'Tahfidz Senin': 2,
      'Tahfidz Selasa': 1,
      'Tahfidz Rabu': 1,
      'Tahfidz Kamis': 2,
      "Tahfidz Jum'at": 0,
      'Tahfidz Sabtu': 2,
      'Tahfidz Minggu': 2,
    },
    {
      'Nama Guru': 'Usth. Siti Maryam, S.Pd',
      'Senin': 2,
      'Selasa': 2,
      'Rabu': 2,
      'Kamis': 2,
      "Jum'at": 0,
      'Sabtu': 0,
      'Minggu': 0,
      'Tahfidz Senin': 1,
      'Tahfidz Selasa': 1,
      'Tahfidz Rabu': 0,
      'Tahfidz Kamis': 0,
      "Tahfidz Jum'at": 0,
      'Tahfidz Sabtu': 0,
      'Tahfidz Minggu': 0,
    },
    {
      'Nama Guru': 'Ust. Muhammad Rizky, Lc',
      'Senin': 0,
      'Selasa': 2,
      'Rabu': 2,
      'Kamis': 2,
      "Jum'at": 0,
      'Sabtu': 2,
      'Minggu': 1,
      'Tahfidz Senin': 2,
      'Tahfidz Selasa': 2,
      'Tahfidz Rabu': 2,
      'Tahfidz Kamis': 2,
      "Tahfidz Jum'at": 0,
      'Tahfidz Sabtu': 2,
      'Tahfidz Minggu': 1,
    },
  ];

  const petunjukData = [
    {
      'Petunjuk Pengisian Format Jadwal': '1. Isi kolom "Nama Guru" dengan nama lengkap pendidik.',
    },
    {
      'Petunjuk Pengisian Format Jadwal': '2. Kolom jam mengajar: Senin, Selasa, Rabu, Kamis, Jum\'at, Sabtu, Minggu (angka jam, misal: 1, 2, 0).',
    },
    {
      'Petunjuk Pengisian Format Jadwal': '3. Kolom jam tahfidz: Tahfidz Senin, Tahfidz Selasa, Tahfidz Rabu, Tahfidz Kamis, Tahfidz Jum\'at, Tahfidz Sabtu, Tahfidz Minggu.',
    },
    {
      'Petunjuk Pengisian Format Jadwal': '4. DETEKSI LIBUR PEKANAN OTOMATIS: Jika pada suatu hari (misal Jum\'at) nilai jam mengajar dan tahfidz di semua guru adalah 0, sistem otomatis menandainya sebagai LIBUR PEKANAN.',
    },
  ];

  const wb = XLSX.utils.book_new();
  const wsJadwal = XLSX.utils.json_to_sheet(sampleData);
  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData);

  wsJadwal['!cols'] = [
    { wch: 28 }, // Nama Guru
    { wch: 8 },  // Senin
    { wch: 8 },  // Selasa
    { wch: 8 },  // Rabu
    { wch: 8 },  // Kamis
    { wch: 8 },  // Jum'at
    { wch: 8 },  // Sabtu
    { wch: 8 },  // Minggu
    { wch: 14 }, // Tahfidz Senin
    { wch: 14 }, // Tahfidz Selasa
    { wch: 14 }, // Tahfidz Rabu
    { wch: 14 }, // Tahfidz Kamis
    { wch: 14 }, // Tahfidz Jum'at
    { wch: 14 }, // Tahfidz Sabtu
    { wch: 14 }, // Tahfidz Minggu
  ];

  wsPetunjuk['!cols'] = [{ wch: 90 }];

  XLSX.utils.book_append_sheet(wb, wsJadwal, 'Jadwal_Guru');
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');

  XLSX.writeFile(wb, 'Template_Jadwal_Guru_absensi-on.xlsx');
}

// Ekspor Rekap Bulanan ke Excel
export function exportMonthlyRecapExcel(rows: MonthlyRecapRow[], periodTitle: string) {
  const exportData = rows.map((r, i) => ({
    'No': i + 1,
    'Nama Guru': r.teacherName,
    'Periode': r.period,
    'Target Mengajar (Jam)': r.targetTeaching,
    'Realisasi Mengajar (Jam)': r.actualTeaching,
    'Target Tahfidz (Jam)': r.targetTahfidz,
    'Realisasi Tahfidz (Jam)': r.actualTahfidz,
    'Total Target (Jam)': r.totalTarget,
    'Total Realisasi (Jam)': r.totalActual,
    'Persentase (%)': `${r.percentage}%`,
    'Selisih Mengajar (Jam)': r.diffTeaching > 0 ? `+${r.diffTeaching}` : r.diffTeaching,
    'Selisih Tahfidz (Jam)': r.diffTahfidz > 0 ? `+${r.diffTahfidz}` : r.diffTahfidz,
    'Status': r.status,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 28 }, // Nama Guru
    { wch: 16 }, // Periode
    { wch: 20 }, // Target Mengajar
    { wch: 22 }, // Realisasi Mengajar
    { wch: 18 }, // Target Tahfidz
    { wch: 20 }, // Realisasi Tahfidz
    { wch: 18 }, // Total Target
    { wch: 18 }, // Total Realisasi
    { wch: 15 }, // Persentase
    { wch: 20 }, // Selisih Mengajar
    { wch: 20 }, // Selisih Tahfidz
    { wch: 16 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Bulanan');
  const filename = `Rekap_Bulanan_${periodTitle.replace(/\s+/g, '_')}_absensi-on.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Ekspor Laporan Tahunan ke Excel
export function exportYearlyReportExcel(rows: YearlyReportRow[], periodTitle: string) {
  const exportData = rows.map((r, i) => ({
    'No': i + 1,
    'Nama Guru': r.teacherName,
    'Periode': r.period,
    'Target Jam Jadwal': r.targetTotalHours,
    'Realisasi Jam Jadwal': r.actualTotalHours,
    'Persentase (%)': `${r.percentage}%`,
    'Realisasi Mengajar (Jam)': r.actualTeaching,
    'Realisasi Tahfidz (Jam)': r.actualTahfidz,
    'Status': r.status,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 28 }, // Nama Guru
    { wch: 14 }, // Periode
    { wch: 20 }, // Target Jam Jadwal
    { wch: 20 }, // Realisasi Jam Jadwal
    { wch: 16 }, // Persentase
    { wch: 22 }, // Realisasi Mengajar
    { wch: 22 }, // Realisasi Tahfidz
    { wch: 16 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Laporan_Tahunan');
  const filename = `Laporan_Tahunan_${periodTitle.replace(/\s+/g, '_')}_absensi-on.xlsx`;
  XLSX.writeFile(wb, filename);
}
