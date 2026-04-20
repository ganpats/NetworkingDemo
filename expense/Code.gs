const SHEET_ID = '125RFo1wzfG4ne2tw7ugMesHWDQ-8PpQsUlFmV5EI8Es';
const TRANSACTIONS_SHEET = 'Transactions';
const CATALOG_SHEET = 'Catalog';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// Utility to normalize unit to a standard base (we use grams for mass and ml for volume)
function toStandardUnit(quantity, unit) {
  unit = (unit || '').toString().toLowerCase().trim();
  let q = parseFloat(quantity) || 0;
  // mass units -> grams
  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') return {value: q * 1000, base: 'g'};
  if (unit === 'g' || unit === 'gram' || unit === 'grams') return {value: q, base: 'g'};
  // volume -> milliliters
  if (unit === 'l' || unit === 'litre' || unit === 'liter') return {value: q * 1000, base: 'ml'};
  if (unit === 'ml' || unit === 'milliliter' || unit === 'millilitre') return {value: q, base: 'ml'};
  // pieces / each -> leave as 'each' base
  const eachUnits = ['each', 'pc', 'pcs', 'piece', 'pieces', 'packet', 'pkt', 'box', 'bottle', 'can', 'unit', 'units'];
  if (eachUnits.includes(unit)) return {value: q, base: 'each'};
  // fallback: treat as 'each'
  return {value: q, base: unit || 'each'};
}

/**
 * Helper to parse dates from sheet cells (could be Date object or DD/MM/YYYY string)
 */
function parseDateString(dateStr) {
  if (dateStr instanceof Date) return dateStr;
  if (!dateStr) return null;
  const parts = dateStr.toString().split('/');
  if (parts.length === 3) {
    // DD/MM/YYYY
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
}

function calcPricePerStandardUnit(quantity, unit, price) {
  const raw = toStandardUnit(quantity, unit);
  let priceNum = parseFloat(price) || 0;
  if (raw.value === 0) return {pricePer: 0, base: raw.base};
  return {pricePer: priceNum / raw.value, base: raw.base}; // price per 1 gram/ml/each
}

/**
 * Handle GET requests with action routing
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || '';
    
    if (action === 'search') {
      const q = params.q || '';
      const results = searchItems(q);
      return sendJSON(results);
    } 
    else if (action === 'last') {
      const item = params.item || '';
      const result = getLastForItem(item);
      return sendJSON(result);
    } 
    else {
      // Default: return all items from Transactions sheet
      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
      const data = sheet.getRange(1, 1, sheet.getLastRow(), 4).getValues();

      const itemsMap = {};
      for (let i = 1; i < data.length; i++) {
        const [date, amount, particular, shop] = data[i];
        if (particular) {
          itemsMap[particular] = {
            lastDate: date,
            lastAmount: amount,
            lastShop: shop
          };
        }
      }

      return sendJSON(itemsMap);
    }
  } catch (err) {
    return sendJSON({ status: "error", message: err.message });
  }
}

/**
 * Handle POST requests - saves transactions and updates catalog
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { date, shop, items } = body;

    if (!items || !items.length) {
      return sendJSON({ status: "error", message: "No items provided" });
    }

    const ss = getSpreadsheet();
    const transactionSheet = ss.getSheetByName(TRANSACTIONS_SHEET);
    const catalogSheet = ss.getSheetByName(CATALOG_SHEET);

    items.forEach(item => {
      const { particular, quantity, unit, pricePaid, notes } = item;
      const amount = pricePaid || 0;
      const priceCalc = calcPricePerStandardUnit(quantity, unit, pricePaid);
      const unitSizeText = quantity && unit ? (quantity + unit) : (quantity || unit || '');

      // 1. Save to transactions sheet (Transactions)
      // Fields: TransactionDate, Particular, Quantity, Unit, UnitSizeText, PricePaid, PricePerStandardUnit, ShopName, Notes
      transactionSheet.appendRow([
        date,
        particular,
        quantity,
        unit,
        unitSizeText,
        amount,
        priceCalc.pricePer,
        shop,
        notes
      ]);

      // 2. Update catalog with latest purchase info
      if (catalogSheet) {
        upsertCatalogRow(
          catalogSheet,
          particular,
          date,
          quantity,
          unit,
          unitSizeText,
          amount,
          priceCalc.pricePer,
          priceCalc.base,
          notes
        );
      }
    });

    return sendJSON({ status: "success", message: "Expense saved and catalog updated" });
  } catch (err) {
    return sendJSON({ status: "error", message: err.message });
  }
}

/**
 * 🔹 Helper to send JSON response
 * Note: Google Apps Script automatically adds CORS headers when deployed with "Anyone" access
 */
function sendJSON(obj) {
  const output = JSON.stringify(obj, function(key, value) {
    if (this[key] instanceof Date) {
      return Utilities.formatDate(this[key], Session.getScriptTimeZone(), "dd/MM/yyyy");
    }
    return value;
  });
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Upsert a row in the Catalog sheet
 */
function upsertCatalogRow(sheet, particular, date, qty, unit, unitSizeText, pricePaid, pricePerStd, base, notes) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  // find row with same particular (case-insensitive)
  let foundRow = null;
  for (let r=1;r<values.length;r++) {
    if (!values[r][0]) continue;
    if (values[r][0].toString().toLowerCase().trim() === particular.toString().toLowerCase().trim()) {
      foundRow = r+1; // actual sheet row
      break;
    }
  }
  // Order: Particular, Date, Qty, Unit, UnitSizeText, PricePaid, PricePerStd, Base, Notes
  const rowVals = [particular, date, qty, unit, unitSizeText, pricePaid, pricePerStd, base, notes];
  if (foundRow) {
    sheet.getRange(foundRow,1,1,rowVals.length).setValues([rowVals]);
  } else {
    sheet.getRange(sheet.getLastRow()+1,1,1,rowVals.length).setValues([rowVals]);
  }
}

/**
 * Search items in the Catalog sheet
 */
function searchItems(q) {
  q = (q || '').toString().toLowerCase();
  const ss = getSpreadsheet();
  const catSheet = ss.getSheetByName(CATALOG_SHEET);
  if (!catSheet) return [];
  const values = catSheet.getDataRange().getValues();
  const results = [];
  for (let r=1;r<values.length;r++) {
    const name = (values[r][0] || '').toString();
    if (!name) continue;
    if (q === '' || name.toLowerCase().indexOf(q) !== -1) {
      results.push({
        particular: name,
        lastDate: values[r][1],
        lastQuantity: values[r][2],
        lastUnit: values[r][3],
        unitSizeText: values[r][4],
        lastPricePaid: values[r][5],
        lastPricePerStandardUnit: values[r][6],
        baseUnit: values[r][7],
        lastNotes: values[r][8]
      });
    }
  }
  // return top 20
  return results.slice(0,20);
}

/**
 * Get last purchase info for a specific item
 */
function getLastForItem(item) {
  if (!item) return null;
  const ss = getSpreadsheet();
  const catSheet = ss.getSheetByName(CATALOG_SHEET);
  if (!catSheet) return null;
  const values = catSheet.getDataRange().getValues();
  for (let r=1;r<values.length;r++) {
    if (values[r][0] && values[r][0].toString().toLowerCase().trim() === item.toString().toLowerCase().trim()) {
      return {
        particular: values[r][0],
        lastDate: values[r][1],
        lastQuantity: values[r][2],
        lastUnit: values[r][3],
        unitSizeText: values[r][4],
        lastPricePaid: values[r][5],
        lastPricePerStandardUnit: values[r][6],
        baseUnit: values[r][7],
        lastNotes: values[r][8]
      };
    }
  }
  return null;
}

/**
 * 🔧 UTILITY: Populate Catalog from a transaction sheet
 * 
 * This function reads all transactions from a specified sheet and updates
 * the Catalog with the latest purchase info for each item.
 * 
 * Expected sheet columns: [Date, Amount, Particular, Shop]
 * 
 * Usage from Apps Script editor:
 *   populateCatalogFromSheet("FY2024-25")
 *   populateCatalogFromSheet("FY2023-24")
 * 
 * @param {string} sheetName - Name of the transaction sheet to process
 * @param {number} qtyColumnIndex - Optional: column index for quantity (0-based), default assumes qty from amount
 * @param {number} unitColumnIndex - Optional: column index for unit (0-based)
 */
function populateCatalogFromSheet(sheetName, qtyColumnIndex, unitColumnIndex) {
  const ss = getSpreadsheet();
  const transactionSheet = ss.getSheetByName(sheetName);
  const catalogSheet = ss.getSheetByName(CATALOG_SHEET);
  
  if (!transactionSheet) {
    Logger.log("❌ Sheet not found: " + sheetName);
    return;
  }
  
  if (!catalogSheet) {
    Logger.log("❌ Catalog sheet not found. Please create a sheet named: " + CATALOG_SHEET);
    return;
  }
  
  const data = transactionSheet.getDataRange().getValues();
  
  // Skip header row, group by item name to find latest
  const itemMap = {}; // { itemName: { date, amount, particular, shop, qty, unit } }
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const date = row[0];
    const amount = row[1];
    const particular = row[2];
    const shop = row[3];
    
    if (!particular) continue;
    
    const itemKey = particular.toString().toLowerCase().trim();
    
    // Get quantity and unit if columns are specified
    const qty = qtyColumnIndex !== undefined ? row[qtyColumnIndex] : 1;
    const unit = unitColumnIndex !== undefined ? row[unitColumnIndex] : 'each';
    
    // Keep the latest entry for each item (assumes sheet is sorted by date)
    const rowDate = parseDateString(date);
    const existingDate = itemMap[itemKey] ? parseDateString(itemMap[itemKey].date) : null;
    
    if (!itemMap[itemKey] || (rowDate && existingDate && rowDate > existingDate)) {
      itemMap[itemKey] = {
        date: date,
        amount: amount,
        particular: particular,
        shop: shop,
        qty: qty,
        unit: unit
      };
    }
  }
  
  // Update catalog for each unique item
  let updateCount = 0;
  for (const itemKey in itemMap) {
    const item = itemMap[itemKey];
    const priceCalc = calcPricePerStandardUnit(item.qty, item.unit, item.amount);
    
    upsertCatalogRow(
      catalogSheet,
      item.particular,
      item.date,
      item.qty,
      item.unit,
      item.amount,
      priceCalc.pricePer,
      priceCalc.base
    );
    updateCount++;
  }
  
  Logger.log("✅ Processed " + (data.length - 1) + " transactions from '" + sheetName + "'");
  Logger.log("✅ Updated " + updateCount + " items in Catalog");
}

/**
 * 🔧 UTILITY: Populate Catalog from multiple sheets at once
 * 
 * Usage from Apps Script editor:
 *   populateCatalogFromMultipleSheets(["FY2024-25", "FY2023-24", "FY2022-23"])
 * 
 * @param {string[]} sheetNames - Array of sheet names to process
 */
function populateCatalogFromMultipleSheets(sheetNames) {
  Logger.log("🔄 Starting catalog population from " + sheetNames.length + " sheets...");
  
  for (let i = 0; i < sheetNames.length; i++) {
    populateCatalogFromSheet(sheetNames[i]);
  }
  
  Logger.log("✅ Completed! Check your Catalog sheet.");
}

/**
 * 🔧 EXAMPLE: Run this to populate catalog from Transactions
 * 
 * Click the "Run" button in the Apps Script editor with this function selected
 */
function examplePopulateCatalog() {
  populateCatalogFromSheet(TRANSACTIONS_SHEET);
}

/**
 * 🔧 EXAMPLE: Populate from multiple years
 */
function examplePopulateCatalogMultipleYears() {
  populateCatalogFromMultipleSheets([
    TRANSACTIONS_SHEET,
    "FY2024-25",
    "FY2023-24"
  ]);
}