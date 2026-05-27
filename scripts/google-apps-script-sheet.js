/**
 * Google Apps Script — Google Sheet Writer Web App
 *
 * This file is a REFERENCE for Google Apps Script (not executed by Node.js).
 * Copy this code into a Google Apps Script project bound to your Google Sheet.
 *
 * Setup:
 * 1. Open your Google Sheet:
 *    YOUR_GOOGLE_SHEET_URL
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code into Code.gs
 * 4. Deploy as Web App:
 *    - Click Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL
 * 6. Add it to .env as: GOOGLE_APPS_SCRIPT_URL=<your-url>
 *    Also add it as a GitHub repo secret: GOOGLE_SHEETS_WEB_APP_URL
 *
 * How it works:
 * - Receives POST with { results: [{ testcaseId, testName, description, updateDateTime, status, reason, comment }] }
 * - Auto-creates "test-coverage" tab + headers if not present
 * - Clears existing data (keeps header row)
 * - Writes all rows with conditional formatting for status
 */

var SHEET_TAB = 'test-coverage';
var HEADERS = ['Testcase ID', 'Test Name', 'Description', 'Update Date & time', 'Status', 'Reason', 'Comment(proof)'];

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TAB);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB);
    // Write headers
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a4a4a');
    headerRange.setFontColor('#ffffff');
    // Auto-resize columns
    for (var c = 1; c <= HEADERS.length; c++) {
      sheet.autoResizeColumn(c);
    }
    // Freeze header row
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    // Sheet exists but empty — add headers
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a4a4a');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function doPost(e) {
  try {
    var sheet = getOrCreateSheet();
    var data = JSON.parse(e.postData.contents);
    var results = data.results;

    // Clear existing data (keep header row)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
      sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearFormat();
    }

    // Write rows
    for (var i = 0; i < results.length; i++) {
      var row = results[i];
      var rowNum = i + 2;
      sheet.getRange(rowNum, 1).setValue(row.testcaseId);
      sheet.getRange(rowNum, 2).setValue(row.testName);
      sheet.getRange(rowNum, 3).setValue(row.description);
      sheet.getRange(rowNum, 4).setValue(row.updateDateTime);
      sheet.getRange(rowNum, 5).setValue(row.status);
      sheet.getRange(rowNum, 6).setValue(row.reason);
      sheet.getRange(rowNum, 7).setValue(row.comment);

      // Conditional formatting for status
      var statusCell = sheet.getRange(rowNum, 5);
      if (row.status === 'PASS') {
        statusCell.setBackground('#d9ead3').setFontColor('#228B22').setFontWeight('bold');
      } else if (row.status === 'FAIL') {
        statusCell.setBackground('#f4cccc').setFontColor('#cc0000').setFontWeight('bold');
      } else if (row.status === 'SKIP') {
        statusCell.setBackground('#fff2cc').setFontColor('#b45f06').setFontWeight('bold');
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', count: results.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Use POST to update sheet.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
