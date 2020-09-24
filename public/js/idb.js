// variable to hold db connection
let db;
// create connection to IndexedDB called 'budget_tracker' and set version to 1
const request = indexedDB.open('budget_tracker', 1);

// this event fires if the version changes or if db doesn't exist
request.onupgradeneeded = function(event) {
  // save reference to the database
  const db = event.target.result;
  // create object store called 'new_transaction' and autoIncrement key
  db.createObjectStore('new_transaction', { autoIncrement: true });
};

// after a successful connection
request.onsuccess = function(event) {
  // save reference to global var db
  db = event.target.result;

  // check if online. If so, upload transaction data to api
  if (navigator.onLine) {
    uploadTransactions();
  }
};

// if there is an error
request.onerror = function(event) {
  // log error
  console.log(event.target.errorCode);
};

// this fires if transaction is submitted offline
function saveRecord(record) {
  // open a new transaction (temporary connection) with the db with read/write permissions
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access object store for 'new_transaction'
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // add record to store with add method
  transactionObjectStore.add(record);
};

function uploadTransactions() {
  // open transaction to db
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access object object store
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // set all records to variable
  const getAllTransactions = transactionObjectStore.getAll();

  // after getAllTransactions is successful
  getAllTransactions.onsuccess = function() {
    // if there is data in the store, send it to api server
    if (getAllTransactions.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAllTransactions.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open another transaction with object store
          const transaction = db.transaction(['new_transaction'], 'readwrite');
          // access new_transaction store
          const transactionObjectStore = transaction.objectStore('new_transaction');
          // clear store after successful upload
          transactionObjectStore.clear();

          alert('All offline transactions have been submitted');
        })
        .catch(err => console.log(err));
    }
  };
};

// when app is back online, execute upload function
window.addEventListener('online', uploadTransactions);