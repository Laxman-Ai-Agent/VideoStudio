/**
 * Upload-time picker for the "Video_Upload_Path" sheet (user, 2026-11-18).
 * Paste this whole file into the sheet: Extensions > Apps Script > Code.gs, Save, reload the sheet.
 * Then: click a cell in columns X-AA (YouTube Long, YT Short, Insta Short, Facebook) > menu "📅 Upload time" >
 * "Pick date & time". A window opens with a date + time picker; Save writes a real date-time into the selected
 * cell(s). Several cells selected = the same time in all of them.
 * Google does not let a script open a window by itself on a click, so the menu (or Ctrl+Alt+Shift+1 after
 * recording it as a macro) opens it.
 */
var FIRST_COL = 24; // X
var LAST_COL = 27;  // AA
var FORMAT = "dd-mmm-yyyy h:mm am/pm";

function onOpen() {
  SpreadsheetApp.getUi().createMenu("📅 Upload time")
    .addItem("Pick date & time", "showUploadTimePicker")
    .addToUi();
}

function showUploadTimePicker() {
  var range = SpreadsheetApp.getActiveRange();
  if (!inScheduleColumns_(range)) {
    SpreadsheetApp.getUi().alert("Select a cell in columns X to AA (YouTube Long, YT Short, Insta Short, Facebook), row 2 or below.");
    return;
  }
  var html = HtmlService.createHtmlOutput(pickerHtml_(currentValue_(range))).setWidth(320).setHeight(230);
  SpreadsheetApp.getUi().showModalDialog(html, "Upload date & time");
}

function saveUploadTime(local) {  // "2026-11-20T17:00" from the picker
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var range = SpreadsheetApp.getActiveRange();
  if (!inScheduleColumns_(range)) throw new Error("Select a cell in columns X to AA first.");
  var when = Utilities.parseDate(local, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd'T'HH:mm");
  var values = range.getValues().map(function (row) { return row.map(function () { return when; }); });
  range.setValues(values).setNumberFormat(FORMAT);
}

function inScheduleColumns_(range) {
  return range && range.getRow() >= 2 && range.getColumn() >= FIRST_COL && range.getLastColumn() <= LAST_COL;
}

function currentValue_(range) {  // the cell's date-time, or tomorrow 5:00 PM, as "yyyy-MM-ddTHH:mm"
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var v = range.getCell(1, 1).getValue();
  if (!(v instanceof Date)) {
    v = new Date(new Date().getTime() + 24 * 3600 * 1000);
    v = Utilities.parseDate(Utilities.formatDate(v, tz, "yyyy-MM-dd") + "T17:00", tz, "yyyy-MM-dd'T'HH:mm");
  }
  return Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm");
}

function pickerHtml_(value) {
  return '<div style="font-family:Arial,sans-serif;font-size:14px">' +
    '<input id="t" type="datetime-local" value="' + value + '" style="font-size:16px;padding:6px;width:100%;box-sizing:border-box">' +
    '<div style="margin:10px 0">Quick time: ' +
    '<button onclick="setTime(\'17:00\')">5:00 PM</button> ' +
    '<button onclick="setTime(\'18:00\')">6:00 PM</button></div>' +
    '<button id="s" onclick="save()" style="background:#1a73e8;color:#fff;border:0;padding:8px 18px;border-radius:4px">Save</button> ' +
    '<button onclick="google.script.host.close()">Cancel</button>' +
    '<div id="m" style="color:#c62828;margin-top:8px"></div></div>' +
    '<script>' +
    'function setTime(h){var t=document.getElementById("t");t.value=(t.value||"").slice(0,10)+"T"+h;}' +
    'function save(){var v=document.getElementById("t").value;if(!v){document.getElementById("m").textContent="Pick a date and time";return;}' +
    'document.getElementById("s").disabled=true;' +
    'google.script.run.withSuccessHandler(function(){google.script.host.close();})' +
    '.withFailureHandler(function(e){document.getElementById("s").disabled=false;document.getElementById("m").textContent=e.message;})' +
    '.saveUploadTime(v);}' +
    '</script>';
}
