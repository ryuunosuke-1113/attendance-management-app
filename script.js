const attendanceForm = document.getElementById("attendanceForm");
const attendanceList = document.getElementById("attendanceList");
const emptyMessage = document.getElementById("emptyMessage");

const dateInput = document.getElementById("date");
const nameInput = document.getElementById("name");
const clockInInput = document.getElementById("clockIn");
const clockOutInput = document.getElementById("clockOut");
const breakTimeInput = document.getElementById("breakTime");
const noteInput = document.getElementById("note");

const searchNameInput = document.getElementById("searchName");
const filterMonthInput = document.getElementById("filterMonth");
const clearFilterButton = document.getElementById("clearFilterButton");
const exportCsvButton = document.getElementById("exportCsvButton");

const totalCountElement = document.getElementById("totalCount");
const totalWorkTimeElement = document.getElementById("totalWorkTime");
const averageWorkTimeElement = document.getElementById("averageWorkTime");

const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

let attendanceRecords =
  JSON.parse(localStorage.getItem("attendanceRecords")) || [];

let messageTimeoutId = null;

/**
 * 時刻（HH:MM）を分に変換
 * 例: "09:30" → 570
 */
function convertTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * 実働時間（分）を計算
 */
function calculateWorkMinutes(clockIn, clockOut, breakTime) {
  const startMinutes = convertTimeToMinutes(clockIn);
  const endMinutes = convertTimeToMinutes(clockOut);
  return endMinutes - startMinutes - breakTime;
}

/**
 * 分を「◯時間◯分」形式に変換
 * 例: 480 → "8時間00分"
 */
function formatMinutesToHours(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}時間${String(remainingMinutes).padStart(2, "0")}分`;
}

/**
 * メッセージ表示をリセット
 */
function clearMessages() {
  errorMessage.textContent = "";
  successMessage.textContent = "";

  if (messageTimeoutId) {
    clearTimeout(messageTimeoutId);
    messageTimeoutId = null;
  }
}

/**
 * エラーメッセージ表示
 */
function showError(message) {
  clearMessages();
  errorMessage.textContent = message;

  messageTimeoutId = setTimeout(() => {
    clearMessages();
  }, 3000);
}

/**
 * 成功メッセージ表示
 */
function showSuccess(message) {
  clearMessages();
  successMessage.textContent = message;

  messageTimeoutId = setTimeout(() => {
    clearMessages();
  }, 3000);
}

/**
 * localStorage に保存
 */
function saveToLocalStorage() {
  localStorage.setItem("attendanceRecords", JSON.stringify(attendanceRecords));
}

/**
 * 入力欄をリセット
 */
function resetForm() {
  attendanceForm.reset();
}

/**
 * 同一データの重複チェック
 * 条件：勤務日・氏名・出勤時刻が同じ
 */
function isDuplicateRecord(date, name, clockIn) {
  return attendanceRecords.some((record) => {
    return (
      record.date === date &&
      record.name === name &&
      record.clockIn === clockIn
    );
  });
}

/**
 * バリデーション
 */
function validateAttendanceForm(date, name, clockIn, clockOut, breakTimeValue) {
  if (!date) {
    return "勤務日を入力してください。";
  }

  if (!name) {
    return "氏名を入力してください。";
  }

  if (!clockIn) {
    return "出勤時刻を入力してください。";
  }

  if (!clockOut) {
    return "退勤時刻を入力してください。";
  }

  if (breakTimeValue === "") {
    return "休憩時間を入力してください。";
  }

  const breakTime = Number(breakTimeValue);

  if (Number.isNaN(breakTime)) {
    return "休憩時間は数値で入力してください。";
  }

  if (breakTime < 0) {
    return "休憩時間は0以上で入力してください。";
  }

  const startMinutes = convertTimeToMinutes(clockIn);
  const endMinutes = convertTimeToMinutes(clockOut);

  if (endMinutes <= startMinutes) {
    return "退勤時刻は出勤時刻より後にしてください。";
  }

  const workingMinutesBeforeBreak = endMinutes - startMinutes;

  if (breakTime >= workingMinutesBeforeBreak) {
    return "休憩時間が勤務時間以上になっています。";
  }

  if (isDuplicateRecord(date, name, clockIn)) {
    return "同じ勤務日・氏名・出勤時刻のデータがすでに登録されています。";
  }

  return "";
}

/**
 * 検索・月別フィルターを反映したデータを取得
 */
function getFilteredRecords() {
  const searchName = searchNameInput.value.trim().toLowerCase();
  const filterMonth = filterMonthInput.value;

  return attendanceRecords.filter((record) => {
    const matchName =
      !searchName || record.name.toLowerCase().includes(searchName);

    const matchMonth =
      !filterMonth || record.date.startsWith(filterMonth);

    return matchName && matchMonth;
  });
}

/**
 * 集計表示を更新
 */
function updateSummary(records) {
  const totalCount = records.length;

  const totalWorkMinutes = records.reduce((sum, record) => {
    return sum + record.workMinutes;
  }, 0);

  const averageWorkMinutes =
    totalCount === 0 ? 0 : Math.floor(totalWorkMinutes / totalCount);

  totalCountElement.textContent = `${totalCount}件`;
  totalWorkTimeElement.textContent = formatMinutesToHours(totalWorkMinutes);
  averageWorkTimeElement.textContent = formatMinutesToHours(averageWorkMinutes);
}

/**
 * 勤怠一覧を描画
 */
function renderAttendanceList() {
  const filteredRecords = getFilteredRecords();
  attendanceList.innerHTML = "";

  if (filteredRecords.length === 0) {
    emptyMessage.style.display = "block";
    updateSummary(filteredRecords);
    return;
  }

  emptyMessage.style.display = "none";

  filteredRecords.forEach((record) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${record.date}</td>
      <td>${record.name}</td>
      <td>${record.clockIn}</td>
      <td>${record.clockOut}</td>
      <td>${record.breakTime}</td>
      <td>${formatMinutesToHours(record.workMinutes)}</td>
      <td>${record.note || ""}</td>
      <td>
        <button type="button" class="delete-button" data-id="${record.id}">
          削除
        </button>
      </td>
    `;

    attendanceList.appendChild(tr);
  });

  updateSummary(filteredRecords);
}

/**
 * 勤怠データを削除
 */
function deleteRecord(id) {
  attendanceRecords = attendanceRecords.filter((record) => record.id !== id);
  saveToLocalStorage();
  renderAttendanceList();
  showSuccess("勤怠データを削除しました。");
}

/**
 * CSV用に値を安全な形へ変換
 */
function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

/**
 * CSV文字列を生成
 */
function generateCsvContent(records) {
  const headers = [
    "勤務日",
    "氏名",
    "出勤時刻",
    "退勤時刻",
    "休憩時間（分）",
    "実働時間",
    "備考"
  ];

  const rows = records.map((record) => {
    return [
      escapeCsvValue(record.date),
      escapeCsvValue(record.name),
      escapeCsvValue(record.clockIn),
      escapeCsvValue(record.clockOut),
      escapeCsvValue(record.breakTime),
      escapeCsvValue(formatMinutesToHours(record.workMinutes)),
      escapeCsvValue(record.note || "")
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * CSVファイルをダウンロード
 */
function downloadCsvFile(csvContent, fileName) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * CSVファイル名を作成
 */
function createCsvFileName() {
  const filterMonth = filterMonthInput.value;

  if (filterMonth) {
    return `attendance_${filterMonth}.csv`;
  }

  return "attendance_records.csv";
}

/**
 * フォーム送信時の処理
 */
attendanceForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearMessages();

  const date = dateInput.value;
  const name = nameInput.value.trim();
  const clockIn = clockInInput.value;
  const clockOut = clockOutInput.value;
  const breakTimeValue = breakTimeInput.value;
  const breakTime = Number(breakTimeValue);
  const note = noteInput.value.trim();

  const validationMessage = validateAttendanceForm(
    date,
    name,
    clockIn,
    clockOut,
    breakTimeValue
  );

  if (validationMessage) {
    showError(validationMessage);
    return;
  }

  const workMinutes = calculateWorkMinutes(clockIn, clockOut, breakTime);

  const newRecord = {
    id: Date.now(),
    date,
    name,
    clockIn,
    clockOut,
    breakTime,
    workMinutes,
    note,
  };

  attendanceRecords.push(newRecord);
  saveToLocalStorage();
  renderAttendanceList();
  resetForm();
  showSuccess("勤怠データを登録しました。");
});

/**
 * 削除ボタンのクリック処理
 */
attendanceList.addEventListener("click", function (event) {
  if (event.target.classList.contains("delete-button")) {
    const recordId = Number(event.target.dataset.id);

    const isConfirmed = window.confirm("この勤怠データを削除しますか？");

    if (!isConfirmed) {
      return;
    }

    deleteRecord(recordId);
  }
});

/**
 * 氏名検索
 */
searchNameInput.addEventListener("input", function () {
  renderAttendanceList();
});

/**
 * 月別フィルター
 */
filterMonthInput.addEventListener("change", function () {
  renderAttendanceList();
});

/**
 * 絞り込み解除
 */
clearFilterButton.addEventListener("click", function () {
  searchNameInput.value = "";
  filterMonthInput.value = "";
  renderAttendanceList();
});

/**
 * CSV出力
 */
exportCsvButton.addEventListener("click", function () {
  clearMessages();

  const filteredRecords = getFilteredRecords();

  if (filteredRecords.length === 0) {
    showError("出力する勤怠データがありません。");
    return;
  }

  const csvContent = generateCsvContent(filteredRecords);
  const fileName = createCsvFileName();

  downloadCsvFile(csvContent, fileName);
  showSuccess("CSVファイルを出力しました。");
});

/**
 * 入力中にメッセージを消す
 */
dateInput.addEventListener("input", clearMessages);
nameInput.addEventListener("input", clearMessages);
clockInInput.addEventListener("input", clearMessages);
clockOutInput.addEventListener("input", clearMessages);
breakTimeInput.addEventListener("input", clearMessages);
noteInput.addEventListener("input", clearMessages);

/**
 * 初期表示
 */
renderAttendanceList();
