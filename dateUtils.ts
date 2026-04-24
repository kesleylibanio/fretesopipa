
/**
 * Normalizes any date input to the fixed Brazilian format "DD/MM/AAAA".
 * Prevents timezones, ISO conversions, or "T00:00" suffixes.
 */
export const formatDateToBR = (dateInput: any): string => {
  if (!dateInput) return "";
  const str = String(dateInput).trim();
  if (!str) return "";

  // If it's already in a messed up format like "06T03:00:00.000Z/04/2026"
  // or contains "T", try to extract components.
  
  // Case 1: YYYY-MM-DD (standard ISO date part)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split('-');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // Case 2: DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const [d, m, y] = str.split('/');
    // Check if the year part got messed up with time info
    const cleanY = y.split('T')[0].split(' ')[0].substring(0, 4);
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${cleanY}`;
  }

  // Case 3: Messed up format seen in user report "06T03:00:00.000Z/04/2026"
  // This looks like Day then "T..." then /Month/Year
  if (str.includes('T') && str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const dPart = parts[0].split('T')[0];
      const mPart = parts[1];
      const yPart = parts[2].substring(0, 4);
      return `${dPart.padStart(2, '0')}/${mPart.padStart(2, '0')}/${yPart}`;
    }
  }

  // Fallback: Try JS Date parsing BUT carefully strip timezone shifts
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // Use getUTC methods to avoid local timezone shifts if it's an ISO string
      if (str.includes('T')) {
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } else {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
    }
  } catch (e) {}

  return str; // Return as is if all else fails
};

/**
 * Converts "DD/MM/AAAA" to "YYYY-MM-DD" for HTML <input type="date"> elements.
 */
export const formatDateToISO = (dateBR: string): string => {
  if (!dateBR || !dateBR.includes('/')) return "";
  const [d, m, y] = dateBR.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};
