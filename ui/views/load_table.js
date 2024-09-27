// * Copyright 2024 Google LLC
// *
// * Licensed under the Apache License, Version 2.0 (the "License");
// * you may not use this file except in compliance with the License.
// * You may obtain a copy of the License at
// *
// *      http://www.apache.org/licenses/LICENSE-2.0
// *
// * Unless required by applicable law or agreed to in writing, software
// * distributed under the License is distributed on an "AS IS" BASIS,
// * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// * See the License for the specific language governing permissions and
// * limitations under the License.

const prevButton = document.querySelector('.previous'); // Prev button
const nextButton = document.querySelector('.next'); // Next button
const tableBody = document.getElementById('jobHistoryTable').getElementsByTagName('tbody')[0]; // History table
const itemsPerPageSelect = document.getElementById('itemsPerPageSelect'); // Items per page dropdown

let itemsPerPage = parseInt(itemsPerPageSelect.value, 20); 
let currentPage = 1;
let totalPages = 1;
let startAfter = null;
let pageCursors = {};

// Reset page with items per page change
function updateTable() {
    currentPage = 1; // Reset to the first page when changing items per page
    startAfter = null; // Reset the cursor
    pageCursors = {}; // Clear the cursor cache
    showPage(currentPage);
}

// Event listener for dropdown change
itemsPerPageSelect.addEventListener('change', () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
    updateTable();
});

// Event listener for Previous button
prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        showPage(currentPage); 
    }
});

// Event listener for Next button
nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        showPage(currentPage); 
    }
});

// Event listener for document
document.addEventListener('DOMContentLoaded', function () {
    showPage(currentPage);
});

// Display table
function showPage(page) {
    // Clear existing rows
    tableBody.innerHTML = '';

    startAfter = pageCursors[page] || null;
    
    // Fetch data for the specific page, including the cursor
    fetch(`/data/read-data?page=${page}&limit=${itemsPerPage}&startAfter=${startAfter}`) 
        .then(response => response.json())
        .then(data => {
            if (data.tableData) {
                data.tableData.forEach(row => {
                    const newRow = tableBody.insertRow();
                    newRow.insertCell().textContent = row.job_type;
                    newRow.insertCell().textContent = row.src_name;
                    newRow.insertCell().textContent = row.dst_name;
                    newRow.insertCell().textContent = row.status;
                    newRow.insertCell().textContent = row.job_started;
                    newRow.insertCell().textContent = row.job_completed;
                });
            }
;
            // Update total pages if available
            if (data.totalPages) {
                totalPages = data.totalPages;
            }

            if (data.nextPageCursor) {
                pageCursors[page + 1] = data.nextPageCursor; 
            }

            prevButton.disabled = currentPage === 1; // Disable on the first page
            nextButton.disabled = currentPage === totalPages; // Disable on the last page

        });
}