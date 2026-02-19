import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// AUTH LIBRARY IMPORT KIYA
import { getAuth, signInWithEmailAndPassword,signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// !!! APNI FIREBASE CONFIG YAHA PASTE KARO !!!
const firebaseConfig = {
    apiKey: "AIzaSyDPbOaPCh3eKP6P9rM_GxStLv2zpq_ZEaI",
    authDomain: "performancepredictor01.firebaseapp.com",
    databaseURL: "https://performancepredictor01-default-rtdb.firebaseio.com",
    projectId: "performancepredictor01",
    storageBucket: "performancepredictor01.firebasestorage.app",
    messagingSenderId: "100787386366",
    appId: "1:100787386366:web:75ac2abd70e2e442e5b2af",
    measurementId: "G-QT8TZHKRL5"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Auth initialize kiya

// --- NAYA CODE (YAHAN PASTE KAREIN) ---
// Jaise hi page load ho, user ko logout kar do
signOut(auth).then(() => {
    console.log("Auto logout successful - Login Screen will appear");
}).catch((error) => {
    console.error("Logout error", error);
});
// --------------------------------------
const studentCollection = collection(db, "students");

// --- DOM ELEMENTS ---
// Login Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const emailInput = document.getElementById('loginEmail');
const passInput = document.getElementById('loginPass');

// App Elements
const form = document.getElementById('studentForm');
const studentList = document.getElementById('studentList');
const submitBtn = document.getElementById('submitBtn'); 
const cancelBtn = document.getElementById('cancelBtn');
const csvInput = document.getElementById('csvFileInput');
const bulkBtn = document.getElementById('bulkUploadBtn');
const downloadBtn = document.getElementById('downloadBtn');

const totalStat = document.getElementById('totalStudents');
const highStat = document.getElementById('highRanking');
const avgStat = document.getElementById('averageRanking');
const lowStat = document.getElementById('lowRanking');
const ctx = document.getElementById('performanceChart').getContext('2d');

let myChart;
let isEditing = false;
let currentEditId = null;
let allStudentsData = []; 

// --- 1. AUTHENTICATION LOGIC (NEW) ---

// Check karo user login hai ya nahi
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User Login Hai -> Dashboard Dikhao
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";
        loadData(); // Data tabhi load karo jab login ho
    } else {
        // User Logout Hai -> Login Screen Dikhao
        loginSection.style.display = "flex";
        dashboardSection.style.display = "none";
        studentList.innerHTML = ""; // Data chhupa do
    }
});

// Login Button Click
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const pass = passInput.value;

    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            // Success hone par onAuthStateChanged apne aap handle karega
            alert("Login Successful!");
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

// Logout Button Click
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("Logged Out!");
        });
    });
}

// --- 2. MAIN APP LOGIC (Function me wrap kiya) ---
function loadData() {
    const q = query(studentCollection, orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        studentList.innerHTML = "";
        allStudentsData = [];
        let high = 0, avg = 0, low = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            allStudentsData.push({ id: doc.id, ...data });

            let rankText = data.percentage >= 75 ? "High" : data.percentage >= 45 ? "Average" : "Low";
            let color = data.percentage >= 75 ? "#2ecc71" : data.percentage >= 45 ? "#f1c40f" : "#e74c3c";
            
            if(rankText === "High") high++; else if(rankText === "Average") avg++; else low++;

            studentList.innerHTML += `
                <div class="student-card" data-name="${data.name}" data-math="${data.math}" data-ds="${data.ds}" data-css="${data.css}" data-coa="${data.coa}"
                     style="border:1px solid #ddd; padding:15px; margin-bottom:15px; border-radius:8px; border-left: 5px solid ${color}; background:white;">
                    <div style="display:flex; justify-content:space-between;">
                        <div>
                            <h4 style="margin:0;">${data.name}</h4>
                            <p style="margin:0; font-size:0.9em; color:#666;">Math:${data.math}, DS:${data.ds}, CSS:${data.css}, COA:${data.coa}</p>
                            <p style="margin:5px 0 0; font-weight:bold;">${data.percentage.toFixed(2)}%</p>
                        </div>
                        <span style="background:${color}; color:white; padding:3px 8px; border-radius:4px; height:fit-content;">${rankText}</span>
                    </div>
                    <div style="margin-top:10px; padding-top:10px; border-top:1px solid #eee;">
                        <button class="edit-btn" data-id="${doc.id}" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:4px; margin-right:5px; cursor:pointer;">Edit</button>
                        <button class="delete-btn" data-id="${doc.id}" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
                    </div>
                </div>`;
        });

        totalStat.innerText = allStudentsData.length;
        highStat.innerText = high;
        avgStat.innerText = avg;
        lowStat.innerText = low;
        updateChart(allStudentsData);
    });
}

// --- 3. OTHER FEATURES (PDF, Bulk, CRUD) ---
// (Baaki saare functions wahi hain, bas global scope me rakhna)

if(downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        if (allStudentsData.length === 0) { alert("No data!"); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Student Performance Report", 14, 20);
        const tableData = allStudentsData.map(s => [s.name, s.math, s.ds, s.css, s.coa, s.percentage.toFixed(2)+"%", s.percentage >= 75 ? "High" : s.percentage >= 45 ? "Average" : "Low"]);
        doc.autoTable({ head: [['Name', 'Math', 'DS', 'CSS', 'COA', '%', 'Rank']], body: tableData, startY: 30 });
        doc.save("Report.pdf");
    });
}

if(bulkBtn) {
    bulkBtn.addEventListener('click', () => {
        const file = csvInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(e) {
            const rows = e.target.result.split('\n');
            const batch = writeBatch(db);
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim(); if(!row) continue;
                const cols = row.split(',');
                if (cols.length >= 5) {
                    const math = Number(cols[1]), ds = Number(cols[2]), css = Number(cols[3]), coa = Number(cols[4]);
                    if (!isNaN(math)) {
                        const total = math + ds + css + coa;
                        const ref = doc(studentCollection);
                        batch.set(ref, { name: cols[0], math, ds, css, coa, percentage: (total/400)*100, timestamp: new Date() });
                    }
                }
            }
            await batch.commit();
            alert("Uploaded!");
        };
        reader.readAsText(file);
    });
}

function resetFormState() {
    form.reset();
    isEditing = false;
    currentEditId = null;
    if(submitBtn) submitBtn.innerText = "Add Student & Predict";
    if(submitBtn) submitBtn.style.backgroundColor = "";
    if(cancelBtn) cancelBtn.style.display = "none";
}
if(cancelBtn) cancelBtn.addEventListener('click', resetFormState);

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('studentName').value;
    const math = Number(document.getElementById('mathMarks').value);
    const ds = Number(document.getElementById('DSMarks').value);
    const css = Number(document.getElementById('CSSMarks').value);
    const coa = Number(document.getElementById('COAMarks').value);
    const percentage = ((math + ds + css + coa) / 400) * 100;

    if (isEditing) {
        await updateDoc(doc(db, "students", currentEditId), { name, math, ds, css, coa, percentage, timestamp: new Date() });
        resetFormState();
    } else {
        await addDoc(studentCollection, { name, math, ds, css, coa, percentage, timestamp: new Date() });
        form.reset();
    }
});

studentList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        if (confirm("Delete?")) await deleteDoc(doc(db, "students", e.target.dataset.id));
    }
    if (e.target.classList.contains('edit-btn')) {
        const id = e.target.dataset.id;
        const card = e.target.closest('.student-card');
        document.getElementById('studentName').value = card.dataset.name;
        document.getElementById('mathMarks').value = card.dataset.math;
        document.getElementById('DSMarks').value = card.dataset.ds;
        document.getElementById('CSSMarks').value = card.dataset.css;
        document.getElementById('COAMarks').value = card.dataset.coa;
        isEditing = true; currentEditId = id;
        if(submitBtn) { submitBtn.innerText = "Update"; submitBtn.style.backgroundColor = "#e67e22"; }
        if(cancelBtn) cancelBtn.style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

function updateChart(students) {
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: students.map(s => s.name), datasets: [{ label: '%', data: students.map(s => s.percentage), backgroundColor: students.map(s => s.percentage >= 75 ? '#2ecc71' : s.percentage >= 45 ? '#f1c40f' : '#e74c3c') }] },
        options: { scales: { y: { beginAtZero: true, max: 100 } } }
    });
}
// --- BACK BUTTON LOGIC ---
const backBtn = document.getElementById('backBtn');

if (backBtn) {
    backBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Default behavior roko

        // Logic: Check karo ki user piche se aaya hai ya direct link khola hai
        
        // Agar user Portfolio site se aaya hai (History maujood hai)
        if (document.referrer.includes('index.html') || window.history.length > 1) {
            window.history.back(); // Browser ka Back feature use karo
        } 
        else {
            // Agar user ne Direct Link khola hai (Koi history nahi hai)
            // To usko zabardasti Portfolio page par bhej do
            window.location.href = 'index.html'; 
        }
    });
}