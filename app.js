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
        // Bus arrived early
        return `${Math.abs(diff)} min earlier`;
    } else if (diff >= 60) {
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        return `${hours}h ${minutes}m`;
    } else {
        return `${diff} min`;
    }
}

// --- Function to calculate time difference in minutes ---
function calcDifference(pred, act) {
    const [ph, pm] = pred.split(":").map(Number);
    
    // Convert 12-hour actual time to 24-hour
    let [time, ampm] = act.split(" ");
    let [ah, am] = time.split(":").map(Number);
    if (ampm === "PM" && ah !== 12) ah += 12;
    if (ampm === "AM" && ah === 12) ah = 0;

    return (ah * 60 + am) - (ph * 60 + pm);
}

// --- Update Table ---
function updateTable() {
    table.innerHTML = "";
    data.forEach(row => {
        table.innerHTML += `
            <tr>
                <td>${row.date}</td>
                <td>${row.predicted}</td>
                <td>${row.actual}</td>
                <td>${formatDiff(row.diff)}</td>
            </tr>
        `;
    });
}

// --- Chart ---
let chart;
function updateChart() {
    const ctx = document.getElementById("accuracyChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(r => r.date),
            datasets: [{
                label: "Difference (minutes)",
                data: data.map(r => r.diff),
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

// --- Add Entry on button click ---
arrivedBtn.addEventListener("click", () => {
    const predicted = predictedInput.value;
    if (!predicted) {
        alert("Enter predicted time first.");
        return;
    }

    const now = new Date();

    // Use manual date if provided
    const entryDate = manualDateInput.value || 
                      now.getFullYear() + "-" + 
                      String(now.getMonth() + 1).padStart(2,"0") + "-" + 
                      String(now.getDate()).padStart(2,"0");

    // Convert to 12-hour format
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2,"0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // convert 0 -> 12
    const actual = `${hours}:${minutes} ${ampm}`;

    const diff = calcDifference(predicted, actual);

    const entry = { date: entryDate, predicted, actual, diff };

    data.push(entry);
    localStorage.setItem("busData", JSON.stringify(data));

    updateTable();
    updateChart();

    // Clear inputs
    predictedInput.value = "";
    manualDateInput.value = "";
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
    let csv = "Date,Predicted,Actual,Diff\n";
    data.forEach(r => {
        csv += `${r.date},${r.predicted},${r.actual},${formatDiff(r.diff)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bus_data_local.csv";
    a.click();
});

// --- Initial render ---
updateTable();
updateChart();
