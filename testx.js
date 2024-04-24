// Function to get an array of dates before a given start date
function getDatesBefore(startDate, numOfDays) {
    var datesArray = [];
    var currentDate = new Date(startDate); // Convert start date to Date object
  
    // Loop through the specified number of days
    for (var i = 0; i < numOfDays; i++) {
      var pastDate = new Date(currentDate);
      pastDate.setDate(currentDate.getDate() - i);
      datesArray.push(pastDate.toISOString().split('T')[0]); // Push date in yyyy-mm-dd format
    }
  
    return datesArray;
  }
  
  // Usage example
  var startDate = new Date('2024-04-11'); // Example start date
  var numOfDays = 7; // Number of days before the start date
  var pastDatesArray = getDatesBefore(startDate, numOfDays);
  console.log(pastDatesArray);
  