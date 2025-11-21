// Load saved data from localStorage or start empty
let data = JSON.parse(localStorage.getItem("busData") || "[]");

const table = document.getElementById("dataTable");
const predictedInput = document.getElementById("predictedTime");
const arrivedBtn = document.getElementById("arrivedBtn");
const manualDateInput = document.getElementById("manualDate");
const deleteBtn = document.getElementById("deleteBtn");
const exportBtn = document.getElementById("exportBtn");

// --- Helper: format difference for table/CSV ---
function formatDiff(diff) {
    if (diff < 0) {
        return `${Math.abs(diff)} min earlier`;
    } else if (diff >= 60) {
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        return `${hours}h ${minutes}m later`;
    } else {
        return `${diff} min later`;
    }
}

// --- Calculate difference in minutes ---
function calcDifference(pred, act) {
    const [ph, pm] = pred.split(":").map(Number);

    let [time, ampm] = act.split(" ");
    let [ah, am] = time.split(":").map(Number);
    if (ampm === "PM" && ah !== 12) ah += 12;
    if (ampm === "AM" && ah === 12) ah = 0;

    return (ah * 60 + am) - (ph * 60 + pm);
}

// --- Compute daily averages ---
function getDailyAverages() {
    const dailyDiffs = {};
    data.forEach(entry => {
        if (!dailyDiffs[entry.date]) dailyDiffs[entry.date] = [];
        dailyDiffs[entry.date].push(entry.diff);
    });

    const dailyAverages = {};
    for (let date in dailyDiffs) {
        const diffs = dailyDiffs[date];
        const sum = diffs.reduce((a,b) => a+b, 0);
        dailyAverages[date] = sum / diffs.length;
    }

    return dailyAverages;
}

// --- Update Table ---
function updateTable() {
    table.innerHTML = "";
    const dailyAverages = getDailyAverages();
    for (let date in dailyAverages) {
        table.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${formatDiff(Math.round(dailyAverages[date]))}</td>
            </tr>
        `;
    }
}

// --- Update Chart ---
let chart;
function updateChart() {
    const dailyAverages = getDailyAverages();
    const ctx = document.getElementById("accuracyChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(dailyAverages),
            datasets: [{
                label: "Average Daily Difference (minutes)",
                data: Object.values(dailyAverages),
                borderWidth: 2,
                borderColor: "#007bff",
                fill: false,
                tension: 0.2
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: "Difference (minutes)" }
                },
                x: {
                    title: { display: true, text: "Date" }
                }
            }
        }
    });
}

// --- Add Entry ---
arrivedBtn.addEventListener("click", () => {
    const predicted = predictedInput.value;
    if (!predicted) {
        alert("Enter predicted time first.");
        return;
    }

    const now = new Date();
    const entryDate = manualDateInput.value || 
                      now.getFullYear() + "-" + 
                      String(now.getMonth()+1).padStart(2,"0") + "-" + 
                      String(now.getDate()).padStart(2,"0");

    // 12-hour format
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2,"0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const actual = `${hours}:${minutes} ${ampm}`;

    const diff = calcDifference(predicted, actual);

    const entry = { date: entryDate, predicted, actual, diff };
    data.push(entry);
    localStorage.setItem("busData", JSON.stringify(data));

    predictedInput.value = "";
    manualDateInput.value = "";

    updateTable();
    updateChart();
});

// --- Delete Last Entry ---
deleteBtn.addEventListener("click", () => {
    if (data.length === 0) {
        alert("No entries to delete!");
        return;
    }
    data.pop();
    localStorage.setItem("busData", JSON.stringify(data));
    updateTable();
    updateChart();
});

// --- Export CSV ---
exportBtn.addEventListener("click", () => {
    let csv = "Date,Average Difference\n";
    const dailyAverages = getDailyAverages();
    for (let date in dailyAverages) {
        csv += `${date},${formatDiff(Math.round(dailyAverages[date]))}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bus_data_daily_avg.csv";
    a.click();
});

// --- Initial render ---
updateTable();
updateChart();
